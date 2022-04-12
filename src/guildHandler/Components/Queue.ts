import Discord from 'discord.js';
import path from 'path';

import { TEAL } from './UI';
import GuildComponent from './GuildComponent';
import { type InteractionInfo } from '../GHChildInterface';
import type GuildHandler from '../GuildHandler';
import Song from './Data/SourceData/Song';

export default class Queue extends GuildComponent {
	private _played: Array<{ song: Song, save: boolean }> = [];
	private _advanced: Song[] = [];
	private _queue: Song[] = [];
	private _autoplay: Song[] = [];

	private _repeatSong = 0;
	private _repeatQueue = 0;

	private _msgId: string;

	private _nowPlayingSong: { song: Song, save: boolean } = { song: undefined, save: false };

	constructor(guildHandler: GuildHandler) { super(guildHandler, path.basename(__filename)); }

	/**
	 * @name resolveIndex()
	 * Converts UI index into correct song
	 */
	resolveIndex(i: number): {
		from: 'notFound' | 'advanced' | 'queue' | 'played' | 'autoplay',
		index: number,
		song: Song
	} {
		if (i < 0) {
			return {
				from: 'notFound',
				index: i,
				song: undefined
			};
		}
		if (this._played.length > i) {
			return {
				from: 'played',
				index: i,
				song: this._played[i].song
			};
		}
		if (this._played.length + this._advanced.length > i) {
			return {
				from: 'advanced',
				index: i - this._played.length,
				song: this._advanced[i - this._played.length]
			};
		}
		if (this._played.length + this._advanced.length + this._queue.length > i) {
			return {
				from: 'queue',
				index: i - this._advanced.length - this._played.length,
				song: this._queue[i - this._advanced.length - this._played.length]
			};
		}
		if (this._played.length + this._advanced.length + this._queue.length + this._autoplay.length > i) {
			return {
				from: 'autoplay',
				index: i - this._queue.length - this._advanced.length - this._played.length,
				song: this._autoplay[i - this._queue.length - this._advanced.length - this._played.length]
			};
		}
		return {
			from: 'notFound',
			index: i,
			song: undefined
		};
	}

	/**
	 * @name refreshAutoplay()
	 * Adds new songs to the autoplay queue
	 */
	refreshAutoplay(): void {
		const newSongs = [];
		for (let i = 0; i < this.data.guildSettings.autoplayList.length; i++) {
			newSongs.push(...this.data.sourceManager.resolveRef(this.data.guildSettings.autoplayList[i]));
		}
		this._autoplay.push(...this._shuffle(newSongs));
	}

	/**
	 * @name _refreshQueue()
	 * Shuffles the queue if shuffle is on
	 */
	private _refreshQueue(): void {
		const saveSongs = [];
		for (let i = 0; i < this._played.length; i++) {
			if (this._played[i].save) { saveSongs.push(this._played[i].song); }
		}
		this._played = [];
		this._advanced = [];
		if (this._nowPlayingSong.song && this._nowPlayingSong.save) {
			this._nowPlayingSong.save = false;
			saveSongs.push(this._nowPlayingSong.song);
		}
		this._queue = this._shuffle(saveSongs);
	}

	/**
	 * @name _shuffle()
	 * Implements the Fisher-Yates algorithm to shuffle an array
	 */
	private _shuffle(list: Array<Song>): Array<Song> {
		if (!this.data.guildSettings.shuffle) return list;
		for (let i = list.length - 1; i > 0; i--) {
			const rand = Math.round(Math.random() * i);
			const temp = list[i];
			list[i] = list[rand];
			list[rand] = temp;
		}
		return list;
	}

	/**
	 * @name addQueue()
	 * Inserts a song to queue
	 */
	addQueue(songs: Array<Song>): void {
		this._queue.push(...songs);
	}

