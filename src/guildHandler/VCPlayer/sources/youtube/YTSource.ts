import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import { PassThrough } from 'stream';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from 'ffmpeg-static';
import { ChildProcess, spawn } from 'child_process';

import AudioSource from '../AudioSource';
import AudioProcessor from '../AudioProcessor';
import GuildComponent from '../../../GuildComponent';
import type Song from '../Song';
import type GuildHandler from '../../../GuildHandler';

const TEMP_DIR = process.env.TEMP_DIR;				// directory for temp files
const YT_DLP_PATH = process.env.YT_DLP_PATH;		// path to yt-dlp executable

// audio constants
const BIT_DEPTH = 16;
const PCM_FORMAT = 's16le';
const AUDIO_CHANNELS = 2;
const AUDIO_FREQUENCY = 48000;
const SEC_PCM_SIZE = AUDIO_CHANNELS * AUDIO_FREQUENCY * BIT_DEPTH / 8;
const LARGE_CHUNK_SIZE = SEC_PCM_SIZE * 10;
const SMALL_CHUNK_SIZE = SEC_PCM_SIZE / 10;

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * YTSource
 *
 * Handles getting audio from youtube
 */
export default class YTSource extends GuildComponent implements AudioSource {
	song: Song;
	events: EventEmitter;
	buffering: boolean;
	destroyed: boolean;

	private _errorMsg: '';

	// For buffering stream
	private _bufferingRetryTimeout: NodeJS.Timeout;
	private _bufferStreamStarted: boolean;
	private _ytPCMConverterOutput: PassThrough;
	private _finishedBuffering: boolean;
	private _bufferReady: Promise<void>;
	private _liveTimeout: NodeJS.Timeout;

	// For youtube audio conversion to pcm
	private _youtubeDLPSource: ChildProcess;
	private _ytPCMConverter: ffmpeg.FfmpegCommand;
	private _ytPCMConverterInput: PassThrough;

	// Layer between youtube download and output stream
	private _largeChunkCount: number;
	private _tempLocation: string;
	private _chunkBuffer: Array<Buffer>;

	// For audio writer
	// states
	private _paused: boolean;
	private _endOfSong: boolean;
	// timing
	private _startReadingFrom: number;
	private _chunkTiming: number;
	private _smallChunkCount: number;
	private _nextChunkTime: number;
	private _audioWriter: NodeJS.Timeout;

	// For output stream
	private _audioProcesserInput: PassThrough;
	private _audioProcessor: AudioProcessor;
	private _audioProcessorOutput: PassThrough;
	private _outputStreamStarted: boolean;

	/**
	 * @param song - Song object for song to create source from
	 */
	constructor(guildHandler: GuildHandler, song: Song) {
		super(guildHandler);
		this.song = song;
		this.events = new EventEmitter();
		this.buffering = true;								// if currently playing silence while waiting for youtube, set to true
		this.destroyed = false;								// if source has been destroyed or not

		this._errorMsg = '';

		this._bufferStreamStarted = false;					// if bufferStream method has been called already or not
		this._finishedBuffering = false;					// finished downloading the song or not
		// wait for buffer to be ready, resolve once ready, rejects if error occurs while buffering
		this._bufferReady = new Promise((resolve, reject) => {
			this.events.once('bufferReady', () => {
				this.debug(`Buffer ready for song with {url: ${this.song.url}}`);
				resolve();
			});
			this.events.once('error', reject);
		});

		this._ytPCMConverterInput = new PassThrough();		// input for yt to pcm converter

		this._largeChunkCount = 0;							// how many 10 sec "largeChunks" there are on disk
		this._tempLocation = path.join(TEMP_DIR, crypto.createHash('md5').update(this.song.url + Math.floor(Math.random() * 1000000000000000).toString()).digest('hex'));
		this._chunkBuffer = [];								// buffer for chunks read from disk (or from live video)

		this._paused = false;								// paused or not
		this._endOfSong = false;							// chunk buffer contains end of song or not

		this._startReadingFrom = 1;							// default to start reading from chunk 0
		this._chunkTiming = 100;							// default to 100ms for 0.1 sec of audio
		this._smallChunkCount = 0;							// number of 0.1 sec "smallChunks" that have been played

		this._audioProcesserInput = new PassThrough;		// pcm data input for audioProcessor
		this._outputStreamStarted = false;					// if the output stream has already been started to avoid starting another one
	
		console.log(this.song);
	}

