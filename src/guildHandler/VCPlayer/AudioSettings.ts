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
	nightcore: boolean;
	eq: Array<{ [key: string]: number }>;

	/**
	 * @param settings - object containing audio settings
	 */
	constructor(settings: { volume?: number, normalize?: boolean, eq?: Array<{ [key: string]: number }>, nightcore?: boolean }) {
		super();
		this.volume = settings.volume ? settings.volume : 1;
		this.normalize = settings.normalize ? settings.normalize : true;
		this.eq =  settings.eq ? settings.eq : [];
		this.nightcore = settings.nightcore ? settings.nightcore : false;
	}

	/**
	 * newSettings()
	 * 
	 * Replaces settings with given settings and emits 'newSettings' event
	 * @param settings - object containing audio settings
	 */
	newSettings(settings: { volume: number, normalize: boolean, eq: Array<{ [key: string]: number }> }) {
		this.volume = settings.volume ? settings.volume : this.volume;
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
		this.normalize = true;
		this.eq = [];
		this.nightcore = false;
	}
}