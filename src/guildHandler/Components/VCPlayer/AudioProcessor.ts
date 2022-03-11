import * as path from 'path';
import { PassThrough } from 'stream';
import ffmpeg = require('fluent-ffmpeg');
import ffmpegPath = require('ffmpeg-static');
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

import type GuildHandler from '../../GuildHandler';
import GuildComponent from '../GuildComponent';
import type AudioSource from './AudioSources/AudioSource';

ffmpeg.setFfmpegPath(ffmpegPath);

type EventTypes = {
	fatalError: (errorMsg: string) => void,
}

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
	events: EventEmitter;								// for events
	private _source: AudioSource;						// current source

	private _shouldEnd: boolean;						// should stop audioConverter output stream end when audioFilter input ends
	private _audioFilter: ffmpeg.FfmpegCommand;			// applies audio effects
	private _audioConverter: ffmpeg.FfmpegCommand;		// converts pcm audio to opus for discord
	private _audioFilterInput: PassThrough;
	private _audioConverterInput: PassThrough;
	private _opusPassthrough: PassThrough;				// output stream

	/**
	 * @param guildHandler - guildHandler object
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler, path.basename(__filename));
		this.events = new EventEmitter() as TypedEmitter<EventTypes>;
		this._shouldEnd = true;
	}

	/**
	 * newFFmpeg()
	 * 
	 * Creates a new ffmpeg instance using updated settings
	 */
	newFFmpeg(): void {
		this.info('Restarting audio filter');

		// pause audio player while changing ffmpeg
		this.vcPlayer.pauseAudioPlayer();

		// change bitrate in case of nightcore setting
		let freq = AUDIO_FREQUENCY;
		this._source.setChunkTiming(CHUNK_TIMING);
		if (this.data.audioSettings.nightcore && !this._source.song.live) {
			this.debug('Nightcore is enabled and song is not live');
			freq = NIGHTCORE_AUDIO_FREQUENCY;
			this._source.setChunkTiming(NIGHTCORE_CHUNK_TIMING);
		}

		// create new ffmpeg process with new settings
		this._shouldEnd = false;
		if (this._audioFilter) {
			this.debug('Attempting to stop audioFilter process');
			try { this._audioFilter.kill('SIGINT'); }
			catch (error) { this.warn(`{error:${error}} when trying to kill audioFilter`); }
		}

		// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<< this should be updated to use audio settings
		const audioFilters = 'loudnorm=I=-16:TP=-1.5:LRA=11';
		this.debug(`Creating new audioFilter with arguments: {format:${PCM_FORMAT}}, {sampleFrequency:${freq}}, {audioChannels:${AUDIO_CHANNELS}}, and {audioFilters:${audioFilters}}`);
		this._audioFilter = ffmpeg(this._audioFilterInput)
			.inputOptions([
				`-f ${PCM_FORMAT}`,
				`-ar ${freq}`,
				`-ac ${AUDIO_CHANNELS}`
			])
			.audioFilters(audioFilters)
			.audioChannels(AUDIO_CHANNELS)
			.audioFrequency(AUDIO_FREQUENCY)
			.outputFormat(PCM_FORMAT)
			.on('start', (command) => { this.debug(`Started audioFilter ffmpeg process with {command:${command}}`); })
			.on('error', (error) => {
				if (error.toString().indexOf('SIGINT') !== -1) return;

				this.error(`AudioFilter ffmpeg process encountered {error: ${error.message}} while applying audio effects to song with {url: ${this._source.song.url}}. {stack:${error.stack}}`);
				this.events.emit('fatalError', 'Error while applying audio effects');
			});

		this._audioFilter.pipe()
			.once('data', () => {
				this.debug('First bit of data from audioFilter ffmpeg process recieved');
				if (!this.vcPlayer.paused) {
					this.debug('VCPlayer was not paused before, resuming playback');
					this.vcPlayer.resume();
				}
				else {
					this.debug('VCPlayer was paused before, making sure song is paused');
					this._source.pause();
				}
				this._shouldEnd = true;
			})
			.on('data', (data) => { this._audioConverterInput.write(data); })
			.on('error', (error) => { this.error(`{error:${error.message}} on _audioFilter for song with {url:${this._source.song.url}}. {stack:${error.stack}}`); })
			.on('end', () => {
				this.debug('AudioFilter ffmpeg process ended');
				if (this._shouldEnd) {
					this.debug('Output should end, ending output');
					this._audioConverterInput.end();
				}
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
	processStream(pcmPassthrough: PassThrough, source: AudioSource): PassThrough {
		// create passthrough streams
		this._source = source;
		this._audioFilterInput = new PassThrough();
		this._audioFilterInput.on('error', (error) => { this.error(`{error:${error.message}} on _audioFilterInput for song with {url:${this._source.song.url}}. {stack:${error.stack}}`); });

		this._audioConverterInput = new PassThrough();
		this._audioConverterInput.on('error', (error) => { this.error(`{error:${error.message}} on _audioConverterInput for song with {url:${this._source.song.url}}. {stack:${error.stack}}`); });

		this._opusPassthrough = new PassThrough();
		this._opusPassthrough.on('error', (error) => { this.error(`{error:${error.message}} on _opusPassthrough for song with {url:${this._source.song.url}}. {stack:${error.stack}}`); });

		// pipe pcm data to audioFilter's input
		pcmPassthrough.pipe(this._audioFilterInput);
		this.newFFmpeg();

		// create audioConverter ffmpeg process
		this.debug(`Creating new audioConverter with arguments: {format:${PCM_FORMAT}}, {sampleFrequency:${AUDIO_FREQUENCY}}, and {audioChannels:${AUDIO_CHANNELS}}`);
		this._audioConverter = ffmpeg(this._audioConverterInput)
			.inputOptions([
				`-f ${PCM_FORMAT}`,
				`-ar ${AUDIO_FREQUENCY}`,
				`-ac ${AUDIO_CHANNELS}`
			])
			.outputFormat('opus')
			.on('start', (command) => { this.debug(`Started audioConverter ffmpeg process with {command:${command}}`); })
			.on('error', (error) => {
				if (error.toString().indexOf('SIGINT') !== -1) {
					this.debug('udioConverter ffmpeg process ended with signal SIGINT, ignoring error');
					return;
				}
				this.error(`audioConverter ffmpeg process encountered {error: ${error.message}} while converting song with {url: ${this._source.song.url}} from pcm to opus. {stack:${error.stack}}`);
				this.events.emit('fatalError', 'Error while converting pcm to opus');
			});

		this._audioConverter.pipe()
			.on('data', (data) => { this._opusPassthrough.write(data); })
			.on('end', () => {
				this.debug('audioConverter output has ended, ending opusPassthrough');
				this._opusPassthrough.end();
			})
			.on('error', (error) => { this.error(`{error:${error.message}} on _audioConverter for song with {url:${this._source.song.url}}. {stack:${error.stack}}`); });

		// if new audioSettings are applied restart ffmpeg
		this.data.audioSettings.on('restartProcessor', () => {
			this.debug('New audio settings, restarting ffmpeg');
			this.newFFmpeg();
		});

		return this._opusPassthrough;
	}

	/**
	 * destroy()
	 * 
	 * Stops ffmpeg and closes streams gracefully
	 */
	destroy(): void {
		this.debug('Destroying audio processor');
		if (this._audioFilter) {
			this.debug('Attempting to stop audioFilter process');
			this._audioFilter.kill('SIGINT');
		}
		if (this._audioConverter) {
			this.debug('Attempting to stop audioConverter process');
			this._audioConverter.kill('SIGINT');
		}
		this._audioFilterInput.end();
		this._audioConverterInput.end();
		this._opusPassthrough.end();
		this.events.removeAllListeners();
		this.data.audioSettings.removeAllListeners('restartProcessor');
	}
}