import * as Discord from 'discord.js';
import ytsr = require('ytsr');
import GuildHandler from '../GuildHandler';
import Song from './Data/SourceData/Song';
import YTSong from './Data/SourceData/YTSources/YTSong';
import GuildComponent from './GuildComponent';

type SearchResults = {
	searchString: string,
	items: Array<Song>
	indexes: {
		savedGD: {
			loc: number,
			items: number
		},
		savedYT: {
			loc: number,
			items: number
		},
		ytSearch: {
			loc: number,
			items: number
		}
	}
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

	/**
	 * search()
	 * 
	 * Runs search and sends search UI
	 * @param searchString - String to use to search
	 */
	async search(searchString: string) {
		try {
			const searchResults: SearchResults = {
				searchString,
				items: [],
				indexes: null
			};

			const savedResults = this.data.sourceManager.searchSaved(searchString);
			// add to results
			searchResults.indexes.savedGD = {
				loc: searchResults.items.length,
				items: savedResults.gd.length
			};
			searchResults.items.push(...savedResults.gd);
			searchResults.indexes.savedYT = {
				loc: searchResults.items.length,
				items: savedResults.yt.length
			};
			searchResults.items.push(...savedResults.yt);

			const ytsrResults = await ytsr(searchString, { limit: 50 });
			// filter out non video and premiers
			const filteredYTResults: ytsr.Video[] = ytsrResults.items.filter((result) => result.type === 'video' && !result.isUpcoming) as ytsr.Video[];
			// add to results
			searchResults.indexes.ytSearch = {
				loc: searchResults.items.length,
				items: filteredYTResults.length
			};
			searchResults.items.push(...filteredYTResults.map((result) => {
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
			}));

			this._sendSearchUI(searchResults);
		}
		catch (error) {
			const errorId = this.ui.sendError(`Error while searching using search string: "${searchString}"`, true);
			this.error(`{error: ${error}} while searching for songs using {searchString: ${searchString}}, {errorId: ${errorId}}`);
		}
	}

	/**
	 * 
	 * @param results - Search results to display
	 * @param page - Page to show
	 * @returns 
	 */
	private _sendSearchUI(searchResults: SearchResults, page?: number) {
		if (!page) { page = 1; }

		// Make sure page is in the right range
		const maxPage = Math.ceil(searchResults.items.length / 5);
		if (page > maxPage) { page = maxPage; }
		if (page < 1) { page = 1; }

		//const ytPageStart = Math.ceil((results.savedResults.gd.length + results.savedResults.yt.length) / 5);
		const indexStart = (page - 1) * 5;

		let displayText = '';
		for (let i = 0; i < 5; i++) {
			const loc = indexStart + i;

			// Add headers when appropriate, add 'nothing found' if that group has nothing in it
			if (loc === searchResults.indexes.savedGD.loc) {
				displayText += '__**Saved Songs - Google Drive**__\n\n';
				if (searchResults.indexes.savedGD.items === 0) { displayText += 'Nothing Found!'; }
			}
			if (loc === searchResults.indexes.savedYT.loc) {
				displayText += '__**Saved Songs - Youtube**__\n\n';
				if (searchResults.indexes.savedYT.items === 0) { displayText += 'Nothing Found!'; }
			}
			if (loc === searchResults.indexes.ytSearch.loc) {
				displayText += '__**Youtube Search Results**__\n\n';
				if (searchResults.indexes.ytSearch.items === 0) { displayText += 'Nothing Found!'; }
			}

			// Add approprit song to display
			if (loc >= searchResults.items.length) {
				// Number label
				displayText += (i + 1).toString() + '\n';

				const song = searchResults.items[loc];

				// set title of song in bold
				displayText += `**${song.title}**`;

				switch (song.type) {
					case ('yt'): {
						// Url, artist, and duration should all exist on youtube sources
						displayText += `Url: **${song.url}**\n`;
						displayText += `Uploaded By: **${song.artist}**\n`;
						displayText += `Duration: **${song.duration}**\n`;
						break;
					}
					case ('gd'): {
						// Artist and duration might not exist
						if (song.artist) { displayText += `Artist: **${song.artist}**\n`; }
						else { displayText += 'Artist: *unknown*\n'; }

						if (song.duration) { displayText += `Duration: **${song.duration}**\n`; }
						else { displayText += 'Duration: *unknown*\n'; }
					}
				}
				displayText += '\n';
			}
			else { break; }
		}

		const searchUI = new Discord.MessageEmbed()
			.setTitle(`Search results for: ${searchResults.searchString}`)
			.setDescription(displayText)
			.setFooter({ text: `Page ${page} of ${maxPage}` });

		this.ui.sendEmbed({ embeds: [searchUI] });
	}
}