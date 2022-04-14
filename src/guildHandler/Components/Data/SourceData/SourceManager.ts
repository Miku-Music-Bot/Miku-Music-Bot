import path from 'path';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

import GuildHandler from '../../../GuildHandler';
import GuildComponent from '../../GuildComponent';
import Playlist from './Playlist';
import GDPlaylist from './GDSources/GDPlaylist';
import Song from './Song';
import { SourceDataConfig, SourceRef, SOURCE_DATA_DEFAULT } from './sourceConfig';
import YTPlaylist from './YTSources/YTPlaylist';

type EventTypes = {
	newSettings: () => void,
}

const REFRESH_PLAYLIST_INTERVAL = parseInt(process.env.REFRESH_PLAYLIST_INTERVAL);

/**
 * @name SourceManager
 * Manages all the saved sources for a guild
 */
export default class SourceManager extends GuildComponent {
	events: TypedEmitter<EventTypes>;				// events
	private _gdPlaylists: Array<Playlist>;			// list of google drive playlists
	private _ytPlaylists: Array<Playlist>;			// list of youtube playlists

	constructor(guildHandler: GuildHandler, sourceData?: SourceDataConfig) {
		super(guildHandler, path.basename(__filename));
		this.events = new EventEmitter() as TypedEmitter<EventTypes>;

		// Set defaults
		let save = false;
		if (!sourceData) {
			save = true;
			sourceData = Object.assign({}, SOURCE_DATA_DEFAULT);
		}
		this._gdPlaylists = [];
		this._ytPlaylists = [];

		// Create songs and playlists
		for (let i = 0; i < sourceData.gdPlaylists.length; i++) { this.addPlaylist(new GDPlaylist(this.guildHandler, sourceData.gdPlaylists[i]), 'gd'); }
		for (let i = 0; i < sourceData.ytPlaylists.length; i++) { this.addPlaylist(new YTPlaylist(this.guildHandler, sourceData.ytPlaylists[i]), 'yt'); }

		// Refresh playlists
		this.bot.once('ready', () => {
			this.debug('Bot is ready, refreshing playlists');
			this._refreshAll();
		});

		if (save) {
			setImmediate(() => {
				this.events.emit('newSettings');
			});
		}
	}

	/**
	 * @name _refreshAll()
	 * Refreshes all playlists every 30 min
	 */
	private async _refreshAll(): Promise<void> {
		this.debug('Attempting to refreshing all playlists');
		if (this.vcPlayer.playing) {
			this.debug('Currently playing, stopping playlist refresh');
			setTimeout(() => {
				this.debug('Refresh playlist timeout ended, refreshing playlists');
				this._refreshAll();
			}, REFRESH_PLAYLIST_INTERVAL);
			return;
		}
		for (let i = 0; i < this._gdPlaylists.length; i++) {
			await this._gdPlaylists[i].fetchData();
			if (this.vcPlayer.playing) {
				this.debug('Currently playing, stopping playlist refresh');
				setTimeout(() => {
					this.debug('Refresh playlist timeout ended, refreshing playlists');
					this._refreshAll();
				}, REFRESH_PLAYLIST_INTERVAL);
				return;
			}
		}
		for (let i = 0; i < this._ytPlaylists.length; i++) {
			await this._ytPlaylists[i].fetchData();
			if (this.vcPlayer.playing) {
				this.debug('Currently playing, stopping playlist refresh');
				setTimeout(() => {
					this.debug('Refresh playlist timeout ended, refreshing playlists');
					this._refreshAll();
				}, REFRESH_PLAYLIST_INTERVAL);
				return;
			}
		}
		this.debug('Finished refreshing all playlists');
	}

	/**
	 * @name _binaryInsert()
	 * Uses a binary search to find index location to insert an element at
	 * returns the location to insert at or -1 if already exists
	 */
	private _binaryInsert(id: number, array: Array<{ id: number }>): number {
		let left = 0;
		let right = array.length - 1;
		while (left <= right) {
			const middle = Math.round((left + right) / 2);
			if (array[middle].id === id) { return -1; }

			if (array[middle].id < id) { left = middle + 1; }
			else { right = middle - 1; }
		}
		if (!array[left]) return array.length;
		if (array[left].id < id) { return left + 1; }
		return left;
	}

	/**
	 * @name _binarySearch()
	 * Uses a binary search to find index location of an element
	 * returns location found or -1 is doesnt exist
	 */
	private _binarySearch(id: number, array: Array<{ id: number }>): number {
		let left = 0;
		let right = array.length - 1;
		while (left <= right) {
			const middle = Math.round((left + right) / 2);
			if (array[middle].id === id) { return middle; }

			if (array[middle].id < id) { left = middle + 1; }
			else { right = middle - 1; }
		}
		return -1;
	}

