import Discord from 'discord.js';
import * as path from 'path';

import { TEAL } from './UI';
import GuildComponent from '../Components/GuildComponent';
import { InteractionInfo } from '../GHChildInterface';
import type GuildHandler from '../GuildHandler';
import GDSong from './Data/SourceData/GDSources/GDSong';
import Song from './Data/SourceData/Song';
import AudioSource from './VCPlayer/AudioSources/AudioSource';
import GDSource from './VCPlayer/AudioSources/GDAudioSource';
import YTSource from './VCPlayer/AudioSources/YTAudioSource';

type UIInfo = {
	lastPlayed?: Song,
	nowPlayingSong?: Song,
	playingFrom?: 'autoplay' | 'queue',
	nextInAutoplay: Array<{
		index: number,
		song: Song
	}>,
	nextInQueue: Array<{
		index: number,
		song: Song
	}>,
	nowPlaying: boolean,
	repeatQueue: number,
	repeatSong: number,
	shuffle: boolean,
	autoplay: boolean
};

type ResolvedIndex = {
	from: 'queue' | 'autoplay' | 'notFound',
	index: number,
	song: Song
}

const SHOW_QUEUE_ITEMS = parseInt(process.env.SHOW_QUEUE_ITEMS);

/**
 * Queue
 * 
 * Handles queue of songs to be played and playing said songs
 */
export default class Queue extends GuildComponent {
	private _queue: Array<Song>;			// list of songs in queue
	private _autoplayQueue: Array<Song>;	// list of songs in autoplay queue
	private _nowPlaying: boolean;			// now playing a song or not
	private _nowPlayingSong: Song;			// what song is currently being played
	private _lastPlayed: Song;				// what song was last played
	private _currentLoc: number;			// current playing from location, -1 if playing from autoplay

	private _repeatSong: number;			// number of times to repeat current song
	private _repeatQueue: number;			// number of times to repeat current queue

	private _msgId: string;					// message id of show queue message

	/**
	 * @param guildHandler - guild handler for guild this queue object is responsible for
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler, path.basename(__filename));

		this._queue = [];
		this._autoplayQueue = [];
		this._nowPlaying = false;
		this._currentLoc = -1;

		this._repeatSong = 0;
		this._repeatQueue = 0;

		this._refreshAutoplay();
	}

	/**
	 * _resolveIndex()
	 * 
	 * @param i - index to resolve
	 * @returns Object with property "from" (queue or notFound or autoplay), "index" (of queueList or autoplayList), and "song"
	 */
	private _resolveIndex(i: number): ResolvedIndex {
		this.debug(`Resolving {index:${i}}`);
		if (this._queue.length > i) {
			this.debug(`Index is less than {queueLength:${this._queue.length}}, found song with {url:${this._queue[i].url}}`);
			return {
				from: 'queue',
				index: i,
				song: this._queue[i]
			};
		}
		else if (this._queue.length + this._autoplayQueue.length <= i) {
			this.debug('Index is outside queue and autoplay queue range, found nothing');

			return {
				from: 'notFound',
				index: i,
				song: undefined
			};
		}
		else {
			this.debug(`Index is within autoplay queue range, found song with {url:${this._autoplayQueue[i - this._queue.length].url}}`);
			return {
				from: 'autoplay',
				index: i - this._queue.length,
				song: this._autoplayQueue[i - this._queue.length]
			};
		}
	}

	/**
	 * addQueue()
	 * 
	 * Inserts a song to queue
	 * @param song - song to add to queue
	 */
	addQueue(songs: Array<Song>): void {
		this.debug(`Adding ${songs.length} songs to the queue`);
		this._queue.push(...songs);
		if (songs.length === 1) {
			this.debug('Only 1 song was added to the queue, sending notification with song title');
			this.ui.sendNotification(`Added "${this.ui.escapeString(songs[0].title)}" to queue`);
		}
		else {
			this.debug('More than 1 song was added to the queue, sending notification with number of songs');
			this.ui.sendNotification(`Added ${songs.length} songs to queue`);
		}
		this.ui.updateUI();

	}

