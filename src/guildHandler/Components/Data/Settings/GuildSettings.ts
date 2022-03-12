import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

import { GuildConfig, GUILD_DEFAULT } from './config/guildConfig';

type EventTypes = {
	newSettings: () => void,
}

/**
 * GuildSettings
 * 
 * Contains bot's guild settings
 * Emits 'newSettings' event when settings are changed
 */
export default class GuildSettings {
	events: TypedEmitter<EventTypes>;
	private _guildSettings: GuildConfig;

	/**
	 * @param settings - object containing audio settings
	 */
	constructor(settings?: GuildConfig) {
		this.events = new EventEmitter() as TypedEmitter<EventTypes>;
		// set defaults first
		this._guildSettings = Object.assign({}, GUILD_DEFAULT);

		// apply settings
		if (!settings) { 
			this.events.emit('newSettings'); 
			return;
		}
		Object.assign(this._guildSettings, settings);
	}

	/**
	 * export()
	 * 
	 * Exports the settings in the format to be saved in database
	 * @returns object to be saved in database
	 */
	export(): GuildConfig { return this._guildSettings; }

	// getters and setters
	get configured() { return this._guildSettings.configured; }
	set configured(configured: GuildConfig['configured']) { this._guildSettings.configured = configured; this.events.emit('newSettings'); }

	get channelId() { return this._guildSettings.channelId; }
	set channelId(channelId: GuildConfig['channelId']) { this._guildSettings.channelId = channelId; this.events.emit('newSettings'); }

	get prefix() { return this._guildSettings.prefix; }
	set prefix(prefix: GuildConfig['prefix']) { this._guildSettings.prefix = prefix; this.events.emit('newSettings'); }

	get autoplay() { return this._guildSettings.autoplay; }
	set autoplay(autoplay: GuildConfig['autoplay']) { this._guildSettings.autoplay = autoplay; this.events.emit('newSettings'); }

	get shuffle() { return this._guildSettings.shuffle; }
	set shuffle(shuffle: GuildConfig['shuffle']) { this._guildSettings.shuffle = shuffle; this.events.emit('newSettings'); } 

	get autoplayList() { return this._guildSettings.autoplayList; }
	set autoplayList(autoplayList: GuildConfig['autoplayList']) { this._guildSettings.autoplayList = autoplayList; this.events.emit('newSettings'); }

	get songIdCount() { return this._guildSettings.songIdCount; }
	set songIdCount(songIdCount: GuildConfig['songIdCount']) { this._guildSettings.songIdCount = songIdCount; this.events.emit('newSettings'); }

	get playlistIdCount() { return this._guildSettings.playlistIdCount; }
	set playlistIdCount(playlistIdCount: GuildConfig['playlistIdCount']) { this._guildSettings.playlistIdCount = playlistIdCount; this.events.emit('newSettings'); }
}