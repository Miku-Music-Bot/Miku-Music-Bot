import Discord from 'discord.js';
import path from 'path';

import { TEAL } from './UI';
import GuildComponent from './GuildComponent';
import { type InteractionInfo } from '../GHChildInterface';
import type GuildHandler from '../GuildHandler';
import GDSong from './Data/SourceData/GDSources/GDSong';
import Song from './Data/SourceData/Song';
import AudioSource from './VCPlayer/AudioSources/AudioSource';
import GDSource from './VCPlayer/AudioSources/GDAudioSource';
import YTSource from './VCPlayer/AudioSources/YTAudioSource';

export default class Queue extends GuildComponent {
	private _played: Array<{ song: Song, save: boolean }> = [];
	private _advanced: Song[] = [];
	private _queue: Song[] = [];
	private _autoplay: Song[] = [];

	private _repeatSong = 0;
	private _repeatQueue = 0;

	private _msgId: string;

	private _nowPlayingSong: {
		song: Song,
		from: 'queue' | 'autoplay' | 'advanced'
	};

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
	 * @name addQueue()
	 * Inserts a song to queue
	 */
	addQueue(songs: Array<Song>): void {
		this._queue.push(...songs);
		if (songs.length === 1) { this.ui.sendNotification(`Added "${this.ui.escapeString(songs[0].title)}" to queue`); }
		else { this.ui.sendNotification(`Added ${songs.length} songs to queue`); }
	}

	/**
	 * @name removeSong() 
	 * Removes a song with the given id from the queue
	 */
	removeSong(index: number): Song {
		const loc = this.resolveIndex(index);
		let removed;
		if (loc.from === 'played') {
			removed = this._played.slice(loc.index, 1)[0].song;
			removed.reqBy = '';
		}
		if (loc.from === 'advanced') {
			removed = this._advanced.slice(loc.index, 1)[0];
			removed.reqBy = '';
		}
		if (loc.from === 'queue') {
			removed = this._queue.splice(loc.index, 1)[0];
			removed.reqBy = '';
		}
		else if (loc.from === 'autoplay') {
			removed = this._autoplay.splice(loc.index, 1)[0];
			removed.reqBy = '';
		}
		else {
			this.ui.sendError('That song with does not exist in the queue or in autoplay');
		}
		return removed;
	}

	/**
	 * @name advance()
	 * Advances a song to the top of the queue
	 */
	advance(index: number): Song {
		const removed = this.removeSong(index);
		if (removed) {
			this._queue.splice(1, 0, removed);
			return removed;
		}
		return undefined;
	}

	/**
	 * @name clearQueue()
	 * Clears the current queue
	 */
	clearQueue(): void {
		for (let i = 0; i < this._queue.length; i++) { this._queue[i].reqBy = ''; }
		this._played = [];
		this._queue = [];
		this._repeatQueue = 0;
		this._repeatSong = 0;
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
		if (this.data.guildSettings.shuffle) {
			this._queue = this._shuffle(saveSongs);
		}
		this._played = [];
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
	 * @name newSong()
	 * Plays the next song in the queue, if nothing left, returns false
	 */
	nextSong(): boolean {
		// if we want to repeat the song, repeat it
		if (this._repeatSong > 0 && this._nowPlayingSong.song) {
			this.vcPlayer.play(this._nowPlayingSong.song);
			return true;
		}
		// otherwise, move this song into the played array
		this._played.push({
			song: this._nowPlayingSong.song,
			save: this._nowPlayingSong.from === 'queue'
		});

		const nextSong = this.resolveIndex(this._played.length);
		switch(nextSong.from) {
			case('notFound'): {
				return false;
			}
		}
		return false;
	}

	/**
	 * @name setRepeatSong()
	 * Sets the number of times to repeat song
	 */
	setRepeatSong(repeats: number): void {
		if (repeats >= -1) { this._repeatSong = repeats; }
	}

	/**
	 * @name setRepeatQueue()
	 * Sets the number of times to repeat song
	 */
	setRepeatQueue(repeats: number): void {
		if (repeats >= -1) { this._repeatQueue = repeats; }
	}

	/**
	 * @name toggleShuffle()
	 * Toggles the shuffle if no state given, otherwise sets state to given state
	 */
	toggleShuffle(state = !this._shuffle): void { this.data.guildSettings.shuffle = state; }

	getUIInfo(): {
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
	} {
		return {
			nextInAutoplay: [],
			nextInQueue: [],
			nowPlaying: false,
			repeatQueue: 0,
			repeatSong: 0,
			shuffle: false,
			autoplay: false
		};
	}

	get nowPlayingSong() { return this._nowPlayingSong; }
	get lastPlayed() { return this._played[this._played.length - 1]; }
}