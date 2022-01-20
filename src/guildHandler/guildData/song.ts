import * as ytdl from 'ytdl-core';

import { GuildComponent } from '../guildComponent.js';
import type { GuildHandler } from '../guildHandler.js';

const BOT_DOMAIN = process.env.BOT_DOMAIN;

/**
 * Song
 *
 * Represents a song
 */
export class Song extends GuildComponent {
	title: string;
	duration: number;
	artist: string;
	thumbnailURL: string;
	type: string;
	link: string;
	optional: object;

	/**
	 * @param {GuildHandler} guildHandler
	 * @param {string} type - type of source for the song, options: "google drive", "soundcloud", "youtube"
	 * @param {string} link - url to the source of the song
	 * @param {object} optional - any additional options needed
	 */
	constructor(guildHandler: GuildHandler, type: string, link: string, optional: object) {
		super(guildHandler);

		// set defaults for song
		this.title = 'No Title';
		this.duration = 0;
		this.artist = 'No Artist';
		this.thumbnailURL = `${BOT_DOMAIN}/default-thumbnail.jpg`;
		this.type = type;
		this.link = link;
		this.optional = optional;
	}

	async fetchData(): Promise<void> {
		if (this.type === 'youtube') {
			ytdl.getInfo(this.link)
				.then((info) => {
					this.title = info.videoDetails.title;
					this.duration = parseInt(info.videoDetails.lengthSeconds);
					this.artist = info.videoDetails.author.name;
					this.thumbnailURL = info.thumbnail_url;
					return;
				})
				.catch((error) => {
					this.error(`{error: ${error}} while fetching data for song with {link: ${this.link}}`);
					return;
				});
		}
	}
}