	/**
	 * removeSong() 
	 * Removes a song with the given id from the queue
	 * @param index - id of song to remove
	 * @returns song that was removed
	 */
	removeSong(index: number): Song {
		this.debug(`Attempting to remove song at {index:${index}}, resolving index`);
		const loc = this._resolveIndex(index - 1);
		let removed;
		if (loc.from === 'queue') {
			removed = this._queue.splice(loc.index, 1);
			removed[0].reqBy;
			this.debug(`Removed song with {url:${removed.url}} from queue`);
		}
		else if (loc.from === 'autoplay') {
			removed = this._autoplayQueue.splice(loc.index, 1);
			removed[0].reqBy;
			this.debug(`Removed song with {url:${removed.url}} from autoplay queue`)
		}
		else {
			this.debug(`Could not find song with {index:${index}}, did not remove anything`);
			this.ui.sendError('That song with does not exist in the queue or in autoplay');
		}
		this.ui.updateUI();
		return removed;
	}

	/**
	 * advance()
	 * 
	 * Advances a song to the top of the queue
	 * @param index - index of the song to advance
	 */
	advance(index: number) {
		this.debug(`Attempting to advance song at {index:${index}}`);
		const removed = this.removeSong(index);
		if (removed) {
			this._queue.splice(this._currentLoc + 1, 0, removed);
			this.debug(`Removed song at {index:${index}} and moved it to be next in queue`);
		}
		this.debug(`Could not find song at {index:${index}}, nothing advanced`);
	}

	/**
	 * clearQueue()
	 * 
	 * Clears the current queue
	 */
	clearQueue() {
		this.debug('Clearing queue');
		for (let i = 0; i < this._queue.length; i++) { this._queue[i].reqBy = ''; }
		this._queue = [];
		this._currentLoc = 0;
		this._repeatQueue = 0;
		this._repeatSong = 0;
	}

	/**
	 * stop()
	 * 
	 * Tells the queue that we have stopped playing
	 */
	stop() {
		this.debug('Stopping queue');
		this._nowPlaying = false;
		this.clearQueue();
	}

	/**
	 * _refreshQueue()
	 * 
	 * Shuffles the queue if shuffle is on
	 */
	private _refreshQueue(): void {
		this.debug('Refreshing queue');
		if (this.data.guildSettings.shuffle) {
			this.debug('Shuffle is on, shuffling queue');
			this._queue = this._shuffle(this._queue);
		}
		else {
			this.debug('Shuffle is off, leaving queue as is');
		}
	}

	/**
	 * _refreshAutoplay()
	 * 
	 * Adds new songs to the autoplay queue
	 */
	private _refreshAutoplay(): void {
		this.debug('Refreshing autoplay queue');
		const newSongs = [];
		for (let i = 0; i < this.data.guildSettings.autoplayList.length; i++) {
			newSongs.push(...this.data.sourceManager.resolveRef(this.data.guildSettings.autoplayList[i]));
		}
		this.debug(`Adding ${newSongs.length} songs to autoplay queue`);
		this._autoplayQueue.push(...this._shuffle(newSongs));
	}

	/**
	 * _shuffle()
	 * 
	 * Implements a Fisher-Yates algorithm to shuffle an array
	 * @param list - array to shuffle
	 * @returns suffled array
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
	 * _createSource()
	 * 
	 * Creates the appropriate AudioSource for the given song (yt vs gd vs etc)
	 * @param song - song to create source for
	 * @returns AudioSource object of created source
	 */
	private _createSource(song: Song): AudioSource | undefined {
		this.debug(`Creating audio source for song with {url:${song.url}} and {type:${song.type}}`);
		let source: AudioSource;
		switch (song.type) {
			case ('yt'): {
				this.debug('Created youtube source');
				source = new YTSource(this.guildHandler, song);
				break;
			}
			case ('gd'): {
				this.debug('Created google drive source');
				source = new GDSource(this.guildHandler, song as GDSong);
				break;
			}
			default: {
				this.error('Failed to create audio source for song with {type:${song.type}}, type is not valid');
				break;
			}
		}
		return source;
	}

