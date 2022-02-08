import play from 'play-dl';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { PassThrough } from 'stream';

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

	playDuration: number;
	paused: boolean;

	errorMsg: string;

	chunkCount: number;
	chunkBuffer: Array<Buffer>;
	ready: boolean;
	buffering: boolean;
	finishedBuffering: boolean;
	finishedReading: boolean;
	audioWriter: NodeJS.Timer;
	audioConverter: ffmpeg.FfmpegCommand;
	pcmPassthrough: PassThrough;

	tempLocation: string;
	bufferReady: Promise<void>;

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

		this.chunkCount = -1;						// number of chunks that this song has
		this.ready = false;
		this.finishedBuffering = false;				// finished downloading video or not
		this.finishedReading = false;				// read last chunk or not
		this.chunkBuffer = [];						// chuncks about to be played
		this.audioConverter = undefined;			// converts youtube stream to pcm
		this.pcmPassthrough = new PassThrough();	// create passthrough stream for pcm data

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
	async bufferStream(attempts: number | void) {
		if (!attempts) { attempts = 0; }

		// if buffering is not currently occuring, try to start buffer
		if (!this.buffering && attempts < 5) {
			this.buffering = true;
			attempts++;
			this.debug(`{attempt: ${attempts}} to buffer stream for song with {url: ${this.song.url}}`);

			try {
				// make directory for buffer
				await fs.promises.mkdir(this.tempLocation, { recursive: true });

				try {
					// obtain stream from youtube
					const source = await play.stream(this.song.url, { discordPlayerCompatibility: true });
					this.debug(`Audio stream obtained for song with {url: ${this.song.url}}, starting conversion to pcm`);

					// use ffmpeg to convert to raw pcm data
					this.audioConverter = ffmpeg(source.stream)
						.audioChannels(2)							// 2 channels
						.audioFrequency(44100)						// audio freq of 44100 Hz
						.format('s16le');							// bitDepth of 16 bits

					this.chunkCount = -1;
					let currentBuffer = Buffer.alloc(0);
					// get evenly sized chunks and handle error and end events
					this.audioConverter.pipe()
						// want to turn stream into a stream with equal sized chunks for duration counting
						// Size in bytes per second: sampleRate * (bitDepth / 8) * channelCount
						// 1760040 bytes for 10 sec of raw pcm data at 44100Hz, 16 bits, 2 channels
						.on('data', async (data) => {
							// add to currentBuffer
							currentBuffer = Buffer.concat([currentBuffer, data]);

							// Once currentBuffer is the right size, save to file
							if (Buffer.byteLength(currentBuffer) >= 1764000) {
								// make save a fixed size buffer of 1764000, replace currentBuffer with what is left
								const save = currentBuffer.slice(0, 1764000);
								currentBuffer = currentBuffer.slice(1764000);

								this.chunkCount++;
								if (this.chunkCount === 0) {
									// if this is the first chunk, don't write to disk, just keep in chunkBuffer
									this.chunkBuffer.push(...this.bufferToChunks(save, 17640));
								}
								else {
									try {
										// save the chunk as <chunkNumber>.pcm
										await fs.promises.writeFile(path.join(this.tempLocation, this.chunkCount.toString() + '.pcm'), save);

										if (!this.ready) {
											this.ready = true;
											this.events.emit('bufferReady');
										}
									}
									catch (e) {
										// fatal error if this fails
										this.errorMsg += 'Failed to write song to disk\n';
										this.error(`{error: ${e}} while saving chunk with {chunkCount: ${this.chunkCount}} for song with {url: ${this.song.url}}`);
										this.events.emit('fatalEvent', this.errorMsg);
									}
								}
							}
						})
						.on('error', (e) => {
							this.errorMsg += 'Error while converting song to raw pcm data\n';
							this.error(`FFmpeg encountered {error: ${e}} while converting song with {url: ${this.song.url}} to raw pcm`);
							this.events.emit('fatalEvent', this.errorMsg);
						})
						.on('end', async () => {
							if (!this.ready) {
								this.ready = true;
								this.events.emit('bufferReady');
							}
							this.chunkCount++;
							this.finishedBuffering = true;
							try {
								// save the chunk as <chunkNumber>.pcm
								await fs.promises.writeFile(path.join(this.tempLocation, this.chunkCount.toString() + '.pcm'), currentBuffer);
							}
							catch (e) {
								// fatal error if this fails
								this.errorMsg += 'Failed to write song to disk\n';
								this.error(`{error: ${e}} while saving chunk with {chunkCount: ${this.chunkCount}} for song with {url: ${this.song.url}}`);
								this.events.emit('fatalEvent', this.errorMsg);
							}
							this.debug(`Stream for song with {url: ${this.song.url}}, fully converted to pcm`);
						});
				}
				catch (err) {
					this.errorMsg += `Buffer Stream Attempt: ${attempts} - Failed to get song from youtube\n`;
					this.warn(`{error: ${err}} while getting audio stream for song with {url: ${this.song.url}}`);

					this.buffering = false;
					this.bufferStream(attempts);
				}
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

		if (attempts < 11) {
			try {
				this.chunkBuffer.push(...this.bufferToChunks(await fs.promises.readFile(path.join(this.tempLocation, chunkNum.toString() + '.pcm')), 17640));
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

	/**
	 * getStream()
	 * 
	 * @returns Passthrough stream with s16le encoded raw pcm data with 2 audio channels and frequency of 44100Hz
	 */
	async getStream() {
		try {
			this.bufferStream();
			await this.bufferReady;

			let smallChunkNum = 0;
			this.audioWriter = setInterval(() => {
				if (this.paused) {
					this.pcmPassthrough.write(Buffer.alloc(17640));
				}
				else if (this.chunkBuffer[0]) {
					// small chunks are equal to 0.1sec of music, divide their count by 10 to get seconds played
					this.playDuration = Math.floor(smallChunkNum / 10);
					this.pcmPassthrough.write(this.chunkBuffer[0]);
					this.chunkBuffer.shift();

					if (smallChunkNum % 100 === 0) {
						this.queueChunk((smallChunkNum / 100) + 1);
					}
					smallChunkNum++;
				}
				else if (!this.finishedReading) {
					this.pcmPassthrough.write(Buffer.alloc(17640));
				}
				else {
					this.pcmPassthrough.end();
					clearInterval(this.audioWriter);
				}
			}, 100);
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
		clearInterval(this.audioWriter);
		this.pcmPassthrough.end();
		try {
			this.audioConverter.kill('SIGKILL');
		}
		catch { /* Just in case */ }

		try {
			await fs.promises.rm(this.tempLocation, { recursive: true });
		}
		catch (error) {
			this.warn(`{error: ${error}} while removing {directory: ${this.tempLocation}} for song with {url: ${this.song.url}}`);
		}
	}
}
