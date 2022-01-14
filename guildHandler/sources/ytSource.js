//const ytdl = require('ytdl-core');
const path = require('path');

const GuildComponent = require(path.join(__dirname, 'guildComponent.js'));

/**
 * YTSource
 * 
 * Handles getting audio from a yt source
 */
class YTSource extends GuildComponent {
	/**
	 * 
	 * @param {GuildHandler} guildHandler 
	 * @param {Song} song 
	 */
	constructor (guildHandler, song) {
		super(guildHandler);
		this.song = song;
	}
}

module.exports = YTSource;