	/**
	 * nextSong()
	 * 
	 * Queues up the next song if queue is not finished, otherwise does nothing
	 */
	nextSong() {
		this.debug('Moving onto next song');
		this._nowPlaying = true;
		this._lastPlayed = this._nowPlayingSong;
		this.debug(`Just played song with {url:${this._lastPlayed.title}}`);

		// if repeatSong, play the same song again
		if ((this._repeatSong > 0 || this._repeatSong === -1) && this._lastPlayed) {
			this.debug('Repeat song was greater than 0 or infinite, repeating song');
			if (this._repeatSong !== -1) {
				this.debug('Repeat song was not infinite, decrementing count');
				this._repeatSong--;
			}
			const source = this._createSource(this._lastPlayed);
			this.vcPlayer.play(source);
			return;
		}

		// Move to next song, unless we are at the end of the queue
		this._currentLoc++;
		if (this._currentLoc >= this._queue.length) {
			this.debug('Reached end of queue');
			// refresh the queue if it has ended and we want to repeat it, otherwise clear the queue
			if (this._repeatQueue > 0 || this._repeatQueue === -1) {
				this.debug('Repeat queue was greater than 0 or infininite, repeating queue');
				if (this._repeatQueue !== -1) {
					this.debug('Repeat queue was not infinite, decrementing count');
					this._repeatQueue--;
				}
				this._refreshQueue();
				this._currentLoc = 0;
			}
			else {
				this.debug('Repeat queue was equal to zero, clearing queue');
				this.clearQueue();
			}
		}

		// if queue is empty and autoplay is on, set currentLoc to the right place
		if (this._queue.length === 0 && this.data.guildSettings.autoplay) {
			this.debug('Queue is empty and autoplay is on, setting current loc to -1 to indicate autoplay');
			this._currentLoc = -1;
		}

		// if currentLoc is -1, play from autoplay
		if (this._currentLoc === -1 && this.data.guildSettings.autoplay) {
			this.debug('Current loc is -1 and autoplay is on, playing first song from autoplay');
			const source = this._createSource(this._autoplayQueue[0]);
			this._nowPlayingSong = this._autoplayQueue[0];
			this._autoplayQueue.shift();
			this.vcPlayer.play(source);
		}
		// otherwise play the right song from the queue
		else if (this._currentLoc < this._queue.length) {
			this.debug('Current loc is in range of queue, playing song at that location in queue');
			const source = this._createSource(this._queue[this._currentLoc]);
			this._nowPlayingSong = this._queue[this._currentLoc];
			this.vcPlayer.play(source);
		}
		// send error if there is nothing to play
		else {
			this.debug('Current loc is -1 and autoplay is off, nothing left to play');
			this._currentLoc = -1;
			this._nowPlaying = false;
			this.ui.sendError('Nothing to play!');
		}

		// refresh autoplay queue if we are near the end
		if (this._autoplayQueue.length <= 10) {
			this.debug('Autoplay has less than 10 songs left, refreshing autoplay');
			this._refreshAutoplay();
		}
	}