	/**
	 * _bufferToChunks()
	 * 
	 * Splits a buffer into an array of chucks of a given size
	 * @param buffer - buffer to split
	 * @param size - size of chunks to split into
	 * @returns array of buffers of chunks
	 */
	private _bufferToChunks(buffer: Buffer, size: number): Array<Buffer> {
		const chunks = [];
		while (Buffer.byteLength(buffer) > 0) {
			chunks.push(buffer.slice(0, size));
			buffer = buffer.slice(size);
		}
		return chunks;
	}

	/**
	 * _retryBuffer()
	 * 
	 * Call to retry buffer stream in 1 sec
	 * @param attempts - attempt number
	 */
	private _retryBuffer(attempts: number) {
		clearInterval(this._bufferingRetryTimeout);
		this._bufferStreamStarted = false;
		this._bufferingRetryTimeout = setTimeout(() => { this.bufferStream(attempts); }, 1000);
	}

	/**
	 * bufferStream()
	 * 
	 * Starts downloading video from youtube and saving to file
	 * @param attempts - number of attempts to buffer song
	 */
	async bufferStream(attempts?: number) {
		if (this.destroyed) return;
		if (this._bufferStreamStarted) return;			// avoid starting 2 bufferStream functions at the same time
		this._bufferStreamStarted = true;

		if (!attempts) { attempts = 0; }
		attempts++;
		if (attempts > 5) {								// stop trying after 5 attempts to get buffer
			this.error(`Tried buffering song with {url: ${this.song.url}} 5 times, failed all 5 times, giving up`);
			this.events.emit('fatalError', this._errorMsg);
			return;
		}

		this.debug(`{attempt: ${attempts}} to buffer stream for song with {url: ${this.song.url}}`);
		clearTimeout(this._bufferingRetryTimeout);

		// clean up any streams from before just in case
		if (this._youtubeDLPSource) { this._youtubeDLPSource.kill('SIGINT'); }
		if (this._ytPCMConverterOutput) { this._ytPCMConverterOutput.removeAllListeners('end'); }
		if (this._ytPCMConverter) { this._ytPCMConverter.kill('SIGINT'); }
		clearTimeout(this._liveTimeout);

		if (!this.song.live) { this._largeChunkCount = 0; }

		// make directory for buffer
		try { await fs.promises.mkdir(this._tempLocation, { recursive: true }); }
		catch (error) {
			// retry if this fails
			this._errorMsg += 'Failed to create a temp directory for song on disk\n';
			this.warn(`{error: ${error}} while creating temp directory while downloading song with {url: ${this.song.url}}`);
			this._retryBuffer(attempts);
			return;
		}

		// start download from youtube
		let format = '-f bestaudio';
		if (this.song.live) { format = '93/92/91/94/95/96'; }
		this._youtubeDLPSource = spawn(YT_DLP_PATH, [
			'-o', '-',
			format,
			'--no-playlist',
			'--ffmpeg-location', ffmpegPath,
			'--quiet',
			this.song.url
		]);

		// handle error event
		this._youtubeDLPSource.on('error', (error) => {
			if (error.toString().indexOf('SIGINT') !== -1) return;

			this._errorMsg += 'Error on stream from youtube\n';
			this.warn(`{error: ${error}} on stream from youtube for song with {url: ${this.song.url}}`);
			this._retryBuffer(attempts);
			return;
		});

		this._youtubeDLPSource.on('close', () => { this._ytPCMConverterInput.end(); });
		// write data to ytPCMConverter input
		this._youtubeDLPSource.stdout.pipe(this._ytPCMConverterInput);

		this.debug(`Audio stream obtained for song with {url: ${this.song.url}}, starting conversion to pcm`);

		// convert song to pcm using ffmpeg
		this._ytPCMConverter = ffmpeg(this._ytPCMConverterInput)
			.audioChannels(AUDIO_CHANNELS)
			.audioFrequency(AUDIO_FREQUENCY)
			.format(PCM_FORMAT)
			.on('error', (e) => {
				// ignore if stopped because of SIGINT
				if (e.toString().indexOf('SIGINT') !== -1) return;

				// restart if there is an error
				this._errorMsg += `Buffer Attempt: ${attempts} - Error while converting stream to raw pcm\n`;
				this.warn(`Ffmpeg encountered {error: ${e}} while converting song with {url: ${this.song.url}} to raw pcm`);
				this._retryBuffer(attempts);
			});

		// split into and save even chunks of 10 sec each
		let chunkName = this._largeChunkCount;
		let currentBuffer = Buffer.alloc(0);
		// writes a file, emits fatalEvent if fails
		const writeFile = async (data: Buffer, chunkName: number) => {
			// save the chunk as <chunkNumber>.pcm
			try { await fs.promises.writeFile(path.join(this._tempLocation, chunkName.toString() + '.pcm'), data); }
			catch (e) {
				this._errorMsg += 'Failed to write song to buffer\n';
				this.warn(`{error: ${e}} while saving chunk with {chunkCount: ${chunkName}} for song with {url: ${this.song.url}}`);
				this._retryBuffer(attempts);
			}
		};
		// handles new chunk data for a video / livestream
		const chunkData = async (data: Buffer) => {
			// add to currentBuffer
			currentBuffer = Buffer.concat([currentBuffer, data]);

			if (Buffer.byteLength(currentBuffer) < LARGE_CHUNK_SIZE) return;
			// Once currentBuffer is the right size, save to file
			const save = currentBuffer.slice(0, LARGE_CHUNK_SIZE);
			currentBuffer = currentBuffer.slice(LARGE_CHUNK_SIZE);

			chunkName++;
			await writeFile(save, chunkName);
			this._largeChunkCount++;
			// emit bufferReady in case it wasn't earlier
			if (this._largeChunkCount === 3) { this.events.emit('bufferReady'); }
			if (this.song.live && this._largeChunkCount > 5) {
				this._startReadingFrom = this._largeChunkCount - 2;
				try { await fs.promises.unlink(path.join(this._tempLocation, this._largeChunkCount - 5 + '.pcm')); } catch { /* */ }
			}
		};
		// handles finished download for video / livestream
		const finished = async () => {
			this.debug(`Stream for song with {url: ${this.song.url}}, fully converted to pcm`);
			this.events.emit('bufferReady');
			this._finishedBuffering = true;
			if (this.song.live) { this._endOfSong = true; }

			if (Buffer.byteLength(currentBuffer) === 0) return;

			// save the last bit as final file
			chunkName++;
			await writeFile(currentBuffer, chunkName);
			this._largeChunkCount++;
		};

		// want to turn stream into a stream with equal sized chunks for duration counting
		if (this._ytPCMConverterOutput) { 
			this._ytPCMConverterOutput.end();
			this._ytPCMConverterInput.removeAllListeners();
		}
		this._ytPCMConverterOutput = new PassThrough();
		this._ytPCMConverter.pipe(this._ytPCMConverterOutput);
		this._ytPCMConverterOutput
			.on('data', chunkData)
			.on('end', finished)
			.on('error', (e) => {
				this._errorMsg += 'Error while converting stream to raw pcm\n';
				this.warn(`{error: ${e}} on convertedStream for song with {url: ${this.song.url}}`);
				this._retryBuffer(attempts);
			});

		if (!this.song.live) return;
		// restart stream every 5 hours
		this._liveTimeout = setTimeout(() => {
			this.debug(`Restarting buffer for song with {url: ${this.song.url}} to ensure youtube link is valid`);
			this._retryBuffer(attempts - 1);
		}, 18000000);
	}

