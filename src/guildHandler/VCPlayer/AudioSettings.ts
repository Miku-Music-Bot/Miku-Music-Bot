import { EventEmitter } from 'events';

/**
 * AudioSettings
 * 
 * Contains bot's audio settings for playback
 * Emits 'newSettings' event when settings are changed
 */
export class AudioSettings extends EventEmitter {
	volume: number;
	bitrate: number;
	normalize: boolean;
	eq: Array<{ [key: string]: number }>;

	/**
	 * @param settings - object containing audio settings
	 */
	constructor(settings: { volume?: number | undefined, bitrate?: number | undefined, normalize?: boolean | undefined, eq?: Array<{ [key: string]: number }> | undefined }) {
		super();
		this.volume = settings.volume ? settings.volume : 1;
		this.bitrate = settings.bitrate ? settings.bitrate : 44100;
		this.normalize = settings.normalize ? settings.normalize : true;
		this.eq =  settings.eq ? settings.eq : [];
	}

	/**
	 * newSettings()
	 * 
	 * Replaces settings with given settings and emits 'newSettings' event
	 * @param settings - object containing audio settings
	 */
	newSettings(settings: { volume: number | null, bitrate: number | null, normalize: boolean | null, eq: Array<{ [key: string]: number }> | null }) {
		this.volume = settings.volume ? settings.volume : this.volume;
		this.bitrate = settings.bitrate ? settings.bitrate : this.bitrate;
		this.normalize = settings.normalize ? settings.normalize : this.normalize;
		this.eq =  settings.eq ? settings.eq : this.eq;
		this.emit('newSettings');
	}

	/**
	 * resetDefaults()
	 * 
	 * Resets setting values to their defaults
	 */
	resetDefaults() {
		this.volume = 1;
		this.bitrate = 44100;
		this.normalize = true;
		this.eq = [];
	}
}