import * as ytdl from 'ytdl-core';

import Song from '../Song';
import GuildComponent from '../../../GuildComponent.js';
import type GuildHandler from '../../../GuildHandler.js';

const BOT_DOMAIN = process.env.BOT_DOMAIN;

type songInfo = {
	type?: string,
	url: string,
	title?: string,
	duration?: number,
	thumbnailURL?: string,
	artist?: string,
	live?: boolean,
	reqBy?: string
}

const songDefaults: songInfo = {
	url: 'OVERRIDE THIS',
	title: 'No Title',
	duration: undefined,
	thumbnailURL: `${BOT_DOMAIN}/default-thumbnail.jpg`,
	artist: 'unknown',
	live: true,
	reqBy: undefined
};

/**
 * Song
 *
 * Represents a song
 */
export default class YTSong extends GuildComponent implements Song {
	private _songInfo: songInfo;

	/**
	 * @param guildHandler
	 * @param info - songInfo of song you want to create
	 */
	constructor(guildHandler: GuildHandler, info: songInfo) {
		super(guildHandler);
		this._songInfo = songDefaults;

		Object.assign(this._songInfo, info);
		this._songInfo.type = 'yt';
	}

	/**
	 * fetchdata
	 * 
	 * Grabs updated 
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
			console.log(error);
			this.error(`{error: ${error}} while updating info for song with {url: ${this._songInfo.url}}`);
		}
	}

	// getters
	get type() { return this._songInfo.type; }
	get url() { return this._songInfo.url; }
	get title() { return this._songInfo.title; }
	get duration() { return this._songInfo.duration; }
	get thumbnailURL() { return this._songInfo.thumbnailURL; }
	get artist() { return this._songInfo.artist; }
	get live() { return this._songInfo.live; }
	get reqBy() { return this._songInfo.reqBy; }
}