	/**
	 * setChunkTiming()
	 * 
	 * Sets the chunk timing for stream
	 * @param timing - chunk timing, should be 100 for normal playback
	 */
	setChunkTiming(timing: number) { this._chunkTiming = timing; }

	/**
	 * queueChunk()
	 * 
	 * Reads the requested chunk and points this.nextChunk to the data
	 * @param chunkNum - chunk number to prepare
	 * @param attempts - number of attempts to read file
	 */
	private async _queueChunk(chunkNum: number, attempts: number | void) {
		if (this.destroyed) return;
		if (!attempts) { attempts = 0; }
		attempts++;

		if (chunkNum > this._largeChunkCount && this._finishedBuffering) {
			this._endOfSong = true;
			return;
		}

		if (attempts < 21) {
			try {
				this._chunkBuffer.push(...this._bufferToChunks(await fs.promises.readFile(path.join(this._tempLocation, chunkNum.toString() + '.pcm')), SMALL_CHUNK_SIZE));
				await fs.promises.unlink(path.join(this._tempLocation, chunkNum.toString() + '.pcm'));
			}
			catch (error) {
				this._errorMsg += 'Failed to read chunk from buffer\n';
				this.warn(`{error: ${error}} while reading chunk with {chunkNum: ${chunkNum}} for song with {url: ${this.song.url}}`);
				setTimeout(() => { this._queueChunk(chunkNum, attempts); }, 1000);
			}
		}
		else {
			this.error(`Tried 20 times to read {chunkNum: ${chunkNum}} from buffer for song with {url: ${this.song.url}}`);

			if (!this._finishedBuffering) {
				this._errorMsg += 'Source stream was to slow to mantain buffer. Playback stopped prematurely.';
				this.error(`Source stream was too slow to mantain buffer. Playback stopped prematurely on song with {url: ${this.song.url}}`);
			}

			this.events.emit('fatalError', this._errorMsg);
		}
	}

