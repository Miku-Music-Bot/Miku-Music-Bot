
import { PassThrough } from 'stream';
import ffmpeg = require('fluent-ffmpeg');
import ffmpegPath = require('ffmpeg-static');
import { EventEmitter } from 'events';

import type GuildHandler from '../../GuildHandler';
import GuildComponent from '../GuildComponent';
import type AudioSource from './AudioSources/AudioSource';

ffmpeg.setFfmpegPath(ffmpegPath);

const PCM_FORMAT = process.env.PCM_FORMAT;
const AUDIO_CHANNELS = parseInt(process.env.AUDIO_CHANNELS);
const CHUNK_TIMING = parseInt(process.env.CHUNK_TIMING);
const AUDIO_FREQUENCY = parseInt(process.env.AUDIO_FREQUENCY);
const NIGHTCORE_CHUNK_TIMING = parseInt(process.env.NIGHTCORE_CHUNK_TIMING);
const NIGHTCORE_AUDIO_FREQUENCY = parseInt(process.env.NIGHTCORE_AUDIO_FREQUENCY);

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
		let bitrate = AUDIO_FREQUENCY;
		this._source.setChunkTiming(CHUNK_TIMING);
		if (this.data.audioSettings.nightcore && !this._source.song.live) {
			bitrate = NIGHTCORE_AUDIO_FREQUENCY;
			this._source.setChunkTiming(NIGHTCORE_CHUNK_TIMING);
		}

		// create new ffmpeg process with new settings
		this._shouldEnd = false;
		try { this._audioFilter.kill('SIGINT'); } catch { /* */ }
		this._audioFilter = ffmpeg(this._audioFilterInput)
			.inputOptions([
				`-f ${PCM_FORMAT}`,
				`-ar ${bitrate}`,
				`-ac ${AUDIO_CHANNELS}`
			])
			.audioFilters('loudnorm=I=-32')
			.audioChannels(AUDIO_CHANNELS)
			.audioFrequency(AUDIO_FREQUENCY)
			.outputFormat(PCM_FORMAT)
			.on('error', (error) => {
				if (error.toString().indexOf('SIGINT') !== -1) return;

				this.error(`FFmpeg encountered {error: ${error}} while applying audio effects to song with {url: ${this._source.song.url}}`);
				this.events.emit('fatalError', 'Error while applying audio effects');
			});

		this._audioFilter.pipe()
			.once('data', () => {
				if (!this.vcPlayer.paused) { this.vcPlayer.resume(); }
				else { this._source.pause(); }
				this._shouldEnd = true;
			})
			.on('data', (data) => { this._audioConverterInput.write(data); })
			.on('error', (error) => { this.warn(`{error:${error}} on _audioFilter for song with {url:${this._source.song.url}}`); })
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
		this._audioFilterInput.on('error', (error) => { this.warn(`{error:${error}} on _audioFilterInput for song with {url:${this._source.song.url}}`); });

		this._audioConverterInput = new PassThrough();
		this._audioConverterInput.on('error', (error) => { this.warn(`{error:${error}} on _audioConverterInput for song with {url:${this._source.song.url}}`); });

		this._opusPassthrough = new PassThrough();
		this._opusPassthrough.on('error', (error) => { this.warn(`{error:${error}} on _opusPassthrough for song with {url:${this._source.song.url}}`); });

		pcmPassthrough.pipe(this._audioFilterInput);

		this.newFFmpeg();
		this._audioConverter = ffmpeg(this._audioConverterInput)
			.inputOptions([
				`-f ${PCM_FORMAT}`,
				`-ar ${AUDIO_FREQUENCY}`,
				`-ac ${AUDIO_CHANNELS}`
			])
			.outputFormat('opus')
			.on('error', (error) => {
				if (error.toString().indexOf('SIGINT') !== -1) return;

				this.error(`FFmpeg encountered {error: ${error}} while converting song with {url: ${this._source.song.url}} from pcm to opus`);
				this.events.emit('fatalError', 'Error while converting pcm to opus');
			});

		this._audioConverter.pipe()
			.on('data', (data) => { this._opusPassthrough.write(data); })
			.on('end', () => { this._opusPassthrough.end(); })
			.on('error', (error) => { this.warn(`{error:${error}} on _audioConverter for song with {url:${this._source.song.url}}`); });

		// if new audioSettings are applied restart ffmpeg
		this.data.audioSettings.on('restartProcessor', () => {
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
		this.data.audioSettings.removeAllListeners('restartProcessor');
	}
}