	/**
	 * _createShowQueueMsg()
	 * 
	 * Creates message embed to show queue
	 * @param page - page of queue to show
	 */
	private _createShowQueueMsg(page: number): Discord.MessageOptions {
		const maxTitleLength = 50;

		if (!page) { page = 1; }
		const maxPage = Math.ceil((this._queue.length + this._autoplayQueue.length) / SHOW_QUEUE_ITEMS);
		if (page > maxPage) { page = maxPage; }
		if (page < 1) { page = 1; }

		// find where in item list to start at
		const indexStart = (page - 1) * SHOW_QUEUE_ITEMS;

		// Get items to show
		let displayText = '';
		for (let i = 0; i < SHOW_QUEUE_ITEMS; i++) {
			const ref = this._resolveIndex(indexStart + i);
			if (ref.from !== 'notFound') {
				if (indexStart + i === 0) {
					displayText += '**Queue**\n\n';
					if (this._queue.length === 0) { displayText += 'Nothing in queue!\n\n'; }
				}
				if (indexStart + i === this._queue.length) {
					displayText += '**Autoplay**\n\n';
					if (this._autoplayQueue.length === 0) { displayText += 'Nothing in autoplay!\n\n'; }
				}
				let songTitle = ref.song.title;
				if (ref.song.title.length > maxTitleLength) {
					songTitle = ref.song.title.slice(0, maxTitleLength - 3) + '...';
				}
				displayText += `${indexStart + i + 1}. ${this.ui.escapeString(songTitle)}\n`;
			}
			else { break; }
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
	 * showPage()
	 * 
	 * Displays the queue
	 * @param page - page of the queue to show
	 */
	async showPage(page: number) {
		this.debug(`Attempting to show {page:${page}} of queue`);
		if (this._msgId) {
			this.debug('Show queue message already exists, attempting to update it');
			const success = await this.ui.updateMsg(this.data.guildSettings.channelId, this._msgId, this._createShowQueueMsg(page));
			if (success) {
				this.debug('Update successful, done showing queue');
				return;
			}
			this.debug('Update was not successful, attempting to send new show queue message');
		}

		// Interaction handler for show queue message
		const interactionHandler = async (interaction: InteractionInfo): Promise<boolean> => {
			try {
				this.debug(`Handling interaction on show queue message with {messageId:${interaction.parentMessageId}} with {customId:${interaction.customId}}`);
				const customId = JSON.parse(interaction.customId);

				switch (customId.type) {
					case ('page'): {
						this.debug(`Recieved "page" interaction, showing {page:${customId.pageNum}} of queue`);
						this.showPage(customId.pageNum);
						break;
					}
					case ('close'): {
						this.debug('Recieved "close" interaction, deleting show queue message');
						await this.ui.deleteMsg(interaction.parentChannelId, interaction.parentMessageId);
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

		this._msgId = await this.ui.sendEmbed(this._createShowQueueMsg(page), 30_000, interactionHandler);
		this.debug(`Send show queue message, {messageId:${this._msgId}}`);
	}

	/**
	 * getUIInfo()
	 * 
	 * Get the info for ui to display the queue
	 * @returns the required info for ui to display the queue
	 */
	getUIInfo(): UIInfo {
		const info: UIInfo = {
			nowPlaying: this._nowPlaying,
			repeatQueue: this._repeatQueue,
			repeatSong: this._repeatSong,
			autoplay: this.data.guildSettings.autoplay,
			shuffle: this.data.guildSettings.shuffle,
			nextInQueue: [],
			nextInAutoplay: []
		};

		if (!this._nowPlaying) return info;


		info.lastPlayed = this._lastPlayed;
		info.nowPlayingSong = this._nowPlayingSong;

		if (this._currentLoc === -1) {
			info.playingFrom = 'autoplay';
			for (let i = 0; i < 3; i++) {
				if (this._queue[this._currentLoc + i + 1]) {
					info.nextInQueue.push({
						index: this._currentLoc + i + 1,
						song: this._queue[this._currentLoc + i + 1]
					});
				}
			}
			for (let i = 0; i < 3; i++) {
				if (this._autoplayQueue[i + 1]) {
					info.nextInAutoplay.push({
						index: this._queue.length + i,
						song: this._autoplayQueue[i]
					});
				}
			}
		}
		else {
			info.playingFrom = 'queue';
			for (let i = 0; i < 3; i++) {
				if (this._queue[this._currentLoc + i + 1]) {
					info.nextInQueue.push({
						index: this._currentLoc + i + 1,
						song: this._queue[this._currentLoc + i + 1]
					});
				}
			}
			for (let i = 0; i < 3; i++) {
				if (this._autoplayQueue[i + 1]) {
					info.nextInAutoplay.push({
						index: this._queue.length + i,
						song: this._autoplayQueue[i]
					});
				}
			}
		}

		return info;
	}


	/**
	 * setRepeatSong()
	 * 
	 * Sets the number of times to repeat song
	 * @param repeats - number of times to repeat
	 */
	 setRepeatSong(repeats: number) {
		this.debug(`Attempting to set repeat song to {repeats:${repeats}}`);
		if (repeats >= -1) {
			this.debug(`{repeats:${repeats}} was a valid setting, setting repeat song to it`);
			this._repeatSong = repeats;
		}
	}

	/**
	 * setRepeatQueue()
	 * 
	 * Sets the number of times to repeat song
	 * @param repeats - number of times to repeat
	 */
	setRepeatQueue(repeats: number) {
		this.debug(`Attempting to set repeat queue to {repeats:${repeats}}`);
		if (repeats >= -1) {
			this.debug(`{repeats:${repeats}} was a valid setting, setting repeat queue to it`);
			this._repeatQueue = repeats;
		}
	}

	/**
	 * toggleShuffle()
	 * 
	 * Toggles the shuffle on or off if no argument given, sets state to given state otherwise
	 * @param state - state to set shuffle to
	 */
	toggleShuffle(state?: boolean) {
		this.debug(`Toggling shuffle to {state:${state}}`);
		if (typeof state === 'undefined') {
			state = !this.data.guildSettings.shuffle;
			this.debug(`State was undefined, toggling shuffle to opposite of {currentState:${this.data.guildSettings.shuffle}}`);
		}
		this.debug(`Setting shuffle to {state:${state}}`);
		this.data.guildSettings.shuffle = state;
	}
}