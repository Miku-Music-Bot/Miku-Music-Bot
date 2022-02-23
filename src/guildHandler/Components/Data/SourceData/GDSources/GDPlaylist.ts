import { EventEmitter } from 'events';

import GuildHandler from '../../../../GuildHandler';
import GuildComponent from '../../../GuildComponent';
import Playlist from '../Playlist';
import { PlaylistConfig, PLAYLIST_DEFAULT } from '../sourceConfig';
import GDSong from './GDSong';

export default class GDPlaylist extends GuildComponent implements Playlist {
	events: EventEmitter;
	private _id: number;
	private _title: string;
	private _url: string;
	private _songs: Array<GDSong>;

	/**
	 * @param guildHandler
	 * @param info - songInfo of song you want to create
	 */
	constructor(guildHandler: GuildHandler, info: PlaylistConfig) {
		super(guildHandler);
		this.events = new EventEmitter();

		// set defaults
		let save = false;
		if (!info) {
			save = true;
			info = PLAYLIST_DEFAULT;
			info.id = this.data.guildSettings.songIdCount;
			this.data.guildSettings.songIdCount++;
		}

		// Create songs
		for (let i = 0; i < info.songs.length; i++) { this._songs.push(new GDSong(this.guildHandler, info.songs[i])); }

		if (save) { this.events.emit('newSettigns'); }
	}

	async fetchData() {
		//
	}

	/**
	 * getSong()
	 * 
	 * Gets the song with the specified index
	 * @param id - id of song to get
	 * @returns Song if found, undefined if not
	 */
	getSong(id: number) {
		return this._songs[id];
	}

	/**
	 * getAllSongs()
	 * 
	 * Gets all the songs in this playlist
	 * @returns Array containing all songs in the playlist
	 */
	getAllSongs() { return this._songs; }

	/**
	 * export()
	 * 
	 * Exports the settings in the format to be saved in database		
	 * @returns object to be saved in database
	 */
	export() {
		const songs = [];
		for (let i = 0; i < this._songs.length; i++) { songs.push(this._songs[i].export()); }
		return {
			id: this._id,
			title: this._title,
			url: this._url,
			songs
		};
	}

	get id() { return this._id; }
	get title() { return this._title; }
	get url() { return this._url; }
}