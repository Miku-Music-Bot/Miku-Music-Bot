import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import { Readable, PassThrough } from 'stream';
import * as ytdl from 'ytdl-core';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';

import { AudioSource } from './AudioSource';
import { GuildComponent } from '../../GuildComponent';
import type { Song } from '../Song';
import type { GuildHandler } from '../../GuildHandler';

const TEMP_DIR = process.env.TEMP_DIR;				// directory for temp files

ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * YTSource
 *
 * Handles getting audio from youtube
 */
export class YTSource extends GuildComponent implements AudioSource {
	song: Song;
	events: EventEmitter;
	errorMsg: string;

	playDuration: number;
	paused: boolean;
	destroyed: boolean;

	buffering: boolean;
	finishedBuffering: boolean;
	bufferReady: Promise<void>;
	ytdlSource: Readable;
	audioConverter: ffmpeg.FfmpegCommand;
	convertedStream: PassThrough;

	chunkCount: number;
	tempLocation: string;

	finishedReading: boolean;
	chunkBuffer: Array<Buffer>;
	chunkTiming: number;
	smallChunkNum: number;
	nextChunkTime: number;
	audioWriter: NodeJS.Timeout;
	pcmPassthrough: PassThrough;

	/**
	 * @param song - Song object for song to create source from
	 */
	constructor(guildHandler: GuildHandler, song: Song) {
		super(guildHandler);
		this.song = song;
		this.events = new EventEmitter();			// set up event emitter
		this.errorMsg = '';							// user friendly msg for why error occured

		this.playDuration = 0;						// number of seconds
		this.paused = false;						// paused or not
		this.destroyed = false;						// cleaned up or not

		this.buffering = false;						// currently getting stream or not, to prevent 2 bufferStream() functions from running at the same time
		this.finishedBuffering = false;				// whether or not song has finished downloading

		this.chunkCount = 0;						// number of chunks that this song has (first chunk has chunkCount 1)

		this.finishedReading = false;				// read last chunk or not
		this.chunkBuffer = [];						// chuncks about to be played
		this.chunkTiming = 100;						// default to 100 for 0.1 sec of audio at a time
		this.smallChunkNum = 0;						// how many 0.1 sec "smallChunks" have been played
		this.pcmPassthrough = new PassThrough();	// create passthrough stream for pcm data

		// wait for buffer to be ready, resolve once ready, rejects if error occurs while buffering
		this.bufferReady = new Promise((resolve, reject) => {
			this.events.once('bufferReady', () => {
				this.debug(`Buffer ready for song with {url: ${this.song.url}}`);
				resolve();
			});
			this.events.once('fatalEvent', reject);
		});

		// figure out name for temp location folder
		const randomNumber = Math.floor(Math.random() * 1000000000000000);
		const hash = crypto.createHash('md5').update(this.song.url + randomNumber.toString()).digest('hex');
		this.tempLocation = path.join(TEMP_DIR, hash);
	}

	/**
	 * bufferToChunks()
	 * 
	 * Splits a buffer into an array of chucks of a given size
	 * @param buffer - buffer to split
	 * @param size - size of chunks to split into
	 * @returns array of buffers of chunks
	 */
	bufferToChunks(buffer: Buffer, size: number): Array<Buffer> {
		const chunks = [];
		while (Buffer.byteLength(buffer) > 0) {
			chunks.push(buffer.slice(0, size));
			buffer = buffer.slice(size);
		}
		return chunks;
	}

