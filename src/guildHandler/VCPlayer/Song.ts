

import { GuildComponent } from '../GuildComponent.js';
import type { GuildHandler } from '../GuildHandler.js';

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
	url: string;
	live: boolean;
	optional: object;

	/**
	 * @param guildHandler
	 * @param type - type of source for the song, options: "gd", "yt"
	 * @param link - url to the source of the song
	 * @param optional - any additional options needed
	 */
	constructor(guildHandler: GuildHandler, type: string, url: string, live?: boolean, optional?: object) {
		super(guildHandler);

		// set defaults for song
		this.title = 'No Title';
		this.duration = 0;
		this.artist = 'No Artist';
		this.thumbnailURL = `${BOT_DOMAIN}/default-thumbnail.jpg`;
		this.type = type;
		this.url = url;
		this.live = live ? live : false;
		this.optional = optional;
	}

	async fetchData(): Promise<void> {
		//
	}
}
