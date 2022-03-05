import * as Discord from 'discord.js';
import ytsr = require('ytsr');
import { InteractionInfo } from '../GHChildInterface';
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
			const interactionHandler = async (interaction: InteractionInfo) => {
				try {
					const customId = JSON.parse(interaction.customId);
					
					switch (customId.type) {
						case ('page'): {
							await this.ui.updateMsg(interaction.parentChannelId, interaction.parentMessageId, this._createSearchUI(searchResults, customId.pageNum));
							break;
						}
						case ('close'): {
							await this.ui.deleteMsg(interaction.parentChannelId, interaction.parentMessageId);
							break;
						}
						case('select'): {
							searchResults.items[customId.index].reqBy = interaction.authorId;
							this.queue.addQueue(searchResults.items[customId.index]);
							// if not connected to vc, connect
							if (!this.vcPlayer.connected) {
								const joined = await this.vcPlayer.join(interaction.authorId);
								// should start playing from autoplay
								if (joined) { this.queue.nextSong(); }
								break;
							}

							// if not playing anything, start playing fron queue
							if (!this.vcPlayer.playing) { this.queue.nextSong(); }
							break;
						}
						default: { return false; }
					}
					return true;
				}
				catch (error) {
					this.warn(`{error: ${error}} while handling {interaction: ${JSON.stringify(interaction)}}`);
					return false;
				}
			};

			const loadingMsg = new Discord.MessageEmbed().setTitle('Searching...');
			const id = this.ui.sendEmbed({ embeds: [loadingMsg] }, -1, interactionHandler);

			const searchResults: SearchResults = {
				searchString,
				items: [],
				indexes: {
					savedGD: null,
					savedYT: null,
					ytSearch: null
				}
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

				if (result.duration) {
					const durationParts = result.duration.split(':');
					const durationMultipliers = [1, 60, 3600, 86400];
					let multiplierIndex = 0;
					for (let i = durationParts.length - 1; i >= 0; i--) {
						durationSec += parseInt(durationParts[i]) * durationMultipliers[multiplierIndex];
						multiplierIndex++;
					}
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

			this.ui.updateMsg(this.data.guildSettings.channelId, await id, this._createSearchUI(searchResults));
		}
		catch (error) {
			const errorId = this.ui.sendError(`Error while searching using search string: "${searchString}"`, true);
			this.error(`{error: ${error}} while searching for songs using {searchString: ${searchString}}, {errorId: ${errorId}}`);
		}
	}

	/**
	 * _createSearchUI()
	 * 
	 * Generates the message embed for search
	 * @param results - Search results to display
	 * @param page - Page to show
	 * @returns discord message options for embed to send
	 */
	private _createSearchUI(searchResults: SearchResults, page?: number): Discord.MessageOptions {
		if (!page) { page = 1; }

		// Make sure page is in the right range
		const maxPage = Math.ceil(searchResults.items.length / 5);
		if (page > maxPage) { page = maxPage; }
		if (page < 1) { page = 1; }

		//const ytPageStart = Math.ceil((results.savedResults.gd.length + results.savedResults.yt.length) / 5);
		const indexStart = (page - 1) * 5;

		const numbers = new Discord.MessageActionRow();
		let displayText = '';
		for (let i = 0; i < 5; i++) {
			const loc = indexStart + i;

			// Add headers when appropriate, add 'nothing found' if that group has nothing in it
			if (loc === searchResults.indexes.savedGD.loc) {
				displayText += '__**Saved Songs - Google Drive**__\n\n';
				if (searchResults.indexes.savedGD.items === 0) { displayText += 'Nothing Found!\n\n'; }
			}
			if (loc === searchResults.indexes.savedYT.loc) {
				displayText += '__**Saved Songs - Youtube**__\n\n';
				if (searchResults.indexes.savedYT.items === 0) { displayText += 'Nothing Found!\n\n'; }
			}
			if (loc === searchResults.indexes.ytSearch.loc) {
				displayText += '__**Youtube Search Results**__\n\n';
				if (searchResults.indexes.ytSearch.items === 0) { displayText += 'Nothing Found!\n\n'; }
			}

			// Add approprite song to display
			if (loc < searchResults.items.length) {
				// Number label
				displayText += (i + 1).toString() + '\n';

				const song = searchResults.items[loc];

				// set title of song in bold
				displayText += `**${song.title}**\n`;

				switch (song.type) {
					case ('yt'): {
						// Url, artist, and duration should all exist on youtube sources
						displayText += `Url: **${song.url}**\n`;
						displayText += `Uploaded By: **${song.artist}**\n`;
						displayText += `Duration: **${song.durationString}**\n`;
						break;
					}
					case ('gd'): {
						// Artist and duration might not exist
						if (song.artist) { displayText += `Artist: **${song.artist}**\n`; }
						else { displayText += 'Artist: *unknown*\n'; }

						if (song.duration) { displayText += `Duration: **${song.durationString}**\n`; }
						else { displayText += 'Duration: *unknown*\n'; }
					}
				}
				displayText += '\n';

				numbers.addComponents(
					// Song selector button
					new Discord.MessageButton()
						.setLabel((i + 1).toString())
						.setCustomId(JSON.stringify({ type: 'select', index: loc.toString() }))
						.setStyle('SECONDARY')
				);
			}
			else { break; }
		}

		const searchUI = new Discord.MessageEmbed()
			.setTitle(`Search results for: ${searchResults.searchString}`)
			.setDescription(displayText)
			.setFooter({ text: `Page ${page} of ${maxPage}` });

		const navigation = new Discord.MessageActionRow()
			.addComponents(
				new Discord.MessageButton()
					.setLabel('<')
					.setCustomId(JSON.stringify({ type: 'page', pageNum: page - 1, special: 1 }))
					.setStyle('PRIMARY')
					.setDisabled(page === 1)
			)
			.addComponents(
				new Discord.MessageButton()
					.setLabel('>')
					.setCustomId(JSON.stringify({ type: 'page', pageNum: page + 1, special: 2 }))
					.setStyle('PRIMARY')
					.setDisabled(page === maxPage)
			)
			.addComponents(
				new Discord.MessageButton()
					.setLabel('>> Youtube Results')
					.setCustomId(JSON.stringify({ type: 'page', pageNum: Math.floor(searchResults.indexes.ytSearch.loc / 5) + 1, special: 3 }))
					.setStyle('PRIMARY')
					.setDisabled(page === Math.floor(searchResults.indexes.ytSearch.loc / 5) + 1)
			)
			.addComponents(
				new Discord.MessageButton()
					.setLabel('Done')
					.setCustomId(JSON.stringify({ type: 'close', special: 4 }))
					.setStyle('PRIMARY')
			);
		return { embeds: [searchUI], components: [numbers, navigation] };
	}
}