	/**
	 * bufferStream()
	 * 
	 * Starts downloading video from youtube and saving to file
	 * @param attempts - number of attempts to buffer song
	 * @param seek - time (in seconds) to start downloading from
	 */
	async bufferStream(attempts?: number) {
		if (!attempts) { attempts = 0; }

		if (this.destroyed) return;
		if (this.buffering) return;			// avoid starting 2 bufferStream functions at the same time
		if (this.song.live) return;			// don't buffer this way if live song

		if (attempts > 10) {				// stop trying after 10 attempts to getStream
			this.error(`Tried buffering song with {url: ${this.song.url}} 10 times, failed all 10 times, giving up`);
			this.events.emit('fatalEvent', this.errorMsg);
			return;
		}

		this.buffering = true;
		attempts++;
		this.debug(`{attempt: ${attempts}} to buffer stream for song with {url: ${this.song.url}}`);

		// clean up any streams from before just in case
		if (this.ytdlSource) { this.ytdlSource.destroy(); }
		if (this.audioConverter) { this.audioConverter.kill('SIGINT'); }
		if (this.convertedStream) { this.convertedStream.removeAllListeners(); }

		// make directory for buffer
		try { await fs.promises.mkdir(this.tempLocation, { recursive: true }); }
		catch (error) {
			// retry if this fails
			this.errorMsg += `Buffer Stream Attempt: ${attempts} - Failed to create a temp directory for song on disk\n`;
			this.warn(`{error: ${error}} while creating temp directory while downloading song with {url: ${this.song.url}}`);

			this.buffering = false;
			this.bufferStream(attempts);
			return;
		}

		// obtain stream from youtube
		try {
			this.ytdlSource = ytdl(this.song.url, { filter: 'audioonly', quality: 'highestaudio' });
			this.debug(`Audio stream obtained for song with {url: ${this.song.url}}, starting conversion to pcm`);
		}
		catch (err) {
			// retry if this fails
			this.errorMsg += `Buffer Stream Attempt: ${attempts} - Failed to get song from youtube\n`;
			this.warn(`{error: ${err}} while getting audio stream for song with {url: ${this.song.url}}`);

			this.buffering = false;
			this.bufferStream(attempts);
			return;
		}

		// convert song to pcm using ffmpeg
		this.convertedStream = new PassThrough();
		this.audioConverter = ffmpeg(this.ytdlSource)
			.noVideo()
			.audioChannels(2)
			.audioFrequency(48000)
			.format('s16le')
			.on('error', (e) => {
				// ignore if stopped because of SIGINT
				if (e.toString().indexOf('SIGINT') !== -1) return;

				// restart if there is an error
				this.errorMsg += `Buffer Attempt: ${attempts} - Error while converting stream to raw pcm\n`;
				this.error(`Ffmpeg encountered {error: ${e}} while converting song with {url: ${this.song.url}} to raw pcm`);

				this.buffering = false;
				this.bufferStream(attempts);
			});
		this.audioConverter.pipe(this.convertedStream);

		// split into and save even chunks of 10 sec each
		let chunkName = this.chunkCount;
		let currentBuffer = Buffer.alloc(0);
		const chunkData = async (data: Buffer) => {
			// add to currentBuffer
			currentBuffer = Buffer.concat([currentBuffer, data]);

			// Once currentBuffer is the right size, save to file
			if (Buffer.byteLength(currentBuffer) >= 1920000) {
				// make save a fixed size buffer of 1920000, replace currentBuffer with what is left
				const save = currentBuffer.slice(0, 1920000);
				currentBuffer = currentBuffer.slice(1920000);

				chunkName++;
				try {
					// save the chunk as <chunkNumber>.pcm
					await fs.promises.writeFile(path.join(this.tempLocation, chunkName.toString() + '.pcm'), save);
					// add 1 to chunkCount after a chunk (10 sec of audio) is successfully written
					this.chunkCount++;

					// emit bufferReady in case it wasn't earlier
					if (this.chunkCount === 2) { this.events.emit('bufferReady'); }
				}
				catch (e) {
					// fatal error if write fails
					this.errorMsg += 'Failed to write song to buffer\n';
					this.error(`{error: ${e}} while saving chunk with {chunkCount: ${this.chunkCount}} for song with {url: ${this.song.url}}`);
					this.events.emit('fatalEvent', this.errorMsg);
				}
			}
		};

		const finished = async () => {
			// save the last bit as final file
			chunkName++;
			this.finishedBuffering = true;
			if (Buffer.byteLength(currentBuffer) > 0) {
				try {
					// save the chunk as <chunkNumber>.pcm
					await fs.promises.writeFile(path.join(this.tempLocation, chunkName.toString() + '.pcm'), currentBuffer);
					// add 1 to seek after a chunk (1 sec of audio) is successfully written
					this.chunkCount++;

					// emit bufferReady in case it wasn't earlier
					this.events.emit('bufferReady');
				}
				catch (e) {
					// fatal error if this fails
					this.errorMsg += 'Failed to write song to buffer\n';
					this.error(`{error: ${e}} while saving chunk with {chunkCount: ${this.chunkCount}} for song with {url: ${this.song.url}}`);
					this.events.emit('fatalEvent', this.errorMsg);
				}
			}
			this.debug(`Stream for song with {url: ${this.song.url}}, fully converted to pcm`);
		};

		// want to turn stream into a stream with equal sized chunks for duration counting
		// Size in bytes per second: sampleRate * (bitDepth / 8) * channelCount
		// 192000 bytes for 1 sec of raw pcm data at 48000Hz, 16 bits, 2 channels
		this.convertedStream
			.on('data', chunkData)
			.on('end', finished)
			.on('error', (e) => {
				this.errorMsg += 'Error while converting stream to raw pcm\n';
				this.error(`{error: ${e}} on convertedStream for song with {url: ${this.song.url}}`);

				this.buffering = false;
				this.bufferStream(attempts);
			});
	}


