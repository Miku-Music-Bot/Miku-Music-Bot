import GuildComponent from '../Components/GuildComponent';
import type GuildHandler from '../GuildHandler';
import Song from './Data/SourceData/Songs/Song';
import AudioSource from './VCPlayer/sources/AudioSource';
import YTSource from './VCPlayer/sources/YTAudioSource';

/**
 * Queue
 * 
 * Handles queue of songs to be played and playing said songs
 */
export default class Queue extends GuildComponent {
	private _sources: Array<{ song: Song, id: number }>;				// should be sorted by ids
	private _apSources: Array<{ song: Song, id: number }>;			// should be sorted by ids
	private _sourceCount: number;

	queueList: Array<{ song: Song, id: number }>;						// does not need to be sorted
	autoplayList: Array<{ song: Song, id: number }>;					// does not need to be sorted
	nowPlaying: boolean;
	lastPlayed: Song;

	repeatSong: number;
	repeatQueue: boolean;

	/**
	 * @param guildHandler - guild handler for guild this queue object is responsible for
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
		this._sources = [];
		this._apSources = [];
		this._sourceCount = 0;

		this.queueList = [];
		this.autoplayList = [];

		this.nowPlaying = false;
		this.repeatSong = 0;
		this.repeatQueue = false;
	}

	/**
	 * _resolveIndex()
	 * 
	 * @param i - index to resolve
	 * @returns Object with property "from" (queue or autoplay), "index" (of queueList or autoplayList), and "data"
	 */
	private _resolveIndex(i: number) {
		if (this.queueList.length > i) {
			return {
				from: 'queue',
				index: i,
				data: this.queueList[i]
			};
		}
		else {
			return {
				from: 'autoplay',
				index: i - this.queueList.length,
				data: this.autoplayList[i - this.queueList.length]
			};
		}
	}

	/**
	 * _binarySearch()
	 * 
	 * Finds object with propretym, id matching given id, null if not found
	 * @param id - id to find 
	 * @param list - array of objects with id property
	 * @returns index of found item or null if not found
	 */
	private _binarySearch(id: number, arr: Array<{ id: number }>) {
		let lBound = 0;
		let rBound = arr.length - 1;
		let middle = 0;
		while (lBound <= rBound) {
			middle = Math.floor((lBound + rBound) / 2);

			if (arr[middle].id === id) { return middle; }

			if (arr[middle].id > id) { rBound = middle - 1; }
			else { lBound = middle + 1; }
		}
		return null;
	}

	removeQueue(id: number) {
		//
	}

	/**
	 * addQueue()
	 * 
	 * Inserts a song to queue and saves it to the sources list
	 * @param song - song to add to queue
	 */
	addQueue(song: Song) {
		this._sources.push({ id: this._sourceCount, song });
		this.queueList.push({ id: this._sourceCount, song });
		this._sourceCount++;
	}

	/**
	 * addAutoplay()
	 * 
	 * Inserts a song to autoplay and saves it to the sources list
	 * @param song - song to add to autoplay
	 */
	addAutoplay(song: Song) {
		this._apSources.push({ id: this._sourceCount, song });
		this.autoplayList.push({ id: this._sourceCount, song });
		this._sourceCount++;
	}

	private _refreshQueue() {
		//
	}

	private _refreshAutoplay() {
		//
	}

	/**
	 * _createSource()
	 * 
	 * Creates the appropriate AudioSource for the given song (yt vs gd vs etc)
	 * @param song - song to create source for
	 * @returns AudioSource object of created source
	 */
	private _createSource(song: Song) {
		let source: AudioSource;
		switch (song.type) {
			case ('yt'): {
				source = new YTSource(this.guildHandler, song);
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
	nextSong(start?: boolean) {
		if (!start) {
			// grab what song was just played
			const justPlayed = this._resolveIndex(0);
			this.lastPlayed = justPlayed.data.song;

			// if repeatSong, play the same song again
			if (this.repeatSong > 0) {
				const source = this._createSource(this.lastPlayed);
				this.vcPlayer.play(source);
				return;
			}

			// if not repeating song, shift the queue/autoplay over 1 song
			if (justPlayed.from === 'queue') { this.queueList.shift(); }
			else { this.autoplayList.shift(); }
		}
		this.nowPlaying = true;

		// refresh the queue if it has ended and we want to repeat it
		if (this.queueList.length === 0 && this.repeatQueue) { this._refreshQueue(); }
		if (this.autoplayList.length === 0) { this._refreshAutoplay(); }

		// if there is stuff in the queue, the next song
		if (this.queueList.length > 0) {
			const source = this._createSource(this.queueList[0].song);
			this.vcPlayer.play(source);
		}
		// otherwise, if autoplay is on, play from autoplay
		else if (this.data.guildSettings.autoplay && this.autoplayList.length > 0) {
			const source = this._createSource(this.autoplayList[0].song);
			this.vcPlayer.play(source);
		}
		// send error if this is just the start
		else if (start) { this.ui.sendError('Nothing to play!'); }
	}
}