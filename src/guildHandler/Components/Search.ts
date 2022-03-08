import * as Discord from 'discord.js';
import ytdl = require('ytdl-core');
import ytpl = require('ytpl');
import ytsr = require('ytsr');
import { InteractionInfo } from '../GHChildInterface';
import GuildHandler from '../GuildHandler';
import Song from './Data/SourceData/Song';
import YTPlaylist from './Data/SourceData/YTSources/YTPlaylist';
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

const ITEMS_PER_PAGE = parseInt(process.env.ITEMS_PER_PAGE);
const MAX_YT_RESULTS = parseInt(process.env.MAX_YT_RESULTS);
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
	 * _searchSongs()
	 * 
	 * @param searchString - string to use to search
	 * @returns SearchResults object
	 */
	private async _searchSongs(searchString: string) {
		try {
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

			const ytsrResults = await ytsr(searchString, { limit: MAX_YT_RESULTS });
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
			return searchResults;
		}
		catch (error) {
			this.error(`{error:${error}} while searching for songs using {searchString:${searchString}}`);
			return undefined;
		}
	}

	/**
	 * _searchSongURL()
	 * 
	 * @param url - url to use to search
	 * @returns Song object or undefined
	 */
	private async _searchSongURL(url: string) {
		try {
			const ytInfo = await ytdl.getBasicInfo(url);
			if (ytInfo) { return new YTSong(this.guildHandler, { url, title: ytInfo.videoDetails.title }); }
			else { return undefined; }
		}
		catch (error) {
			this.debug(`{error:${error}} while validating song url using {url:${url}}`);
			return undefined;
		}
	}

	/**
	 * _searchPlaylistURL()
	 * 
	 * @param url - url to use to search
	 * @returns Playlist object or undefined
	 */
	private async _searchPlaylistURL(url: string) {
		try {
			const playlistInfo = await ytpl(url);
			if (playlistInfo) { return new YTPlaylist(this.guildHandler, { url }); }
			return undefined;
		}
		catch (error) {
			this.debug(`{error:${error}} whiel validating playlist url using {url:${url}}`);
			return undefined;
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
		const maxTitleLength = 70;
		if (!page) { page = 1; }

		// Make sure page is in the right range
		const maxPage = Math.ceil(searchResults.items.length / ITEMS_PER_PAGE);
		if (page > maxPage) { page = maxPage; }
		if (page < 1) { page = 1; }

		// find where in item list to start at
		const indexStart = (page - 1) * ITEMS_PER_PAGE;

		const numbers = new Discord.MessageActionRow();
		let displayText = '';
		for (let i = 0; i < ITEMS_PER_PAGE; i++) {
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
				let songTitle = song.title;
				if (song.title.length > maxTitleLength) {
					songTitle = song.title.slice(0, maxTitleLength - 3) + '...';
				}
				displayText += `**${this.ui.escapeString(songTitle)}**\n`;

				switch (song.type) {
					case ('yt'): {
						displayText += `Url: **${song.url}**\n`;
						displayText += `Uploaded By: **${this.ui.escapeString(song.artist)}**\n`;
						displayText += `Duration: **${song.durationString}**\n`;
						break;
					}
					case ('gd'): {
						let artist = song.artist;
						if (song.artist.length > maxTitleLength) {
							artist = song.artist.slice(0, maxTitleLength - 3) + '...';
						}
						displayText += `Url: **${song.url}**\n`;
						displayText += `Artist: **${this.ui.escapeString(artist)}**\n`;
						displayText += `Duration: **${song.durationString}**\n`;
						break;
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
			.setTitle(`Search results for: ${this.ui.escapeString(searchResults.searchString.slice(0, 50))}`)
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
					.setCustomId(JSON.stringify({ type: 'page', pageNum: Math.floor(searchResults.indexes.ytSearch.loc / ITEMS_PER_PAGE) + 1, special: 3 }))
					.setStyle('PRIMARY')
					.setDisabled(page === Math.floor(searchResults.indexes.ytSearch.loc / ITEMS_PER_PAGE) + 1)
			)
			.addComponents(
				new Discord.MessageButton()
					.setLabel('Done')
					.setCustomId(JSON.stringify({ type: 'close', special: 4 }))
					.setStyle('PRIMARY')
			);
		return { embeds: [searchUI], components: [numbers, navigation] };
	}

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
						case ('select'): {
							searchResults.items[customId.index].reqBy = interaction.authorId;
							this.queue.addQueue([searchResults.items[customId.index]]);
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

			const searchURLResult = await this._searchSongURL(searchString);
			if (searchURLResult) {
				this.queue.addQueue([searchURLResult]);
				// if not playing anything, start playing fron queue
				if (!this.vcPlayer.playing) { this.queue.nextSong(); }

				this.ui.deleteMsg(this.data.guildSettings.channelId, await id);
				this.ui.updateUI();
				return;
			}
			const searchPlaylistURLResult = await this._searchPlaylistURL(searchString);
			if (searchPlaylistURLResult) {
				await searchPlaylistURLResult.fetchData();
				const songs = searchPlaylistURLResult.getAllSongs();
				this.queue.addQueue(songs);

				// if not playing anything, start playing fron queue
				if (!this.vcPlayer.playing) { this.queue.nextSong(); }

				this.ui.deleteMsg(this.data.guildSettings.channelId, await id);
				this.ui.updateUI();
				return;
			}
			const searchResults = await this._searchSongs(searchString);

			if (searchResults) {
				this.ui.updateMsg(this.data.guildSettings.channelId, await id, this._createSearchUI(searchResults));
			}
			else {
				this.ui.updateMsg(this.data.guildSettings.channelId, await id, {
					embeds: [new Discord.MessageEmbed().setTitle('Error while searching')]
				});
			}
		}
		catch (error) {
			const errorId = this.ui.sendError(`Error while searching using search string: "${searchString}"`, true);
			this.error(`{error: ${error}} while searching for songs using {searchString: ${searchString}}, {errorId: ${errorId}}`);
		}
	}
}