	/**
	 * @name removeSong() 
	 * Removes a song with the given id from the queue
	 */
	removeSong(index: number): Song {
		const loc = this.resolveIndex(index);
		switch (loc.from) {
			case ('played'): {
				const removed = this._played.splice(loc.index, 1)[0].song;
				removed.reqBy = '';
				return removed;
			}
			case ('advanced'): {
				const removed = this._advanced.splice(loc.index, 1)[0];
				removed.reqBy = '';
				return removed;
			}
			case ('queue'): {
				const removed = this._queue.splice(loc.index, 1)[0];
				removed.reqBy = '';
				return removed;
			}
			case ('autoplay'): {
				const removed = this._autoplay.splice(loc.index, 1)[0];
				removed.reqBy = '';
				return removed;
			}
			default: { return undefined; }
		}
	}

	/**
	 * @name advance()
	 * Advances a song to the top of the queue
	 */
	advance(index: number, userId = ''): Song {
		const removed = this.removeSong(index);
		if (removed) {
			removed.reqBy = userId;
			this._advanced.splice(0, 0, removed);
			return removed;
		}
		return undefined;
	}

	/**
	 * @name clearQueue()
	 * Clears the current queue
	 */
	clearQueue(): void {
		for (let i = 0; i < this._played.length; i++) { if (this._played[i].song) { this._played[i].song.reqBy = ''; } }
		for (let i = 0; i < this._advanced.length; i++) { this._advanced[i].reqBy = ''; }
		for (let i = 0; i < this._queue.length; i++) { this._queue[i].reqBy = ''; }
		this._nowPlayingSong = {
			song: undefined,
			save: false,
		};
		this._played = [];
		this._advanced = [];
		this._queue = [];
		this._repeatQueue = 0;
		this._repeatSong = 0;
	}

	/**
	 * @name newSong()
	 * Plays the next song in the queue, if nothing left, returns false
	 */
	nextSong(): boolean {
		// if we want to repeat the song, repeat it
		if (this._repeatSong !== 0 && this._nowPlayingSong.song) {
			if (this.repeatSong > 0) { this._repeatSong--; }
			this.vcPlayer.play(this._nowPlayingSong.song);
			return true;
		}

		this._played.push(this._nowPlayingSong);
		const nextSong = this.resolveIndex(this._played.length);
		this._nowPlayingSong = {
			song: nextSong.song,
			save: nextSong.from === 'queue' || nextSong.from === 'advanced'
		};
		if (nextSong.from !== 'notFound') {
			this.removeSong(this._played.length);
			// refresh queue if nothing left in queue
			if (this._queue.length + this._advanced.length === 0 && this._repeatQueue !== 0) {
				if (this._repeatQueue > 0) { this._repeatQueue--; }
				this._refreshQueue();
			}
			// refresh autoplay if nearing end
			if (this._autoplay.length < this.config.SHOW_NUM_ITEMS * 3) { this.refreshAutoplay(); }

			// if song is from autoplay and autoplay is off, stop
			if (!this.data.guildSettings.autoplay && nextSong.from === 'autoplay') {
				this.clearQueue();
				return false;
			}

			// play song
			this.vcPlayer.play(this._nowPlayingSong.song);
			return true;
		}
		this.clearQueue();
		return false;
	}

