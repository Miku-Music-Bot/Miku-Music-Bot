import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import { Readable, PassThrough } from 'stream';
import * as ytdl from 'ytdl-core';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';

import AudioSource from './AudioSource';
import GuildComponent from '../../GuildComponent';
import type Song from '../Song';
import type GuildHandler from '../../GuildHandler';

const TEMP_DIR = process.env.TEMP_DIR;				// directory for temp files

ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * YTSource
 *
 * Handles getting audio from youtube
 */
export default class YTSource extends GuildComponent implements AudioSource {
	song: Song;
	events: EventEmitter;
	playingSilence: boolean;

	private _secPlayed: number;

	private _errorMsg: string;

	private _paused: boolean;
	destroyed: boolean;

	private _bufferingTimeout: NodeJS.Timeout;
	private _buffering: boolean;
	private _finishedBuffering: boolean;
	private _bufferReady: Promise<void>;
	private _liveTimeout: NodeJS.Timeout;
	private _ytdlSource: Readable;
	private _audioConverter: ffmpeg.FfmpegCommand;
	private _convertedStream: PassThrough;

	private _chunkCount: number;
	private _tempLocation: string;

	private _finishedReading: boolean;
	private _chunkBuffer: Array<Buffer>;
	private _chunkTiming: number;
	private _smallChunkNum: number;
	private _nextChunkTime: number;
	private _audioWriter: NodeJS.Timeout;
	private _pcmPassthrough: PassThrough;

