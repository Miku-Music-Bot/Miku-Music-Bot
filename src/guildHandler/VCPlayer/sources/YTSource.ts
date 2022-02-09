import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import { PassThrough } from 'stream';
import { fork, ChildProcess } from 'child_process';

import { AudioSource } from './AudioSource';
import { GuildComponent } from '../../GuildComponent';
import type { Song } from '../Song';
import type { GuildHandler } from '../../GuildHandler';

const TEMP_DIR = process.env.TEMP_DIR;				// directory for temp files

/**
 * YTSource
 *
 * Handles getting audio from youtube
 */
export class YTSource extends GuildComponent implements AudioSource {
	song: Song;
	events: EventEmitter;

	playDuration: number;
	paused: boolean;

	errorMsg: string;

	sourceGetter: ChildProcess;
	nextChunkTime: number;
	chunkTiming: number;
	chunkCount: number;
	smallChunkNum: number;
	chunkBuffer: Array<Buffer>;
	ready: boolean;
	buffering: boolean;
	finishedBuffering: boolean;
	finishedReading: boolean;
	dataTimeout: NodeJS.Timeout;
	audioWriter: NodeJS.Timeout;
	pcmPassthrough: PassThrough;

	tempLocation: string;
	bufferReady: Promise<void>;
	destroyed: boolean;

