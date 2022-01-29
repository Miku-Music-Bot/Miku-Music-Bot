

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
		//
	}
}