	/**
	 * @param song - Song object for song to create source from
	 */
	constructor(guildHandler: GuildHandler, song: Song) {
		super(guildHandler);
		this.song = song;
		this._secPlayed = 0;

		this.playingSilence = false;				// if currently playing silence while waiting for youtube, set to true
		this.events = new EventEmitter();			// set up event emitter
		this._errorMsg = '';							// user friendly msg for why error occured

		this._paused = false;						// paused or not
		this.destroyed = false;					// cleaned up or not

		this._buffering = false;					// currently getting stream or not, to prevent 2 bufferStream() functions from running at the same time
		this._finishedBuffering = false;			// whether or not song has finished downloading

		this._chunkCount = 0;						// number of chunks that this song has (first chunk has chunkCount 1)

		this._finishedReading = false;				// read last chunk or not
		this._chunkBuffer = [];						// chuncks about to be played
		this._chunkTiming = 100;					// default to 100 for 0.1 sec of audio at a time
		this._smallChunkNum = 0;					// how many 0.1 sec "smallChunks" have been played
		this._pcmPassthrough = new PassThrough();	// create passthrough stream for pcm data

		// wait for buffer to be ready, resolve once ready, rejects if error occurs while buffering
		this._bufferReady = new Promise((resolve, reject) => {
			this.events.once('bufferReady', () => {
				this.debug(`Buffer ready for song with {url: ${this.song.url}}`);
				resolve();
			});
			this.events.once('error', reject);
		});

		// figure out name for temp location folder
		const randomNumber = Math.floor(Math.random() * 1000000000000000);
		const hash = crypto.createHash('md5').update(this.song.url + randomNumber.toString()).digest('hex');
		this._tempLocation = path.join(TEMP_DIR, hash);
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
	 * _bufferVideo()
	 * 
	 * Handles downloading a normal (non live) video, emits fatalEvent if something terrible happens, calls bufferStream(attempts) if recoverable 
	 * @param attempts - attempt number
	 */
	private async _bufferVideo(attempts: number) {
		this.song.fetchdata;

		// make directory for buffer
		try { await fs.promises.mkdir(this._tempLocation, { recursive: true }); }
		catch (error) {
			// retry if this fails
			this._errorMsg += `Buffer Stream Attempt: ${attempts} - Failed to create a temp directory for song on disk\n`;
			this.warn(`{error: ${error}} while creating temp directory while downloading song with {url: ${this.song.url}}`);

			this._buffering = false;
			this.bufferStream(attempts);
			return;
		}

		// obtain stream from youtube
		try {
			this._ytdlSource = ytdl(this.song.url, { quality: 'highestaudio' });
			this._ytdlSource.on('error', (error) => {
				this._errorMsg += 'Error on stream from youtube\n';
				this.error(`{error: ${error}} on stream from youtube for song with {url: ${this.song.url}}`);

				this._buffering = false;
				this.bufferStream(attempts);
			});
			this.debug(`Audio stream obtained for song with {url: ${this.song.url}}, starting conversion to pcm`);
		}
		catch (err) {
			// retry if this fails
			this._errorMsg += `Buffer Stream Attempt: ${attempts} - Failed to get song from youtube\n`;
			this.warn(`{error: ${err}} while getting audio stream for song with {url: ${this.song.url}}`);

			this._buffering = false;
			this.bufferStream(attempts);
			return;
		}

		// convert song to pcm using ffmpeg
		this._convertedStream = new PassThrough();
		this._audioConverter = ffmpeg(this._ytdlSource)
			.audioChannels(2)
			.audioFrequency(48000)
			.format('s16le')
			.on('error', (e) => {
				// ignore if stopped because of SIGINT
				if (e.toString().indexOf('SIGINT') !== -1) return;

				// restart if there is an error
				this._errorMsg += `Buffer Attempt: ${attempts} - Error while converting stream to raw pcm\n`;
				this.error(`Ffmpeg encountered {error: ${e}} while converting song with {url: ${this.song.url}} to raw pcm`);

				this._buffering = false;
				this.bufferStream(attempts);
			});
		this._audioConverter.pipe(this._convertedStream);

		// split into and save even chunks of 10 sec each
		let chunkName = this._chunkCount;
		let currentBuffer = Buffer.alloc(0);

		// writes a file, emits fatalEvent if fails
		const writeFile = async (data: Buffer, chunkName: number) => {
			try {
				// save the chunk as <chunkNumber>.pcm
				await fs.promises.writeFile(path.join(this._tempLocation, chunkName.toString() + '.pcm'), data);
			}
			catch (e) {
				// fatal error if write fails
				this._errorMsg += 'Failed to write song to buffer\n';
				this.error(`{error: ${e}} while saving chunk with {chunkCount: ${this._chunkCount}} for song with {url: ${this.song.url}}`);
				this.events.emit('error', this._errorMsg);
			}
		};

		// handles new chunk data
		const chunkData = async (data: Buffer) => {
			// add to currentBuffer
			currentBuffer = Buffer.concat([currentBuffer, data]);

			if (Buffer.byteLength(currentBuffer) < 1920000) return;
			// Once currentBuffer is the right size, save to file
			// make save a fixed size buffer of 1920000, replace currentBuffer with what is left
			const save = currentBuffer.slice(0, 1920000);
			currentBuffer = currentBuffer.slice(1920000);

			chunkName++;
			await writeFile(save, chunkName);
			// add 1 to chunkCount after a chunk (10 sec of audio) is successfully written
			this._chunkCount++;
			// emit bufferReady in case it wasn't earlier
			if (this._chunkCount === 2) { this.events.emit('bufferReady'); }
		};

		// handles finished download
		const finished = async () => {
			if (Buffer.byteLength(currentBuffer) > 0) {
				// save the last bit as final file
				chunkName++;

				await writeFile(currentBuffer, chunkName);
				// add 1 to seek after a chunk (1 sec of audio) is successfully written
				this._chunkCount++;
				this._finishedBuffering = true;
			}
			this.debug(`Stream for song with {url: ${this.song.url}}, fully converted to pcm`);
		};

		// want to turn stream into a stream with equal sized chunks for duration counting
		// Size in bytes per second: sampleRate * (bitDepth / 8) * channelCount
		// 192000 bytes for 1 sec of raw pcm data at 48000Hz, 16 bits, 2 channels
		this._convertedStream
			.on('data', chunkData)
			.on('end', finished)
			.on('error', (e) => {
				this._errorMsg += 'Error while converting stream to raw pcm\n';
				this.error(`{error: ${e}} on convertedStream for song with {url: ${this.song.url}}`);

				this._buffering = false;
				this.bufferStream(attempts);
			});
	}

	/**
	 * _bufferLive()
	 * 
	 * Handles downloading a live video, calls bufferStream(attempts) if recoverable 
	 * @param attempts - attempt number
	 */
	private async _bufferLive(attempts: number) {
		this.song.fetchdata;
		try {
			this._ytdlSource = ytdl(this.song.url, { liveBuffer: 10000, quality: [96, 95, 94, 93, 92, 132, 151] });
			this._ytdlSource.on('error', (error) => {
				this._errorMsg += 'Error on stream from youtube\n';
				this.error(`{error: ${error}} on stream from youtube for song with {url: ${this.song.url}}`);

				this._buffering = false;
				this.bufferStream(attempts);
			});
			this.debug(`Audio stream obtained for song with {url: ${this.song.url}}, starting conversion to pcm`);
		}
		catch (e) {
			this._errorMsg += 'Failed to get stream from youtube';
			this.error(`{error: ${e}} getting youtube stream for song with {url: ${this.song.url}}`);

			this._buffering = false;
			this.bufferStream(attempts);
		}

		// restart stream every 5 hours
		this._liveTimeout = setTimeout(() => {
			this.debug(`Restarting buffer for song with {url: ${this.song.url}} to ensure youtube link is valid`);
			this._buffering = false;
			this.bufferStream(attempts);
		}, 1800000);

		// convert song to pcm using ffmpeg
		this._convertedStream = new PassThrough();
		this._audioConverter = ffmpeg(this._ytdlSource)
			.noVideo()
			.audioChannels(2)
			.audioFrequency(48000)
			.format('s16le')
			.on('error', (e: string) => {
				// ignore if stopped because of SIGINT
				if (e.toString().indexOf('SIGINT') !== -1) return;

				// restart if there is an error
				this._errorMsg += 'Error while converting stream to raw pcm\n';
				this.error(`Ffmpeg encountered {error: ${e}} while converting song with {url: ${this.song.url}} to raw pcm`);

				this._buffering = false;
				this.bufferStream(attempts);
			});
		this._audioConverter.pipe(this._convertedStream);

		// split into 0.1 sec chunks and add to chunkBuffer
		let currentBuffer = Buffer.alloc(0);
		const chunkData = async (data: Buffer) => {
			// add to currentBuffer
			currentBuffer = Buffer.concat([currentBuffer, data]);

			if (Buffer.byteLength(currentBuffer) < 19200) return;
			// Once currentBuffer is the right size add it to chunkBuffer in 0.1 sec chunks
			// make save a fixed size buffer of 1920000, replace currentBuffer with what is left
			const add = currentBuffer.slice(0, 19200);
			currentBuffer = currentBuffer.slice(19200);

			this._chunkBuffer.push(add);
			this.events.emit('bufferReady');
			attempts = 0;
		};

		const finished = async () => {
			this._finishedBuffering = true;
			if (Buffer.byteLength(currentBuffer) === 0) return;

			this._chunkBuffer.push(...this._bufferToChunks(currentBuffer, 19200));
			this.events.emit('bufferReady');
			
			this.debug(`Stream for song with {url: ${this.song.url}}, fully converted to pcm`);
			this._finishedReading = true;
		};

		// want to turn stream into a stream with equal sized chunks for duration counting
		// Size in bytes per second: sampleRate * (bitDepth / 8) * channelCount
		// 192000 bytes for 1 sec of raw pcm data at 48000Hz, 16 bits, 2 channels
		this._convertedStream
			.on('data', chunkData)
			.on('end', finished)
			.on('error', (e) => {
				this._errorMsg += 'Error while converting stream to raw pcm\n';
				this.error(`{error: ${e}} on convertedStream for song with {url: ${this.song.url}}`);

				this._buffering = false;
				this.bufferStream(attempts);
			});
	}

	/**
	 * bufferStream()
	 * 
	 * Starts downloading video from youtube and saving to file
	 * @param attempts - number of attempts to buffer song
	 */
	bufferStream(attempts?: number) {
		if (!attempts) { attempts = 0; }

		if (this.destroyed) return;
		if (this._buffering) return;			// avoid starting 2 bufferStream functions at the same time

		if (attempts > 5) {						// stop trying after 5 attempts to get buffer
			this.error(`Tried buffering song with {url: ${this.song.url}} 5 times, failed all 5 times, giving up`);
			this.events.emit('error', this._errorMsg);
			return;
		}

		this._buffering = true;
		clearTimeout(this._bufferingTimeout);
		this._bufferingTimeout = setTimeout(() => {
			attempts++;
			this.debug(`{attempt: ${attempts}} to buffer stream for song with {url: ${this.song.url}}`);

			// clean up any streams from before just in case
			if (this._ytdlSource) { this._ytdlSource.destroy(); }
			if (this._audioConverter) { this._audioConverter.kill('SIGINT'); }
			if (this._convertedStream) { this._convertedStream.removeAllListeners(); }
			clearTimeout(this._liveTimeout);

			if (this.song.live) {
				this._bufferLive(attempts);
				return;
			}
			this._bufferVideo(attempts);
		}, 100);
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
		if (!attempts) { attempts = 0; }
		attempts++;

		if (chunkNum > this._chunkCount && this._finishedBuffering) {
			this._finishedReading = true;
			return;
		}

		if (attempts < 6) {
			try {
				this._chunkBuffer.push(...this._bufferToChunks(await fs.promises.readFile(path.join(this._tempLocation, chunkNum.toString() + '.pcm')), 19200));
				await fs.promises.unlink(path.join(this._tempLocation, chunkNum.toString() + '.pcm'));
			}
			catch (error) {
				this._errorMsg += `Read Attempt: ${attempts} - Failed to read chunk from buffer\n`;
				this.warn(`{error: ${error}} while reading chunk with {chunkNum: ${chunkNum}} for song with {url: ${this.song.url}}`);
				setTimeout(() => { this._queueChunk(chunkNum, attempts); }, 1000);
			}
		}
		else {
			this.error(`Tried 5 times to read {chunkNum: ${chunkNum}} from buffer for song with {url: ${this.song.url}}`);

			if (!this._finishedBuffering) {
				this._errorMsg += 'Source stream was to slow to mantain buffer. Playback stopped prematurely.';
				this.error(`Source stream was too slow to mantain buffer. Playback stopped prematurely on song with {url: ${this.song.url}}`);
			}

			this.events.emit('error', this._errorMsg);
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
			// calculate when to write next chunk
			let delay = this._nextChunkTime - Date.now() - 10;
			this._nextChunkTime += this._chunkTiming;
			if (delay < 0) { delay = 0; }
			this._writeChunkIn(delay, live);

			// if paused play nothing
			if (this._paused) { return; }
			// if there are chunks in the buffer, play them
			else if (this._chunkBuffer[0]) {
				this.playingSilence = false;

				this._pcmPassthrough.write(this._chunkBuffer.shift());

				if (this._smallChunkNum % 100 === 0 && !live) { this._queueChunk((this._smallChunkNum / 100) + 2); }
				this._smallChunkNum++;
				this._secPlayed = Math.floor(this._smallChunkNum / 10);

				if (this._chunkBuffer.length > 300 && live) {
					this.debug('Stream is now 30 sec behind, clearing chunk buffer to catch up');
					this._chunkBuffer = [];
				}
			}
			// if not finished playing but nothing in buffer or if live stream with nothing in buffer, play silence
			else if (!this._finishedReading || live) {
				this.playingSilence = true;
				this._pcmPassthrough.write(Buffer.alloc(19200));
			}
			// if finished playing, end stream
			else {
				this._pcmPassthrough.end();
				clearTimeout(this._audioWriter);
			}
		}, milliseconds);
	}

