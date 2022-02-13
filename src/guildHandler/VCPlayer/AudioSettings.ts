import { EventEmitter } from 'events';

import GuildComponent from '../GuildComponent';
import PRESETS from './sources/audioPresets';
import type GuildHandler from '../GuildHandler';

export type AudioSettingsConfig = {
	volume?: number,
	normalize?: boolean,
	eq?: {
		name: string,
		eq: Array<{ [key: string]: number }>,
	}
	nightcore?: boolean
}

/**
 * AudioSettings
 * 
 * Contains bot's audio settings for playback
 * Emits 'newSettings' event when settings are changed
 */
export default class AudioSettings extends GuildComponent {
	events: EventEmitter;
	private _audioSettings: {
		volume: number;
		bitrate: number;
		normalize: boolean;
		nightcore: boolean;
		eq: {
			name: string,
			eq: Array<{ [key: string]: number }>;
		};
	};

	/**
	 * @param settings - object containing audio settings
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
		Object.assign(this._audioSettings, PRESETS.default);
		Object.assign(this._audioSettings, this.data.audioSettings);
		this.data.audioSettings = this._audioSettings;
	}

	/**
	 * newSettings()
	 * 
	 * Replaces settings with given settings and emits 'newSettings' event
	 * @param settings - object containing audio settings
	 */
	newSettings(settings: AudioSettingsConfig) {
		Object.assign(this._audioSettings, settings);
		this.data.audioSettings = this._audioSettings;
		this.events.emit('newSettings');
	}

	// getters
	get volume() { return this._audioSettings.volume; }
	get bitrate() { return this._audioSettings.bitrate; }
	get normalize() { return this._audioSettings.normalize; }
	get nightcore() { return this._audioSettings.nightcore; }
	get eq() { return this._audioSettings.eq; }
}