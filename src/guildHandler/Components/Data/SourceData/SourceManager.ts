import { EventEmitter } from 'events';

import GuildHandler from '../../../GuildHandler';
import GuildComponent from '../../GuildComponent';
import Playlist from './Playlist';
import GDPlaylist from './GDSources/GDPlaylist';
import Song from './Song';
import { SourceDataConfig, SourceRef, SOURCE_DATA_DEFAULT } from './sourceConfig';
import YTPlaylist from './YTSources/YTPlaylist';

const REFRESH_PLAYLIST_INTERVAL = parseInt(process.env.REFRESH_PLAYLIST_INTERVAL);
/**
 * SourceManager
 * 
 * Manages all the saved sources for a guild
 */
export default class SourceManager extends GuildComponent {
	events: EventEmitter;
	private _gdPlaylists: Array<Playlist>;
	private _ytPlaylists: Array<Playlist>;

	/**
	 * @param guildHandler
	 * @param info - sourceData of source manager you want to create
	 */
	constructor(guildHandler: GuildHandler, sourceData?: SourceDataConfig) {
		super(guildHandler);
		this.events = new EventEmitter();

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
		setTimeout(() => this._refreshAll(), 10_000);

		if (save) { this.events.emit('newSettings'); }
	}

	/**
	 * _refreshAll()
	 * 
	 * Refreshes all playlists every 30 min
	 */
	private async _refreshAll() {
		if (this.vcPlayer.playing) {
			setTimeout(() => { this._refreshAll(); }, REFRESH_PLAYLIST_INTERVAL);
			return;
		}
		for (let i = 0; i < this._gdPlaylists.length; i++) {
			await this._gdPlaylists[i].fetchData();
			if (this.vcPlayer.playing) {
				setTimeout(() => { this._refreshAll(); }, REFRESH_PLAYLIST_INTERVAL);
				return;
			}
		}
		for (let i = 0; i < this._ytPlaylists.length; i++) {
			await this._ytPlaylists[i].fetchData();
			if (this.vcPlayer.playing) {
				setTimeout(() => { this._refreshAll(); }, REFRESH_PLAYLIST_INTERVAL);
				return;
			}
		}
	}

	/**
	 * _binaryInsert()
	 * 
	 * Uses a binary search to find index location to insert an element at
	 * @param id - id to search for
	 * @param array - array to search in
	 * @returns location to insert at or -1 if already exists
	 */
	private _binaryInsert(id: number, array: Array<{ id: number }>) {
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
	 * _binarySearch()
	 * 
	 * Uses a binary search to find index location of an element
	 * @param id - id to search for
	 * @param array - array to search in
	 * @returns location found for -1 is doesnt exist
	 */
	private _binarySearch(id: number, array: Array<{ id: number }>) {
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
	 * addPlaylist()
	 * 
	 * Adds a playlist to correct location and keeps it sorts
	 * @param playlist - playlist to add
	 * @param type - type of playlist to add
	 */
	addPlaylist(playlist: Playlist, type: 'yt' | 'gd') {
		let ref;
		switch (type) {
			case ('yt'): { ref = this._ytPlaylists; break; }
			case ('gd'): { ref = this._gdPlaylists; break; }
		}

		const i = this._binaryInsert(playlist.id, ref);
		if (i === -1) return;
		ref.splice(i, 0, playlist);
		playlist.events.on('newSettings', () => { this.events.emit('newSettings'); });
		this.events.emit('newSettings');
	}

	/**
	 * removePlaylist()
	 * 
	 * Removes specified playlist
	 * @param id - id of playlist to remove
	 */
	removePlaylist(id: number) {
		let i;
		// try yt playlist
		i = this._binaryInsert(id, this._ytPlaylists);
		if (i === -1) {
			this._ytPlaylists.splice(i, 1);
			this.events.emit('newSettings');
			return;
		}

		// try gd playlist
		i = this._binaryInsert(id, this._gdPlaylists);
		if (i === -1) {
			this._gdPlaylists.splice(i, 1);
			this.events.emit('newSettings');
			return;
		}
	}

	/**
	 * resolveRef()
	 * 
	 * Returns array of songs that match the song reference
	 * @param song - song to add to playlist
	 */
	resolveRef(ref: SourceRef): Array<Song> {
		// get the playlist
		let playlist;
		switch (ref.type) {
			case ('yt'): {
				const i = this._binarySearch(ref.playlist, this._ytPlaylists);
				if (i === -1) return [];
				playlist = this._ytPlaylists[i];
				break;
			}
			case ('gd'): {
				const i = this._binarySearch(ref.playlist, this._gdPlaylists);
				if (i === -1) return [];
				playlist = this._gdPlaylists[i];
				break;
			}
		}

		// if a song id is given, return that specific song, otherwise return all songs in playlist
		if (ref.id) {
			const s = playlist.getSong(ref.id);
			if (!s) return [];
			return [s];
		}
		return playlist.getAllSongs();
	}

	/**
	 * searchSaved()
	 * 
	 * Searchs all saved sources using given string
	 * @param searchString - String to use to search
	 * @returns results split by source they come from
	 */
	searchSaved(searchString: string) {
		const results: { gd: Array<Song>, yt: Array<Song> } = {
			gd: [],
			yt: []
		};

		for (let i = 0; i < this._gdPlaylists.length; i++) { results.gd.push(...this._gdPlaylists[i].search(searchString)); }
		for (let i = 0; i < this._ytPlaylists.length; i++) { results.yt.push(...this._ytPlaylists[i].search(searchString)); }

		return results;
	}

	/**
	 * export()
	 * 
	 * Exports the settings in the format to be saved in database		
	 * @returns object to be saved in database
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