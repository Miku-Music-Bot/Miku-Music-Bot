import * as ytdl from 'ytdl-core';
import { EventEmitter } from 'events';

import Song from '../Song';
import GuildComponent from '../../../GuildComponent';
import type GuildHandler from '../../../../GuildHandler';
import { SongConfig, SONG_DEFAULT } from '../sourceConfig';

/**
 * YTSong
 *
 * Represents a song from youtube
 */
export default class YTSong extends GuildComponent implements Song {
	events: EventEmitter;
	private _songInfo: SongConfig;

	/**
	 * @param guildHandler
	 * @param info - songInfo of song you want to create
	 */
	constructor(guildHandler: GuildHandler, info: SongConfig) {
		super(guildHandler);
		this.events = new EventEmitter();

		// set defaults
		let save = false;
		this._songInfo = Object.assign({}, SONG_DEFAULT);
		this._songInfo.type = 'yt';
		if (!info.id) {
			save = true;
			this._songInfo.id = this.data.guildSettings.songIdCount;
			this.data.guildSettings.songIdCount++;
		}
		Object.assign(this._songInfo, info);

		if (save) { setImmediate(() => { this.events.emit('newSettings', this); }); }
	}

	/**
	 * fetchData()
	 * 
	 * Grabs updated info for song
	 */
	async fetchData(): Promise<void> {
		try {
			const info = await ytdl.getBasicInfo(this._songInfo.url);
			if (!info) {
				this.info(`No song info found for song with {url: ${this._songInfo.url}}`);
				return;
			}
			this._songInfo.title = info.videoDetails.title;
			this._songInfo.url = info.videoDetails.video_url;
			this._songInfo.duration = parseInt(info.videoDetails.lengthSeconds);

			info.videoDetails.thumbnails.sort((a, b) => (a.width > b.width) ? -1 : 1);
			this._songInfo.thumbnailURL = info.videoDetails.thumbnails[0].url;
			this._songInfo.artist = info.videoDetails.author.name;
			this._songInfo.live = info.videoDetails.isLiveContent;
		}
		catch (error) {
			this.error(`{error: ${error}} while updating info for song with {url: ${this._songInfo.url}}`);
		}
	}

	/**
	* export()
	* 
	* Exports the settings in the format to be saved in database
	* @returns object to be saved in database
	*/
	export(): SongConfig {
		const info = Object.assign({}, this._songInfo);
		info.reqBy = '';
		return info;
	}

	// getters
	get id() { return this._songInfo.id; }
	get type() { return this._songInfo.type; }
	get url() { return this._songInfo.url; }
	get title() { return this._songInfo.title; }
	get duration() { return this._songInfo.duration; }
	get thumbnailURL() { return this._songInfo.thumbnailURL; }
	get artist() { return this._songInfo.artist; }
	get live() { return this._songInfo.live; }
	get durationString() {
		let secs = this._songInfo.duration;
		let hours: number | string = Math.floor(secs / 3600);
		if (hours < 10) { hours = '0' + hours.toString(); }
		secs %= 3600;
		let min: number | string = Math.floor(secs / 60);
		if (min < 10) { min = '0' + min.toString(); }
		secs %= 60;
		let sec: number | string = secs;
		if (sec < 10) { sec = '0' + sec.toString(); }
		return `${hours.toString()}:${min.toString()}:${secs.toString()}`;
	}
	get reqBy() { return this._songInfo.reqBy; }
	set reqBy(reqBy: string) { this._songInfo.reqBy = reqBy; }
}