	/**
	 * queueChunk()
	 * 
	 * Reads the requested chunk and points this.nextChunk to the data
	 * @param chunkNum - chunk number to prepare
	 * @param attempts - number of attempts to read file
	 */
	async queueChunk(chunkNum: number, attempts: number | void) {
		if (!attempts) { attempts = 0; }
		attempts++;

		if (chunkNum > this.chunkCount && this.finishedBuffering) {
			this.finishedReading = true;
			return;
		}

		if (attempts < 6) {
			try {
				this.chunkBuffer.push(...this.bufferToChunks(await fs.promises.readFile(path.join(this.tempLocation, chunkNum.toString() + '.pcm')), 19200));
				await fs.promises.unlink(path.join(this.tempLocation, chunkNum.toString() + '.pcm'));
			}
			catch (error) {
				this.errorMsg += `Read Attempt: ${attempts} - Failed to read chunk from buffer\n`;
				this.warn(`{error: ${error}} while reading chunk with {chunkNum: ${chunkNum}} for song with {url: ${this.song.url}}`);
				setTimeout(() => { this.queueChunk(chunkNum, attempts); }, 1000);
			}
		}
		else {
			this.error(`Tried 5 times to read {chunkNum: ${chunkNum}} from buffer for song with {url: ${this.song.url}}`);

			if (!this.finishedBuffering) {
				this.errorMsg += 'Source stream was to slow to mantain buffer. Playback stopped prematurely.';
				this.error(`Source stream was too slow to mantain buffer. Playback stopped prematurely on song with {url: ${this.song.url}}`);
			}

			this.events.emit('fatalEvent', this.errorMsg);
		}
	}

	/**
	 * writeChunkIn()
	 * 
	 * Recursive function ONLY CALL THIS EXTERNALLY ONCE
	 * Calculates delay until nextChunkTime to ensure chunks are writeen as close to the required time as possible
	 * @param milliseconds - delay until time to write chunk
	 * @param live - read from disk to add to buffer or not
	 */
	writeChunkIn(milliseconds: number, live: boolean) {
		this.audioWriter = setTimeout(() => {
			// calculate when to write next chunk
			let delay = this.nextChunkTime - Date.now() - 10;
			this.nextChunkTime += this.chunkTiming;
			if (delay < 0) { delay = 0; }
			this.writeChunkIn(delay, live);

			// if paused play nothing
			if (this.paused) { return; }
			// if there are chunks in the buffer, play them
			else if (this.chunkBuffer[0]) {
				// small chunks are equal to 0.1sec of music, divide their count by 10 to get seconds played
				this.playDuration = Math.floor(this.smallChunkNum / 10);
				this.pcmPassthrough.write(this.chunkBuffer[0]);
				this.chunkBuffer.shift();

				if (this.smallChunkNum % 100 === 0 && !live) {
					this.queueChunk((this.smallChunkNum / 100) + 2);
				}
				this.smallChunkNum++;
			}
			// if not finished playing but nothing in buffer or if live stream with nothing in buffer, play silence
			else if (!this.finishedReading || live) {
				this.pcmPassthrough.write(Buffer.alloc(19200));
			}
			// if finished playing, end stream
			else {
				this.pcmPassthrough.end();
				clearTimeout(this.audioWriter);
			}
		}, milliseconds);
	}

