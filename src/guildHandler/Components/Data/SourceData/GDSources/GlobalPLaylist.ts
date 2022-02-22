import { EventEmitter } from 'events';

import GuildHandler from '../../../../GuildHandler';
import GuildComponent from '../../../GuildComponent';
import Song from '../Songs/Song';
import { SongRef } from '../Songs/songConfig';
import YTSong from '../Songs/YTSong';
import Playlist from './Playlist';
import { PlaylistConfig, PLAYLIST_DEFAULT } from './playlistConfig';

/**
 * GlobalPlaylist
 * 
 * Represents the global playlist where all saved songs and playlists are saved
 */
export default class GlobalPLaylist extends GuildComponent implements Playlist {
	events: EventEmitter;
	private _id: number;
	private _type: 'yt' | 'gd' | 'ud' | 'global';
	private _songs: Array<Song>;
	private _playlists: Array<Playlist>;

	/**
	 * @param guildHandler
	 * @param settings - settings for playlist
	 */
	constructor(guildHandler: GuildHandler, settings?: PlaylistConfig) {
		super(guildHandler);
		this.events = new EventEmitter();

		// set defaults
		let save = false;
		if (!settings) {
			save = true;
			settings = PLAYLIST_DEFAULT;
			settings.id = this.data.guildSettings.playlistIdCount;
			settings.type = 'global';
			this.data.guildSettings.playlistIdCount++;
		}

		this._id = settings.id;
		this._type = settings.type;
		this._songs = [];
		this._playlists = [];

		for (let i = 0; i < settings.songs.length; i++) {
			switch (settings.songs[i].type) {
				case ('yt'): {
					this._songs.push(new YTSong(this.guildHandler, settings.songs[i]));
					break;
				}
			}
		}

		for (let i = 0; i < settings.playlists.length; i++) {
			switch (settings.playlists[i].type) {
				case ('yt'): {
					this._playlists.push();
					break;
				}
			}
		}

		if (save) { this.events.emit('newSettings'); }
	}

	/**
	 * _binaryInsert()
	 * 
	 * @param id - id to search for
	 * @param array - array to search in
	 * @returns location to insert at or null if already exists
	 */
	private _binaryInsert(id: number, array: Array<{ id: number }>) {
		let left = 0;
		let right = array.length - 1;
		while (left <= right) {
			const middle = Math.round((left + right) / 2);
			if (array[middle].id === id) { return null; }

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
	 * @param id - id to search for
	 * @param array - array to search in
	 * @returns location found for null is doesnt exist
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
		return null;
	}

	/**
	 * addSong()
	 * 
	 * Adds a song to the playlist and keeps it sorted
	 * @param song - song to add to playlist
	 */
	addSong(song: Song) {
		const i = this._binaryInsert(song.id, this._songs);
		if (i) {
			this.events.emit('newSettings');
			this._songs.splice(i, 0, song);
		}
	}

	/**
	 * getSong()
	 * 
	 * Gets a song from the using the reference given
	 * @param ref - reference to the song
	 */
	getSong(ref: SongRef): Song {
		if (ref.playlist[0] === this._id) { ref.playlist.shift(); }

		// if no more playlists to go down, return the song
		if (ref.playlist.length === 0) {
			const i = this._binarySearch(ref.id, this._songs);
			if (i) return this._songs[i];
			return null;
		}

		// if there are more playlists to go down, keep going
		const i = this._binarySearch(ref.playlist[0], this._playlists);
		if (i) return this._playlists[i].getSong(ref);
		return null;
	}

	/**
	 * export()
	 * 
	 * Exports the settings in the format to be saved in database
	 * @returns object to be saved in database
	 */
	export() {
		const config: PlaylistConfig = {
			id: this._id,
			type: this._type,
			songs: [],
			playlists: []
		};

		for (let i = 0; i < this._songs.length; i++) {
			config.songs.push(this._songs[i].export());
		}

		for (let i = 0; i < this._playlists.length; i++) {
			config.playlists.push(this._playlists[i].export());
		}

		return config;
	}

	get id() { return this._id; }
	get type() { return this._type; }
}