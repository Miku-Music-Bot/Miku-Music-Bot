import * as ytpl from 'ytpl';
import { EventEmitter } from 'events';

import GuildHandler from '../../../../GuildHandler';
import GuildComponent from '../../../GuildComponent';
import Playlist from '../Playlist';
import { PlaylistConfig, PLAYLIST_DEFAULT } from '../sourceConfig';
import YTSong from './YTSong';

export default class YTPlaylist extends GuildComponent implements Playlist {
	events: EventEmitter;
	private _id: number;
	private _title: string;
	private _url: string;
	private _songs: Array<YTSong>;

	/**
	 * @param guildHandler
	 * @param info - songInfo of song you want to create
	 */
	constructor(guildHandler: GuildHandler, plInfo: PlaylistConfig) {
		super(guildHandler);
		this.events = new EventEmitter();

		// set defaults
		let save = false;
		const info = Object.assign({}, PLAYLIST_DEFAULT);
		if (!plInfo.id) {
			save = true;
			info.id = this.data.guildSettings.songIdCount;
			this.data.guildSettings.songIdCount++;
		}
		Object.assign(info, plInfo);

		this._id = info.id;
		this._title = info.title;
		this._url = info.url;
		this._songs = [];

		// Create songs
		for (let i = 0; i < info.songs.length; i++) {
			const song = new YTSong(this.guildHandler, info.songs[i]);
			this._addSong(song);
			song.events.on('newSettings', () => { this.events.emit('newSettings'); });
		}

		if (save) { this.events.emit('newSettings'); }
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
		const middle = Math.round((left + right) / 2);
		if (!array[middle]) return array.length;
		if (array[middle].id < id) { return middle + 1; }
		return middle;
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
	 * _addSong()
	 * 
	 * Adds a song to the playlist and keeps it sorted
	 * @param song - song to add to playlist
	 */
	private _addSong(song: YTSong) {
		const i = this._binaryInsert(song.id, this._songs);
		if (i === -1) return;
		this._songs.splice(i, 0, song);
		song.events.on('newSettings', () => { this.events.emit('newSettings'); });
		this.events.emit('newSettings');
	}

	/**
	 * removeSong()
	 * 
	 * Removes specified song from individual songs
	 * @param id - song id to remove from individual songs
	 */
	private _removeSong(id: number) {
		const i = this._binarySearch(id, this._songs);
		if (i === -1) return;
		this._songs.splice(i, 1);
		this.events.emit('newSettings');
	}

	/**
	 * fetchData()
	 * 
	 * Grabs updated info for playlist
	 */
	async fetchData() {
		try {
			const info = await ytpl(this._url);
			if (!info) {
				this.info(`No song info found for playlist with {url: ${this._url}}`);
				return;
			}
			this._title = info.title;
			this._url = info.url;

			// compares urls of objects in the two arrays, creating array of items that don't yet existing in songs
			const notExisting = info.items.filter(
				// grab url of element in info
				({ shortUrl: urlInInfo }) => {
					// check to see if an element in existing songs contains that same url
					return !this._songs.some(
						// grab url of element in info
						({ url: urlInSongs }) => {
							// see if urls match
							return urlInSongs === urlInInfo;
						});
				});

			// do the same thing but reversed, creating array of items in songs but not in items
			const removed = this._songs.filter(({ url: urlInSongs }) => !info.items.some(({ shortUrl: urlInInfo }) => urlInInfo === urlInSongs));

			// add new non existing songs to songs
			for (let i = 0; i < notExisting.length; i++) {
				// add new song after creating it
				const song = new YTSong(this.guildHandler, {
					title: notExisting[i].title,
					url: notExisting[i].shortUrl,
					duration: notExisting[i].durationSec,
					thumbnailURL: notExisting[i].bestThumbnail.url,
					artist: notExisting[i].author.name,
					live: notExisting[i].isLive
				});
				this._addSong(song);
			}

			// remove removed songs from songs
			for (let i = 0; i < removed.length; i++) {
				this._removeSong(removed[i].id);
			}
		}
		catch (error) {
			console.log(error);
			this.error(`{error: ${error}} while updating info for playlist with {url: ${this._url}}`);
		}
	}

	/**
	 * getSong()
	 * 
	 * Gets the song with the specified index
	 * @param id - id of song to get
	 * @returns Song if found, undefined if not
	 */
	getSong(id: number) {
		const i = this._binarySearch(id, this._songs);
		if (i === -1) return undefined;
		return this._songs[i];
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