	/**
	 * @param song - Song object for song to create source from
	 */
	constructor(guildHandler: GuildHandler, song: Song) {
		super(guildHandler);
		this.song = song;
		this.events = new EventEmitter();			// set up event emitter

		this.buffering = false;						// currently getting stream or not, to prevent 2 bufferStream() functions from running at the same time

		this.paused = false;						// paused or not
		this.playDuration = 0;						// number of chunks played, (1 chunk = 0.1 sec)

		this.errorMsg = '';							// msg for why error occured

		this.chunkTiming = 100;						// default to 100 for 0.1 sec of audio at a time
		this.chunkCount = -1;						// number of chunks that this song has
		this.ready = false;
		this.finishedBuffering = false;				// finished downloading video or not
		this.finishedReading = false;				// read last chunk or not
		this.chunkBuffer = [];						// chuncks about to be played
		this.pcmPassthrough = new PassThrough();	// create passthrough stream for pcm data

		this.destroyed = false;

		// figure out name for temp location folder
		const randomNumber = Math.floor(Math.random() * 1000000000000000);
		const hash = crypto.createHash('md5').update(this.song.url + randomNumber.toString()).digest('hex');
		this.tempLocation = path.join(TEMP_DIR, hash);

		// wait for buffer to be ready, resolve once ready, rejects if error occurs while buffering
		this.bufferReady = new Promise((resolve, reject) => {
			this.events.on('bufferReady', () => {
				this.debug(`Buffer ready for song with {url: ${this.song.url}}`);
				resolve();
			});
			this.events.on('fatalEvent', reject);
		});
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
	 */
	async bufferStream(attempts?: number, seek?: number) {
		if (!seek) { seek = 0; }
		if (!attempts) { attempts = 0; }

		// if buffering is not currently occuring, try to start buffer
		if (!this.buffering && attempts < 5) {
			this.buffering = true;
			attempts++;
			this.debug(`{attempt: ${attempts}} to buffer stream for song with {url: ${this.song.url}}`);

			try {
				this.sourceGetter.kill();
			} catch { /* nothing to do */ }

			try {
				// make directory for buffer
				await fs.promises.mkdir(this.tempLocation, { recursive: true });

				this.sourceGetter = fork(path.join(__dirname, 'ytSourceGetter.js'));
				this.sourceGetter.send({ url: this.song.url, tempLocation: this.tempLocation, seek, chunkCount: this.chunkCount });

				// handle all messages that could come from child
				this.sourceGetter.on('message', (msg: { type: string, content?: string }) => {
					switch (msg.type) {
						// increasing chunkCount
						case ('chunkCount'): {
							this.chunkCount = parseInt(msg.content);

							// restart download if no data for 10 seconds
							clearTimeout(this.dataTimeout);
							this.dataTimeout = setTimeout(() => {
								if (!this.song.live) {
									this.debug(`No data was recieved for 10 seconds on song with {url: ${this.song.url}}, restarting download from {seek: ${this.chunkCount + 1}}`);
									this.buffering = false;
									this.bufferStream(attempts - 1, this.chunkCount + 1);
								}
							}, 10000);
							break;
						}
						// debug log
						case ('debug'): {
							this.debug(msg.content);
							break;
						}
						// warn log
						case ('warn'): {
							this.warn(msg.content);
							break;
						}
						// error log
						case ('error'): {
							this.error(msg.content);
							break;
						}
						// add to errorMsg
						case ('addError'): {
							this.errorMsg += msg.content;
							break;
						}
						// when buffer is ready
						case ('bufferReady'): {
							this.events.emit('bufferReady');
							break;
						}
						// in case of a fatal event
						case ('fatalEvent'): {
							clearTimeout(this.dataTimeout);
							this.events.emit('fatalEvent', this.errorMsg);
							break;
						}
						// finished buffering song
						case ('finishedBuffering'): {
							clearTimeout(this.dataTimeout);
							this.finishedBuffering = true;
							break;
						}
						case ('failed'): {
							clearTimeout(this.dataTimeout);
							this.sourceGetter.kill();
							this.buffering = false;
							this.bufferStream(attempts);
							break;
						}
					}
				});
			}
			catch (error) {
				this.errorMsg += `Buffer Stream Attempt: ${attempts} - Failed to create a temp directory for song on disk\n`;
				this.warn(`{error: ${error}} while creating temp directory while downloading song with {url: ${this.song.url}}`);

				this.buffering = false;
				this.bufferStream(attempts);
			}
		}
		else if (!this.buffering) {
			this.error(`Tried buffering song with {url: ${this.song.url}} 5 times, failed all 5 times, giving up`);
			this.events.emit('fatalEvent', this.errorMsg);
		}
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
				this.errorMsg += `Read Attempt: ${attempts} - Failed to read song from disk\n`;
				this.warn(`{error: ${error}} while reading chunk with {chunkNum: ${chunkNum}} for song with {url: ${this.song.url}}`);
				setTimeout(() => { this.queueChunk(chunkNum, attempts); }, 1000);
			}
		}
		else {
			this.error(`Tried 5 times to read {chunkNum: ${chunkNum}} from disk for song with {url: ${this.song.url}}`);

			if (!this.finishedBuffering) {
				this.errorMsg += 'Source stream was to slow to mantain buffer. Playback stopped prematurely.';
				this.error(`Source stream was too slow to mantain buffer. Playback stopped prematurely on song with {url: ${this.song.url}}`);
			}

			this.events.emit('fatalEvent', this.errorMsg);
		}
	}

	writeChunkIn(milliseconds: number) {
		this.audioWriter = setTimeout(() => {
			// calculate when to write next chunk
			let delay = this.nextChunkTime - Date.now();
			this.nextChunkTime += this.chunkTiming;
			if (delay < 0) { delay = 0; }
			this.writeChunkIn(delay);

			// if paused play silence
			if (this.paused) { this.pcmPassthrough.write(Buffer.alloc(19200)); }
			// if there are chunks in the buffer, play them
			else if (this.chunkBuffer[0]) {
				// small chunks are equal to 0.1sec of music, divide their count by 10 to get seconds played
				this.playDuration = Math.floor(this.smallChunkNum / 10);
				this.pcmPassthrough.write(this.chunkBuffer[0]);
				this.chunkBuffer.shift();

				if (this.smallChunkNum % 10 === 0) {
					this.queueChunk((this.smallChunkNum / 10) + 1);
				}
				this.smallChunkNum++;
			}
			// if not finished playing but nothing in buffer, play silence
			else if (!this.finishedReading) {
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
		try {
			this.bufferStream();
			await this.bufferReady;

			await this.queueChunk(0);
			this.smallChunkNum = 0;
			this.nextChunkTime = Date.now();
			this.writeChunkIn(0);
		}
		catch { /* nothing needs to happen */ }
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
			try {
				this.sourceGetter.kill();
			}
			catch { /* nothing to be done */ }

			clearTimeout(this.dataTimeout);
			clearInterval(this.audioWriter);
			this.pcmPassthrough.end();

			try {
				await fs.promises.rm(this.tempLocation, { recursive: true });
			}
			catch (error) {
				this.warn(`{error: ${error}} while removing {directory: ${this.tempLocation}} for song with {url: ${this.song.url}}`);
			}
		}
	}
}