	/**
	 * getStream()
	 * 
	 * @returns Passthrough stream with s16le encoded raw pcm data with 2 audio channels and frequency of 48000Hz
	 */
	async getStream() {
		// if song is live, handle stream directly
		if (this.song.live) {
			this.convertedStream = new PassThrough();
			this.audioConverter = ffmpeg(ytdl(this.song.url))
				.noVideo()
				.audioChannels(2)
				.audioFrequency(48000)
				.format('s16le')
				.on('error', (e: string) => {
					// ignore if stopped because of SIGINT
					if (e.toString().indexOf('SIGINT') !== -1) return;

					// restart if there is an error
					this.errorMsg += 'Error while converting stream to raw pcm\n';
					this.error(`Ffmpeg encountered {error: ${e}} while converting song with {url: ${this.song.url}} to raw pcm`);
					this.events.emit('fatalEvent', this.errorMsg);
				});
			this.audioConverter.pipe(this.convertedStream);

			// split into 0.1 sec chunks and add to chunkBuffer
			let currentBuffer = Buffer.alloc(0);
			const chunkData = async (data: Buffer) => {
				// add to currentBuffer
				currentBuffer = Buffer.concat([currentBuffer, data]);

				// Once currentBuffer is the right size, save to file
				if (Buffer.byteLength(currentBuffer) >= 192000) {
					// make save a fixed size buffer of 1920000, replace currentBuffer with what is left
					const save = currentBuffer.slice(0, 192000);
					currentBuffer = currentBuffer.slice(192000);

					this.chunkBuffer.push(...this.bufferToChunks(save, 19200));
					this.events.emit('bufferReady');
				}
			};

			const finished = async () => {
				this.finishedBuffering = true;
				if (Buffer.byteLength(currentBuffer) > 0) {
					this.chunkBuffer.push(...this.bufferToChunks(currentBuffer, 19200));
				}
				this.debug(`Stream for song with {url: ${this.song.url}}, fully converted to pcm`);
			};

			// want to turn stream into a stream with equal sized chunks for duration counting
			// Size in bytes per second: sampleRate * (bitDepth / 8) * channelCount
			// 192000 bytes for 1 sec of raw pcm data at 48000Hz, 16 bits, 2 channels
			this.convertedStream
				.on('data', chunkData)
				.on('end', finished)
				.on('error', (e) => {
					this.errorMsg += 'Error while converting stream to raw pcm\n';
					this.error(`{error: ${e}} on convertedStream for song with {url: ${this.song.url}}`);
					this.events.emit('fatalEvent', this.errorMsg);
				});

			await this.bufferReady;
			this.smallChunkNum = 0;
			this.nextChunkTime = Date.now();
			this.writeChunkIn(0, true);
		}
		else {
			// if not live, buffer song to disk first then play
			try {
				this.bufferStream();
				await this.bufferReady;

				await this.queueChunk(1);
				this.smallChunkNum = 0;
				this.nextChunkTime = Date.now();
				this.writeChunkIn(0, false);
			}
			catch { /* nothing needs to happen */ }
		}
		return this.pcmPassthrough;
	}

	/**
	 * pause()
	 * 
	 * Pauses source
	 */
	pause() { this.paused = true; }

	/**
	 * resumse()
	 * 
	 * Resumes source
	 */
	resume() { this.paused = false; }

	/**
	 * destroy()
	 * 
	 * Ends streams, kills ffmpeg processes, and removes temp directory
	 */
	async destroy() {
		if (!this.destroyed) {
			this.destroyed = true;

			if (this.ytdlSource) { this.ytdlSource.destroy(); }
			if (this.audioConverter) { this.audioConverter.kill('SIGINT'); }
			if (this.convertedStream) { this.convertedStream.removeAllListeners(); }

			clearInterval(this.audioWriter);
			this.pcmPassthrough.end();

			try {
				await fs.promises.rm(this.tempLocation, { recursive: true });
			}
			catch { /* */ }
		}
	}
}
