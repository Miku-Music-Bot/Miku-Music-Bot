import { PassThrough } from 'stream';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { EventEmitter } from 'events';

import type { AudioSettings } from './AudioSettings';
import type { GuildHandler } from '../GuildHandler';
import { GuildComponent } from '../GuildComponent';
import type { AudioSource } from './sources/AudioSource';

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
	source: AudioSource;
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

		// change bitrate in case of nightcore setting
		let bitrate = 48000;
		this.source.chunkTiming = 100;
		if (this.audioSettings.nightcore && !this.source.song.live) {
			bitrate = 64000;
			this.source.chunkTiming = 75;
		}

		// kill old ffmpeg process
		try { this.ffmpeg.kill('SIGINT'); } catch { /* */ }

		// create new passthrough stream for ffmpeg
		this.ffmpegPassthrough.end();
		this.ffmpegPassthrough = new PassThrough();

		// create new ffmpeg process with new settings
		this.ffmpeg = ffmpeg(this.ffmpegPassthrough)
			.inputOptions([
				'-f s16le',
				`-ar ${bitrate}`,
				'-ac 2'
			])
			.audioFilters('loudnorm=I=-32')
			.audioCodec('libopus')
			.outputFormat('opus')
			.on('start', () => {
				this.shouldWrite = true;
			})
			.on('error', (error) => {
				if (error.toString().indexOf('SIGINT') !== -1) return;

				this.error(`FFmpeg encountered {error: ${error}} while applying audio effects to song using {audioSettings: ${JSON.stringify(this.audioSettings)}}`);
				this.events.emit('fatalEvent', 'Error while applying audio effects and converting pcm to opus');
			});

		this.ffmpeg.pipe()
			.on('data', (data) => {
				this.opusPassthrough.write(data);
			})
			.on('end', () => {
				this.opusPassthrough.end();
			});
	}

	/**
	 * processStream()
	 * 
	 * @param pcmPassthrough - Passthrough stream of s16le encoded pcm data with 2 audio channels and freqency of 48000
	 * @param source - AudioSource for where the stream is coming from
	 * @returns Passthrough stream of processed opus data
	 */
	processStream(pcmPassthrough: PassThrough, source: AudioSource) {
		this.source = source;
		pcmPassthrough.on('data', (data) => {
			if (this.shouldWrite) { this.ffmpegPassthrough.write(data); }
		});
		pcmPassthrough.on('end', () => {
			this.ffmpegPassthrough.end();
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
			this.ffmpeg.kill('SIGINT');
		} catch { /* */ }

		this.ffmpegPassthrough.end();
		this.opusPassthrough.end();
	}
}