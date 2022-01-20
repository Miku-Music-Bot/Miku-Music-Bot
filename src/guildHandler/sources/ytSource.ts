import { GuildComponent } from '../guildComponent.js';
import type { Song } from '../guildData/song.js';
import type { GuildHandler } from '../guildHandler.js';

/**
 * YTSource
 *
 * Handles getting audio from a yt source
 */
class YTSource extends GuildComponent {
	song: Song;

	/**
	 *
	 * @param {GuildHandler} guildHandler
	 * @param {Song} song
	 */
	constructor(guildHandler: GuildHandler, song: Song) {
		super(guildHandler);
		this.song = song;
	}
}

module.exports = YTSource;