	/**
	 * @name _createShowQueueMsg()
	 * Creates message embed for show queue
	 */
	private _createShowQueueMsg(page: number): Discord.MessageOptions {
		if (!page) { page = 1; }
		const maxPage = Math.ceil((this._advanced.length + this._queue.length + this._autoplay.length) / this.config.SHOW_QUEUE_ITEMS);
		if (page > maxPage) { page = maxPage; }
		if (page < 1) { page = 1; }

		// find where in item list to start at
		const indexStart = (page - 1) * this.config.SHOW_QUEUE_ITEMS;

		// Get items to show
		let displayText = '';
		for (let i = 0; i < this.config.SHOW_QUEUE_ITEMS; i++) {
			const ref = this.resolveIndex(indexStart + i);
			if (indexStart + i === 0) {
				displayText += '**Queue**\n\n';
				if (this._advanced.length + this._queue.length === 0) { displayText += 'Nothing in queue!\n'; }
			}
			if (indexStart + i === this._queue.length) {
				displayText += '\n**Autoplay**\n\n';
				if (this._autoplay.length === 0) { displayText += 'Nothing in autoplay!'; }
			}
			if (ref.from !== 'notFound') {
				let songTitle = ref.song.title;
				if (ref.song.title.length > this.config.MAX_SONG_INFO_LENGTH) {
					songTitle = ref.song.title.slice(0, this.config.MAX_SONG_INFO_LENGTH - 3) + '...';
				}
				displayText += `${indexStart + i + 1}. ${this.ui.escapeString(songTitle)}\n`;
			}
		}

		const embed = new Discord.MessageEmbed()
			.setColor(TEAL)
			.setTitle('Showing Items in Queue and Autoplay')
			.setDescription(displayText)
			.setFooter({ text: `Page ${page} of ${maxPage}` });

		const navigation = new Discord.MessageActionRow()
			.addComponents(
				new Discord.MessageButton()
					.setLabel('Done')
					.setCustomId(JSON.stringify({ type: 'close', special: 0 }))
					.setStyle('PRIMARY')
			)
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
			);

		return { embeds: [embed], components: [navigation] };
	}

	/**
	 * @name showPage()
	 * Displays the queue
	 */
	async showPage(page: number): Promise<void> {
		if (this._msgId) {
			const success = await this.ui.updateMsg(this.data.guildSettings.channelId, this._msgId, this._createShowQueueMsg(page));
			if (success) { return; }
		}

		// Interaction handler for show queue message
		const interactionHandler = async (interaction: InteractionInfo): Promise<boolean> => {
			try {
				const customId = JSON.parse(interaction.customId);

				switch (customId.type) {
					case ('page'): {
						this.showPage(customId.pageNum);
						break;
					}
					case ('close'): {
						await this.ui.deleteMsg(interaction.parentChannelId, interaction.parentMessageId);
						break;
					}
					default: {
						return false;
					}
				}
				return true;
			}
			catch (error) {
				this.error(`{error:${error.message}} while handling {interaction:${JSON.stringify(interaction)}} for showQueue message`, error);
				return false;
			}
		};

		this._msgId = await this.ui.sendEmbed(this._createShowQueueMsg(page), 30_000, interactionHandler);
	}

	get repeatSong() { return this._repeatSong; }
	set repeatSong(repeats: number) { if (repeats >= -1) { this._repeatSong = repeats; } else { this._repeatSong = -1; } }

	get repeatQueue() { return this._repeatQueue; }
	set repeatQueue(repeats: number) { if (repeats >= -1) { this._repeatQueue = repeats; } else { this._repeatQueue = -1; } }

	get nowPlayingSong() { return this._nowPlayingSong.song; }
	get lastPlayed() {
		if (this._played[this._played.length - 1]) { return this._played[this._played.length - 1].song; }
		return undefined;
	}
	get nextInQueue() {
		const next = [];
		for (let i = 0; i < this.config.SHOW_NUM_ITEMS; i++) {
			const resolved = this.resolveIndex(this._played.length + i);
			if (resolved.from === 'advanced' || resolved.from === 'queue') {
				next.push({
					song: resolved.song,
					index: this._played.length + i
				});
			}
		}
		return next;
	}
	get nextInAutoplay() {
		const next = [];
		for (let i = 0; i < this.config.SHOW_NUM_ITEMS; i++) {
			const resolved = this.resolveIndex(this._played.length + this._advanced.length + this._queue.length + i);
			if (resolved.from === 'autoplay') {
				next.push({
					song: resolved.song,
					index: this._played.length + this._advanced.length + this._queue.length + i
				});
			}
		}
		return next;
	}
}