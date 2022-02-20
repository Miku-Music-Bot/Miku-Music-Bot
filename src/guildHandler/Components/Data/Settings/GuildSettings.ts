import { EventEmitter } from 'events';

import { GuildConfig, GUILD_DEFAULT } from './config/guildConfig';

/**
 * GuildSettings
 * 
 * Contains bot's guild settings
 * Emits 'newSettings' event when settings are changed
 */
export default class GuildSettings extends EventEmitter {
	private _guildSettings: GuildConfig;

	/**
	 * @param settings - object containing audio settings
	 */
	constructor(settings?: GuildConfig) {
		super();

		// set defaults first
		this._guildSettings = {};
		Object.assign(this._guildSettings, GUILD_DEFAULT);

		// apply settings
		if (!settings) return;
		Object.assign(this._guildSettings, settings);
	}

	/**
	 * export()
	 * 
	 * Exports the settings in the format to be saved in database
	 * @returns object to be saved in database
	 */
	export() { return this._guildSettings; }

	// getters and setters
	get configured() { return this._guildSettings.configured; }
	set configured(configured: GuildConfig['configured']) { this._guildSettings.configured = configured; this.emit('newSettings'); }

	get channelId() { return this._guildSettings.channelId; }
	set channelId(channelId: GuildConfig['channelId']) { this._guildSettings.channelId = channelId; this.emit('newSettings'); }

	get prefix() { return this._guildSettings.prefix; }
	set prefix(prefix: GuildConfig['prefix']) { this._guildSettings.prefix = prefix; this.emit('newSettings'); }

	get autoplay() { return this._guildSettings.autoplay; }
	set autoplay(autoplay: GuildConfig['autoplay']) { this._guildSettings.autoplay = autoplay; this.emit('newSettings'); }

	get autoplayList() { return this._guildSettings.autoplayList; }
	set autoplayList(autoplayList: GuildConfig['autoplayList']) { this._guildSettings.autoplayList = autoplayList; this.emit('newSettings'); }

	get songIdCount() { return this._guildSettings.songIdCount; }
	set songIdCount(songIdCount: GuildConfig['songIdCount']) { this._guildSettings.songIdCount = songIdCount; this.emit('newSettings'); }

	get playlistIdCount() { return this._guildSettings.playlistIdCount; }
	set playlistIdCount(playlistIdCount: GuildConfig['playlistIdCount']) { this._guildSettings.playlistIdCount = playlistIdCount; this.emit('newSettings'); }
}