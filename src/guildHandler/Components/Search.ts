import * as Discord from 'discord.js';
import ytsr = require('ytsr');
import GuildHandler from '../GuildHandler';
import Song from './Data/SourceData/Song';
import YTSong from './Data/SourceData/YTSources/YTSong';
import GuildComponent from './GuildComponent';

type SearchResults = {
	searchString: string,
	savedResults: {
		gd: Array<Song>
		yt: Array<Song>
	},
	ytSearch: Array<Song>
}

/**
 * Search
 * 
 * Handles saerching for guild
 */
export default class Search extends GuildComponent {
	/**
	 * @param guildHandler 
	 */
	constructor(guildHandler: GuildHandler) { super(guildHandler); }

	async search(searchString: string) {
		try {
			const results: SearchResults = {
				searchString,
				savedResults: null,
				ytSearch: null
			};

			results.savedResults = this.data.sourceManager.searchSaved(searchString);

			const ytsrResults = await ytsr(searchString, { limit: 50 });
			// filter out non video and premiers
			const filteredYTResults: ytsr.Video[] = ytsrResults.items.filter((result) => result.type === 'video' && !result.isUpcoming) as ytsr.Video[];
			results.ytSearch = filteredYTResults.map((result) => {
				let durationSec = 0;
				const durationParts = result.duration.split(':');
				const durationMultipliers = [1, 60, 3600, 86400];
				let multiplierIndex = 0;
				for (let i = durationParts.length - 1; i >= 0; i--) {
					durationSec += parseInt(durationParts[i]) * durationMultipliers[multiplierIndex];
					multiplierIndex++;
				}

				return new YTSong(this.guildHandler, {
					title: result.title,
					url: result.url,
					thumbnailURL: result.bestThumbnail.url,
					artist: result.author.name,
					duration: durationSec,
					live: result.isLive
				});
			});

			this._sendSearchUI(results);
		}
		catch (error) {
			const errorId = this.ui.sendError(`Error while searching using search string: "${searchString}"`, true);
			this.error(`{error: ${error}} while searching for songs using {searchString: ${searchString}}, {errorId: ${errorId}}`);
		}
	}

	private _sendSearchUI(results: SearchResults, page?: number) {
		if (!page) { page = 1; }

		// Make sure page is in the right range
		const maxPage = Math.ceil((results.savedResults.gd.length + results.savedResults.yt.length + results.ytSearch.length) / 5);
		if (page > maxPage) { page = maxPage; } 
		if (page < 1) { page = 1; }

		const searchUI = new Discord.MessageEmbed()
			.setTitle(`Search results for: ${results.searchString}`)
			.setDescription('');
		return searchUI;
	}
}