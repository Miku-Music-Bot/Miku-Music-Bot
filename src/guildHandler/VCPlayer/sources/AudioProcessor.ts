
import { PassThrough } from 'stream';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { EventEmitter } from 'events';

import type GuildHandler from '../../GuildHandler';
import GuildComponent from '../../GuildComponent';
import type AudioSource from './AudioSource';

ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * AudioProcessor
 * 
 * Handles applying audio effects and converting pcm stream to opus stream
 * Seemlessly applies new audio effects during playback
 */
export default class AudioProcessor extends GuildComponent {
	events: EventEmitter;
	private _source: AudioSource;

	private _shouldEnd: boolean;
	private _audioFilter: ffmpeg.FfmpegCommand;
	private _audioConverter: ffmpeg.FfmpegCommand;
	private _audioFilterInput: PassThrough;
	private _audioConverterInput: PassThrough;
	private _opusPassthrough: PassThrough;

	/**
	 * @param guildHandler - guildHandler object
	 * @param audioSettings - settings that the audio processor should start with
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
		this.events = new EventEmitter();
		this._shouldEnd = true;
		this.events.on('error', () => { this.destroy(); });
	}

	/**
	 * newFFmpeg()
	 * 
	 * Creates a new ffmpeg instance using updated settings
	 */
	newFFmpeg() {
		// pause audio player while changing ffmpeg
		this.vcPlayer.pauseAudioPlayer();
		// resume source temporary so ffmpeg has data to use so we don't have an unexpected end of data error
		this._source.resume();

		// change bitrate in case of nightcore setting
		let bitrate = 48000;
		this._source.setChunkTiming(100);
		if (this.audioSettings.nightcore && !this._source.song.live) {
			bitrate = 64000;
			this._source.setChunkTiming(75);
		}

		// create new ffmpeg process with new settings
		this._shouldEnd = false;
		try { this._audioFilter.kill('SIGINT'); } catch { /* */ }
		this._audioFilter = ffmpeg(this._audioFilterInput)
			.inputOptions([
				'-f s16le',
				`-ar ${bitrate}`,
				'-ac 2'
			])
			.audioFilters('loudnorm=I=-32')
			.audioChannels(2)
			.audioFrequency(48000)
			.outputFormat('s16le')
			.on('error', (error) => {
				if (error.toString().indexOf('SIGINT') !== -1) return;

				this.error(`FFmpeg encountered {error: ${error}} while applying audio effects to song with {url: ${this._source.song.url}} using {audioSettings: ${JSON.stringify(this.audioSettings, null, 4)}}`);
				this.events.emit('error', 'Error while applying audio effects');
			});

		this._audioFilter.pipe()
			.once('data', () => {
				if (!this.vcPlayer.paused) { this.vcPlayer.resume(); }
				else { this._source.pause(); }
				this._shouldEnd = true;
			})
			.on('data', (data) => { this._audioConverterInput.write(data); })
			.on('end', () => {
				if (this._shouldEnd) { this._audioConverterInput.end(); }
				this._shouldEnd = true;
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
		this._source = source;
		this._audioFilterInput = new PassThrough();
		this._audioConverterInput = new PassThrough();
		this._opusPassthrough = new PassThrough();

		pcmPassthrough.pipe(this._audioFilterInput);

		this.newFFmpeg();
		this._audioConverter = ffmpeg(this._audioConverterInput)
			.inputOptions([
				'-f s16le',
				'-ar 48000',
				'-ac 2'
			])
			.outputFormat('opus')
			.on('error', (error) => {
				if (error.toString().indexOf('SIGINT') !== -1) return;

				this.error(`FFmpeg encountered {error: ${error}} while converting song with {url: ${this._source.song.url}} from pcm to opus`);
				this.events.emit('error', 'Error while converting opus to pcm');
			});

		this._audioConverter.pipe(this._opusPassthrough);

		// if new audioSettings are applied restart ffmpeg
		this.audioSettings.events.on('newSettings', () => {
			this.debug('New audio settings, restarting ffmpeg...');
			this.newFFmpeg();
		});

		return this._opusPassthrough;
	}

	/**
	 * destroy()
	 * 
	 * Stops ffmpeg and closes streams gracefully
	 */
	destroy() {
		try { this._audioFilter.kill('SIGINT'); } catch { /* */ }
		try { this._audioConverter.kill('SIGINT'); } catch { /* */ }
		this._audioFilterInput.end();
		this._audioConverterInput.end();
		this._opusPassthrough.end();
		this.events.removeAllListeners();
	}
}