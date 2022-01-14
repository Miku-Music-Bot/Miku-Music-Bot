const path = require('path');
const ytdl = require('ytdl-core');

const GuildComponent = require(path.join(__dirname, 'guildComponent.js'));

const BOT_DOMAIN = process.env.BOT_DOMAIN;

/**
 * Song
 * 
 * Represents a song
 */
class Song extends GuildComponent {
	/**
	 * @param {GuildHandler} guildHandler
	 * @param {string} type - type of source for the song, options: "google drive", "soundcloud", "youtube"
	 * @param {string} link - url to the source of the song
	 * @param {object} optional - any additional options needed
	 */
	constructor(guildHandler, type, link, optional) {
		super(guildHandler);

		// set defaults for song
		this.title = 'No Title';
		this.duration = undefined;
		this.artist = 'No Artist';
		this.thumbnailURL = `${BOT_DOMAIN}/default-thumbnail.jpg`;
		this.type = type;
		this.link = link;
		this.optional = optional;
	}

	fetchData() {
		return new Promise((resolve) => {
			if (this.type === 'youtube') {
				ytdl.getInfo(this.link)
					.then((info) => {
						this.title = info.videoDetails.title;
						this.duration = parseInt(info.videoDetails.lengthSeconds);
						this.artist = info.videoDetails.author.name;
						this.thumbnailURL = info.thumbnails;
						resolve();
					})
					.catch((error) => {
						this.error(`{error: ${error}} while fetching data for song with {link: ${this.link}}`);
						resolve();
					});
			}

		});
	}
}

module.exports = Song;