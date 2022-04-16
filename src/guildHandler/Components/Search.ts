import Discord from 'discord.js';
import path from 'path';
import ytdl = require('ytdl-core');
import ytpl = require('ytpl');
import ytsr = require('ytsr');

import { TEAL } from './UI';
import { InteractionInfo } from '../GHChildInterface';
import GuildHandler from '../GuildHandler';
import Song from './Data/SourceData/Song';
import YTPlaylist from './Data/SourceData/YTSources/YTPlaylist';
import YTSong from './Data/SourceData/YTSources/YTSong';
import GuildComponent from './GuildComponent';
import Playlist from './Data/SourceData/Playlist';

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
	private _msgId: string;		// message id of search message, undefined if not sent

	/**
	 * @param guildHandler 
	 */
	constructor(guildHandler: GuildHandler) { super(guildHandler, path.basename(__filename)); }

	/**
	 * _searchSongs()
	 * 
	 * @param searchString - string to use to search
	 * @returns SearchResults object
	 */
	private async _searchSongs(searchString: string): Promise<SearchResults | undefined> {
		try {
			this.debug(`Searching for songs using {searchString:${searchString}}`);
			const searchResults: SearchResults = {
				searchString,
				items: [],
				indexes: {
					savedGD: null,
					savedYT: null,
					ytSearch: null
				}
			};

			this.debug('Searching in saved songs');
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
			this.debug(`Found {results:${savedResults.gd.length}} songs in saved google drive songs`);
			this.debug(`Found {results:${savedResults.yt.length}} songs in saved youtube songs`);

			this.debug('Searching on youtube');
			const ytsrResults = await ytsr(searchString, { limit: this.config.MAX_YT_RESULTS });
			// filter out non video and premiers
			const filteredYTResults: ytsr.Video[] = ytsrResults.items.filter((result) => result.type === 'video' && !result.isUpcoming) as ytsr.Video[];
			this.debug(`Found {results:${filteredYTResults.length}} videos from youtube`);
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
			this.error(`{error:${error.message}} while searching for songs using {searchString:${searchString}}. {stack:${error.stack}}`);
			return undefined;
		}
	}

	/**
	 * _searchSongURL()
	 * 
	 * @param url - url to use to search
	 * @returns Song object or undefined
	 */
	private async _searchSongURL(url: string): Promise<Song | undefined> {
		try {
			// check to see if this is a valid youtube link
			this.debug(`Checking if {url:${url}} is a valid youtube url`);
			const ytInfo = await ytdl.getBasicInfo(url);
			if (ytInfo) {
				this.debug(`{url:${url}} was a youtube video with {title:${ytInfo.videoDetails.title}}`);
				return new YTSong(this.guildHandler, { url, title: ytInfo.videoDetails.title });
			}
			else { this.debug(`{url:${url}} was not a valid youtube video`); }
			return undefined;
		}
		catch (error) {
			this.warn(`{error:${error}} while validating song url using {url:${url}}`);
			return undefined;
		}
	}

	/**
	 * _searchPlaylistURL()
	 * 
	 * @param url - url to use to search
	 * @returns Playlist object or undefined
	 */
	private async _searchPlaylistURL(url: string): Promise<Playlist | undefined> {
		try {
			// Check to see if this is a valid youtube playlist link
			this.debug(`Checking if {url:${url}} is a valid youtube playlist url`);
			const playlistInfo = await ytpl(url);
			if (playlistInfo) {
				this.debug(`{url:${url}} was a youtube playlist with {title:${playlistInfo.title}}`);
				return new YTPlaylist(this.guildHandler, { url });
			}
			else { this.debug(`{url:${url}} was not a valid youtube playlist`); }
			return undefined;
		}
		catch (error) {
			this.warn(`{error:${error}} whiel validating playlist url using {url:${url}}`);
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
		if (!page) { page = 1; }

		// Make sure page is in the right range
		const maxPage = Math.ceil(searchResults.items.length / this.config.ITEMS_PER_PAGE);
		if (page > maxPage) { page = maxPage; }
		if (page < 1) { page = 1; }

		// find where in item list to start at
		const indexStart = (page - 1) * this.config.ITEMS_PER_PAGE;

		const numbers = new Discord.MessageActionRow();
		let displayText = '';
		for (let i = 0; i < this.config.ITEMS_PER_PAGE; i++) {
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
				if (song.title.length > this.config.MAX_SONG_INFO_LENGTH) {
					songTitle = song.title.slice(0, this.config.MAX_SONG_INFO_LENGTH - 3) + '...';
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
						if (song.artist.length > this.config.MAX_SONG_INFO_LENGTH) {
							artist = song.artist.slice(0, this.config.MAX_SONG_INFO_LENGTH - 3) + '...';
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
						.setDisabled(false)
				);
			}
			else {
				numbers.addComponents(
					// Song selector button
					new Discord.MessageButton()
						.setLabel((i + 1).toString())
						.setCustomId(JSON.stringify({ type: 'select', index: loc.toString() }))
						.setStyle('SECONDARY')
						.setDisabled(true)
				);
			}
		}

		const searchUI = new Discord.MessageEmbed()
			.setColor(TEAL)
			.setTitle(`Search results for: ${this.ui.escapeString(searchResults.searchString.slice(0, 50))}`)
			.setDescription(displayText)
			.setFooter({ text: `Page ${page} of ${maxPage}` });

		const navigation = new Discord.MessageActionRow()
			.addComponents(
				// Close button
				new Discord.MessageButton()
					.setLabel('Done')
					.setCustomId(JSON.stringify({ type: 'close', special: 0 }))
					.setStyle('PRIMARY')
			)
			.addComponents(
				// Prev page button
				new Discord.MessageButton()
					.setLabel('<')
					.setCustomId(JSON.stringify({ type: 'page', pageNum: page - 1, special: 1 }))
					.setStyle('PRIMARY')
					.setDisabled(page === 1)
			)
			.addComponents(
				// Next page button
				new Discord.MessageButton()
					.setLabel('>')
					.setCustomId(JSON.stringify({ type: 'page', pageNum: page + 1, special: 2 }))
					.setStyle('PRIMARY')
					.setDisabled(page === maxPage)
			)
			.addComponents(
				// Jump to youtube results button
				new Discord.MessageButton()
					.setLabel('>> Youtube Results')
					.setCustomId(JSON.stringify({ type: 'page', pageNum: Math.floor(searchResults.indexes.ytSearch.loc / this.config.ITEMS_PER_PAGE) + 1, special: 3 }))
					.setStyle('PRIMARY')
					.setDisabled(page === Math.floor(searchResults.indexes.ytSearch.loc / this.config.ITEMS_PER_PAGE) + 1)
			);

		return { embeds: [searchUI], components: [numbers, navigation] };
	}

	/**
	 * search()
	 * 
	 * Runs search and sends search UI
	 * @param searchString - String to use to search
	 */
	async search(searchString: string): Promise<void> {
		try {
			this.debug(`Started search process for {searchString:${searchString}}`);
			if (this._msgId) {
				this.debug('Previous search message exists, deleting it');
				this.ui.deleteMsg(this.data.guildSettings.channelId, this._msgId);
				this._msgId = undefined;
			}

			const interactionHandler = async (interaction: InteractionInfo): Promise<boolean> => {
				try {
					this.debug(`Handling interaction on search message with {messageId:${interaction.parentMessageId}} with {customId:${interaction.customId}}`);
					const customId = JSON.parse(interaction.customId);

					switch (customId.type) {
						case ('page'): {
							this.debug(`Recieved "page" interaction, showing {page:${customId.pageNum}}`);
							await this.ui.updateMsg(interaction.parentChannelId, interaction.parentMessageId, this._createSearchUI(searchResults, customId.pageNum));
							break;
						}
						case ('close'): {
							this.debug('Recieved "close" interaction, deleting message');
							await this.ui.deleteMsg(interaction.parentChannelId, interaction.parentMessageId);
							break;
						}
						case ('select'): {
							this.debug(`Recieved "select" interaction, selecting {index:${customId.index}}`);

							const song = searchResults.items[customId.index];
							song.reqBy = interaction.authorId;
							this.debug(`Setting song with {url:${song.url}} reqBy to {authorId:${interaction.authorId}}`);

							this.debug(`Adding song with {url:${song.url}} to the queue`);
							this.queue.addQueue([searchResults.items[customId.index]]);

							// if not connected to vc, connect
							if (!this.vcPlayer.connected) {
								this.info('Not in voice channel, joining');
								const joined = await this.vcPlayer.join(interaction.authorId);
								// should start playing from autoplay
								if (!joined) { this.warn('Failed to join voice channel, will not play song'); }
								break;
							}

							// if not playing anything, start playing fron queue
							if (!this.vcPlayer.playing) {
								this.info('Currently not playing a song, playing next song in queue');
								this.queue.nextSong();
							}
							break;
						}
						default: {
							this.warn(`Interaction with {customId:${interaction.customId}} was not handled in switch case`);
							return false;
						}
					}
					return true;
				}
				catch (error) {
					this.warn(`{error: ${error}} while handling {interaction: ${JSON.stringify(interaction)}}`);
					return false;
				}
			};

			const cancel = new Discord.MessageActionRow()
				.addComponents(
					new Discord.MessageButton()
						.setLabel('Cancel')
						.setCustomId(JSON.stringify({ type: 'close', special: 0 }))
						.setStyle('DANGER')
				);
			const loadingMsg = new Discord.MessageEmbed().setTitle('Searching...');
			this._msgId = await this.ui.sendEmbed({ embeds: [loadingMsg], components: [cancel] }, 15_000, interactionHandler);

			const searchURLResult = await this._searchSongURL(searchString);
			if (searchURLResult) {
				this.queue.addQueue([searchURLResult]);
				// if not playing anything, start playing fron queue
				if (!this.vcPlayer.playing) { this.queue.nextSong(); }

				this.ui.deleteMsg(this.data.guildSettings.channelId, this._msgId);
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

				this.ui.deleteMsg(this.data.guildSettings.channelId, this._msgId);
				this.ui.updateUI();
				return;
			}
			const searchResults = await this._searchSongs(searchString);

			if (searchResults) {
				this.debug('Searching successful, displaying results');
				this.ui.updateMsg(this.data.guildSettings.channelId, this._msgId, this._createSearchUI(searchResults));
			}
			else {
				this.debug('Searching failed, displaying error message');
				const close = new Discord.MessageActionRow()
					.addComponents(
						new Discord.MessageButton()
							.setLabel('Close')
							.setCustomId(JSON.stringify({ type: 'close', special: 0 }))
							.setStyle('DANGER')
					);
				this.ui.updateMsg(this.data.guildSettings.channelId, this._msgId, {
					embeds: [new Discord.MessageEmbed().setTitle('Error while searching')],
					components: [close]
				});
			}
		}
		catch (error) {
			const errorId = this.ui.sendError(`Error while searching using search string: "${searchString}"`, true);
			this.error(`{error: ${error.message}} while searching for songs using {searchString: ${searchString}}. {stack:${error.stack}} {errorId: ${errorId}}`);
		}
	}
}