	/**
	 * @name addPlaylist()
	 * Adds a playlist to correct location and keeps it sorted
	 */
	addPlaylist(playlist: Playlist, type: 'yt' | 'gd'): boolean {
		let ref;
		switch (type) {
			case ('yt'): {
				ref = this._ytPlaylists; break;
			}
			case ('gd'): {
				ref = this._gdPlaylists; break;
			}
			default: {
				this.error(`Playlist with {url:${playlist.url}} and {type:${type}} did not have a valid playlist type, add playlist failed`);
			}
		}

		if (ref) {
			const i = this._binaryInsert(playlist.id, ref);
			if (i === -1) {
				this.error('Could not find place to insert playlist');
				return false;
			}
			ref.splice(i, 0, playlist);
			playlist.events.on('newSettings', () => { this.events.emit('newSettings'); });
			this.events.emit('newSettings');
			return true;
		}
		else { return false; }
	}

	/**
	 * @name removePlaylist()
	 * Removes specified playlist
	 */
	removePlaylist(id: number): boolean {
		let i;
		// try yt playlist
		i = this._binaryInsert(id, this._ytPlaylists);
		if (i === -1) {
			this._ytPlaylists.splice(i, 1);
			this.events.emit('newSettings');
			return true;
		}

		// try gd playlist
		i = this._binaryInsert(id, this._gdPlaylists);
		if (i === -1) {
			this._gdPlaylists.splice(i, 1);
			this.events.emit('newSettings');
			return true;
		}

		return false;
	}

	/**
	 * @name resolveRef()
	 * Returns array of songs that match the song reference
	 */
	resolveRef(ref: SourceRef): Array<Song> {
		this.debug(`Resolving song with {ref:${JSON.stringify(ref)}}`);
		if (ref.id === -1 && ref.playlist === -1) {
			this.debug('Ref references all songs, returning all songs');
			const songs = [];
			for (let i = 0; i < this._gdPlaylists.length; i++) {
				songs.push(...this._gdPlaylists[i].getAllSongs());
			}
			for (let i = 0; i < this._ytPlaylists.length; i++) {
				songs.push(...this._ytPlaylists[i].getAllSongs());
			}
			return songs;
		}
		// get the playlist
		let playlist;
		switch (ref.type) {
			case ('yt'): {
				this.debug('Ref references a youtube song or playlist');
				const i = this._binarySearch(ref.playlist, this._ytPlaylists);
				if (i === -1) {
					this.error(`Did not find playlist with {ref:${JSON.stringify(ref)}}`);
					return [];
				}
				playlist = this._ytPlaylists[i];
				break;
			}
			case ('gd'): {
				const i = this._binarySearch(ref.playlist, this._gdPlaylists);
				if (i === -1) {
					this.error(`Did not find playlist with {ref:${JSON.stringify(ref)}}`);
					return [];
				}
				playlist = this._gdPlaylists[i];
				break;
			}
		}

		// if a song id is given, return that specific song, otherwise return all songs in playlist
		if (ref.id) {
			this.debug('Song id given in ref, searching for song');
			const s = playlist.getSong(ref.id);
			if (!s) {
				this.error(`Did not find playlist with {ref:${JSON.stringify(ref)}}`);
				return [];
			}
			this.debug('Song found, returning song');
			return [s];
		}

		this.debug('No song id given, returning all songs in playlist');
		return playlist.getAllSongs();
	}

	/**
	 * @name searchSaved()
	 * Searchs all saved sources using given string
	 */
	searchSaved(searchString: string): { gd: Array<Song>, yt: Array<Song> } {
		const rawResults: { gd: Array<{ song: Song, score: number }>, yt: Array<{ song: Song, score: number }> } = {
			gd: [],
			yt: []
		};

		for (let i = 0; i < this._gdPlaylists.length; i++) { rawResults.gd.push(...this._gdPlaylists[i].search(searchString)); }
		for (let i = 0; i < this._ytPlaylists.length; i++) { rawResults.yt.push(...this._ytPlaylists[i].search(searchString)); }
		this.debug(`Found {results:${rawResults.gd.length + rawResults.yt.length}} in saved songs using string {searchString:${searchString}}`);
		rawResults.gd.sort((a, b) => a.score - b.score);
		rawResults.yt.sort((a, b) => a.score - b.score);
		const results = {
			gd: rawResults.gd.map((a) => a.song),
			yt: rawResults.yt.map((a) => a.song)
		};
		return results;
	}

	/**
	 * @name export()
	 * Exports the settings in the format to be saved in database		
	 */
	export(): SourceDataConfig {
		const gdPlaylists = [];
		for (let i = 0; i < this._gdPlaylists.length; i++) { gdPlaylists.push(this._gdPlaylists[i].export()); }
		const ytPlaylists = [];
		for (let i = 0; i < this._ytPlaylists.length; i++) { ytPlaylists.push(this._ytPlaylists[i].export()); }
		return {
			gdPlaylists,
			ytPlaylists
		};
	}
}