	/**
	 * _writeChunkIn()
	 * 
	 * Recursive function ONLY CALL THIS EXTERNALLY ONCE
	 * Calculates delay until nextChunkTime to ensure chunks are writeen as close to the required time as possible
	 * @param milliseconds - delay until time to write chunk
	 * @param live - read from disk to add to buffer or not
	 */
	private _writeChunkIn(milliseconds: number, live: boolean) {
		this._audioWriter = setTimeout(() => {
			// if paused play nothing
			if (!this._paused) {
				// if there are chunks in the buffer, play them
				if (this._chunkBuffer[0]) {
					this.buffering = false;

					this._audioProcesserInput.write(this._chunkBuffer.shift());

					if (this._smallChunkCount % 100 === 0) { this._queueChunk((this._smallChunkCount / 100) + 2); }
					this._smallChunkCount++;
					if (live && this._chunkBuffer.length > 300) {
						this.info('Livestream is now 30 sec behind, catching up');
						this._chunkBuffer.splice(0, this._chunkBuffer.length - 100);
					}
				}
				// if not finished playing but nothing in buffer or if live stream with nothing in buffer, play silence
				else if (!this._endOfSong) {
					this.buffering = true;
					this._audioProcesserInput.write(Buffer.alloc(SMALL_CHUNK_SIZE));
				}
				// if finished playing, end stream
				else {
					this._audioProcesserInput.end();
					return;
				}
			}

			// calculate when to write next chunk
			let delay = this._nextChunkTime - Date.now() - 10;
			this._nextChunkTime += this._chunkTiming;
			if (delay < 0) { delay = 0; }
			this._writeChunkIn(delay, live);
		}, milliseconds);
	}

	/**
	 * getStream()
	 * 
	 * ONLY CALL THIS ONCE
	 * @returns Passthrough stream with opus data for discord
	 */
	async getStream() {
		if (this._outputStreamStarted) return this._audioProcessorOutput;
		this._outputStreamStarted = true;
		try {
			this.bufferStream();
			await this._bufferReady;

			await this._queueChunk(this._startReadingFrom);
			this._smallChunkCount = 0;
			this._nextChunkTime = Date.now();
			this._writeChunkIn(0, this.song.live);
			this.buffering = false;
		}
		catch { /* nothing needs to happen */ }


		this._audioProcessor = new AudioProcessor(this.guildHandler);
		this._audioProcessor.events.on('error', (msg) => {
			this._errorMsg += msg;
			this.events.emit('fatalError', this._errorMsg);
		});

		this._audioProcessorOutput = this._audioProcessor.processStream(this._audioProcesserInput, this);
		return this._audioProcessorOutput;
	}

	/**
	 * pause()
	 * 
	 * Pauses source
	 */
	pause() { this._paused = true; }

	/**
	 * resumse()
	 * 
	 * Resumes source
	 */
	resume() { this._paused = false; }

	/**
	 * getPlayedDuration()
	 * 
	 * @returns number of seconds played
	 */
	getPlayedDuration() {
		return Math.round(this._smallChunkCount / (SEC_PCM_SIZE / SMALL_CHUNK_SIZE));
	}

	/**
	 * destroy()
	 * 
	 * Ends streams, kills ffmpeg processes, and removes temp directory
	 */
	async destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this._chunkBuffer = [];

		if (this._youtubeDLPSource) { this._youtubeDLPSource.kill('SIGINT'); }
		if (this._ytPCMConverter) { this._ytPCMConverter.kill('SIGINT'); }
		if (this._ytPCMConverterInput) { this._ytPCMConverterInput.end(); }
		if (this._audioProcesserInput) { this._audioProcesserInput.end(); }
		if (this._audioProcessor) { this._audioProcessor.destroy(); }
		if (this._audioProcessorOutput) { this._audioProcessorOutput.end(); }

		clearInterval(this._bufferingRetryTimeout);
		clearTimeout(this._liveTimeout);
		clearInterval(this._audioWriter);

		try { await fs.promises.rm(this._tempLocation, { recursive: true }); } catch { /* */ }
	}
}
