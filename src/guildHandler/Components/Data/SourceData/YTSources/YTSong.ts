import * as ytdl from 'ytdl-core';

import Song from '../Song';
import GuildComponent from '../../../GuildComponent';
import type GuildHandler from '../../../../GuildHandler';
import { SongConfig, SONG_DEFAULT } from '../sourceConfig';

/**
 * Song
 *
 * Represents a song
 */
export default class YTSong extends GuildComponent implements Song {
	private _songInfo: SongConfig;

	/**
	 * @param guildHandler
	 * @param info - songInfo of song you want to create
	 */
	constructor(guildHandler: GuildHandler, info: SongConfig) {
		super(guildHandler);
		// set defaults
		this._songInfo = {};
		Object.assign(this._songInfo, SONG_DEFAULT);

		this._songInfo.type = 'yt';
		this._songInfo.id = this.data.guildSettings.songIdCount;
		this.data.guildSettings.songIdCount++;

		Object.assign(this._songInfo, info);
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
		console.log(this);
	}

	/**
	* export()
	* 
	* Exports the settings in the format to be saved in database
	* @returns object to be saved in database
	*/
	export() { return this._songInfo; }

	// getters
	get id() { return this._songInfo.id; }
	get type() { return this._songInfo.type; }
	get url() { return this._songInfo.url; }
	get title() { return this._songInfo.title; }
	get duration() { return this._songInfo.duration; }
	get thumbnailURL() { return this._songInfo.thumbnailURL; }
	get artist() { return this._songInfo.artist; }
	get live() { return this._songInfo.live; }
	get reqBy() { return this._songInfo.reqBy; }
}