	/**
	 * getStream()
	 * 
	 * @returns Passthrough stream with s16le encoded raw pcm data with 2 audio channels and frequency of 48000Hz
	 */
	async getStream() {
		try {
			this.bufferStream();
			await this._bufferReady;

			if (!this.song.live) { await this._queueChunk(1); }
			this._smallChunkNum = 0;
			this._nextChunkTime = Date.now();
			this._writeChunkIn(0, this.song.live);
		}
		catch { /* nothing needs to happen */ }

		return this._pcmPassthrough;
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
		return this._secPlayed;
	}

	/**
	 * destroy()
	 * 
	 * Ends streams, kills ffmpeg processes, and removes temp directory
	 */
	async destroy() {
		if (this.destroyed) return;
		this.destroyed = true;

		if (this._ytdlSource) { this._ytdlSource.destroy(); }
		if (this._audioConverter) { this._audioConverter.kill('SIGINT'); }
		if (this._convertedStream) { this._convertedStream.removeAllListeners(); }
		this._ytdlSource = null;
		this._audioConverter = null;
		this._convertedStream = null;

		clearTimeout(this._liveTimeout);
		clearInterval(this._audioWriter);
		this._pcmPassthrough.end();

		this._pcmPassthrough = null;
		this._chunkBuffer = null;
		this.events.removeAllListeners();

		try { await fs.promises.rm(this._tempLocation, { recursive: true }); } catch { /* */ }
	}
}
