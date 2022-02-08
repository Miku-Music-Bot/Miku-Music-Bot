import { PassThrough } from 'stream';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { EventEmitter } from 'events';

import type { AudioSettings } from './AudioSettings';
import type { GuildHandler } from '../GuildHandler';
import { GuildComponent } from '../GuildComponent';

ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * AudioProcessor
 * 
 * Handles applying audio effects and converting pcm stream to opus stream
 * Seemlessly applies new audio effects during playback
 */
export class AudioProcessor extends GuildComponent {
	events: EventEmitter;
	audioSettings: AudioSettings;
	ffmpeg: ffmpeg.FfmpegCommand;
	shouldWrite: boolean;
	ffmpegPassthrough: PassThrough;
	opusPassthrough: PassThrough;

	constructor(guildHandler: GuildHandler, audioSettings: AudioSettings) {
		super(guildHandler);
		this.events = new EventEmitter();

		this.shouldWrite = false;
		this.audioSettings = audioSettings;
		this.ffmpegPassthrough = new PassThrough();
		this.opusPassthrough = new PassThrough();
	}

	/**
	 * newFFmpeg()
	 * 
	 * Creates a new ffmpeg instance using updated settings
	 */
	newFFmpeg() {
		this.shouldWrite = false;
		try {
			this.ffmpeg.kill('SIGKILL');
		} catch { /* */ }

		this.ffmpegPassthrough.end();
		this.ffmpegPassthrough = new PassThrough();

		this.ffmpeg = ffmpeg(this.ffmpegPassthrough)
			.inputOptions([
				'-f s16le',
				`-ar ${this.audioSettings.bitrate}`,
				'-ac 2'
			])
			.outputFormat('ogg')
			.on('start', () => {
				this.shouldWrite = true;
			});

		this.ffmpeg.pipe()
			.on('data', (data) => {
				console.log(data);
				this.opusPassthrough.write(data);
			})
			.on('error', (error) => {
				this.error(`FFmpeg encountered {error: ${error}} while applying audio effects to song using {audioSettings: ${JSON.stringify(this.audioSettings)}}`);
				this.events.emit('fatalEvent', 'Error while applying audio effects and converting pcm to opus');
			});
	}

	/**
	 * processStream()
	 * 
	 * @param pcmPassthrough - Passthrough stream of s16le encoded pcm data with 2 audio channels and freqency of 44100
	 * @returns Passthrough stream of processed opus data
	 */
	processStream(pcmPassthrough: PassThrough) {
		pcmPassthrough.on('data', (data) => {
			if (this.shouldWrite) { this.ffmpegPassthrough.write(data); }
		});

		this.newFFmpeg();

		// if new audioSettings are applied restart ffmpeg
		this.audioSettings.on('newSettings', () => {
			this.newFFmpeg();
		});

		return this.opusPassthrough;
	}

	/**
	 * destroy()
	 * 
	 * Stops ffmpeg and closes streams gracefully
	 */
	destroy() {
		try {
			this.ffmpeg.kill('SIGKILL');
		} catch { /* */ }

		this.ffmpegPassthrough.end();
		this.opusPassthrough.end();
	}
}