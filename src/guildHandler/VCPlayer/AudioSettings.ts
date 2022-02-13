import { EventEmitter } from 'events';

import PRESETS from './audioPresets';

/**
 * AudioSettings
 * 
 * Contains bot's audio settings for playback
 * Emits 'newSettings' event when settings are changed
 */
export default class AudioSettings extends EventEmitter {
	volume: number;
	bitrate: number;
	normalize: boolean;
	nightcore: boolean;
	eq: {
		name: string,
		eq: Array<{ [key: string]: number }>;
	};

	/**
	 * @param settings - object containing audio settings
	 */
	constructor(settings: { 
		volume?: number, 
		normalize?: boolean, 
		eq?: {
			name: string,
			eq: Array<{ [key: string]: number }>, 
		}
		nightcore?: boolean 
	}) {
		super();
		Object.assign(this, PRESETS.default);
		Object.assign(this, settings);
	}

	/**
	 * newSettings()
	 * 
	 * Replaces settings with given settings and emits 'newSettings' event
	 * @param settings - object containing audio settings
	 */
	newSettings(settings: { 
		volume?: number, 
		normalize?: boolean, 
		eq?: {
			name: string,
			eq: Array<{ [key: string]: number }>, 
		}
		nightcore?: boolean 
	}) {
		Object.assign(this, settings);
		this.emit('newSettings');
	}
}