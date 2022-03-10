import Fuse from 'fuse.js';
import * as path from 'path';
import { EventEmitter } from 'events';

import GuildHandler from '../../../../GuildHandler';
import GuildComponent from '../../../GuildComponent';
import Playlist from '../Playlist';
import { PlaylistConfig, PLAYLIST_DEFAULT } from '../sourceConfig';
import GDSong from './GDSong';

const SEARCH_THRESHOLD = parseFloat(process.env.SEARCH_THRESHOLD);
const SEARCH_DISTANCE = parseInt(process.env.SEARCH_DISTANCE);

export default class GDPlaylist extends GuildComponent implements Playlist {
	events: EventEmitter;
	private _id: number;
	private _title: string;
	private _url: string;
	private _songs: Array<GDSong>;
	private _index: Fuse<GDSong>;

	/**
	 * @param guildHandler
	 * @param info - songInfo of song you want to create
	 */
	constructor(guildHandler: GuildHandler, plInfo?: PlaylistConfig) {
		super(guildHandler, path.basename(__filename));
		this.events = new EventEmitter();

		// set defaults
		let save = false;
		const info = Object.assign({}, PLAYLIST_DEFAULT);
		if (!plInfo || !plInfo.id) {
			save = true;
			plInfo.id = this.data.guildSettings.playlistIdCount;
			this.data.guildSettings.playlistIdCount++;
		}
		Object.assign(info, plInfo);
		this._id = info.id;
		this._title = info.title;
		this._url = info.url;
		this._songs = [];

		// Create fuse index
		this._index = new Fuse(this._songs, {
			distance: SEARCH_DISTANCE,
			threshold: SEARCH_THRESHOLD,
			useExtendedSearch: true,
			keys: ['id', 'title', 'artist', 'url']
		});

		// Create songs
		for (let i = 0; i < info.songs.length; i++) {
			const song = new GDSong(this.guildHandler, info.songs[i]);
			this._addSong(song);
		}

		if (save) { setImmediate(() => { this.events.emit('newSettings', this); }); }
	}

	/**
	 * _addSong()
	 * 
	 * Checks if song already exists in playlist anda dds a song to the playlist
	 * @param song - song to add to playlist
	 */
	private _addSong(song: GDSong) {
		// remove the song just in case it already exists
		this._removeSong(song.id);
		this._index.add(song);
		song.events.on('newSettings', (s) => {
			this._addSong(s);
			this.events.emit('newSettings');
		});
		this.events.emit('newSettings');
	}

	/**
	 * removeSong()
	 * 
	 * Removes specified song from individual songs
	 * @param id - song id to remove from individual songs
	 */
	private _removeSong(id: number) {
		// find item that exactly matches id property
		const results = this._index.search({
			$and: [{ id: '=' + id }]
		});
		if (results.length === 0) return;
		this._index.removeAt(results[0].refIndex);
		this.events.emit('newSettings');
	}

	/**
	 * _getIdFromUrl()
	 * 
	 * Get's the file or folder id from a url
	 * @param url - google drive url
	 * @returns google drive file/folder id
	 */
	private _getIdFromUrl(url: string) { return url.match(/[-\w]{25,}(?!.*[-\w]{25,})/)[0]; }

	/**
	 * fetchData()
	 * 
	 * Grabs updated info for playlist
	 */
	async fetchData(): Promise<void> {
		return new Promise((resolve) => {
			if (!this._url) { resolve(); return; }
			try {
				const id = this._getIdFromUrl(this._url);
				if (!id) {
					this.error(`Google drive song with {url: ${this._url}} does not have a valid file id`);
					resolve();
					return;
				}

				// Get name of folder
				this.drive.files.get({ fileId: id }, (err, res) => {
					if (err) {
						this.error(`{error: ${err}} while getting info from google drive for folder with {url: ${this._url}}`);
						resolve();
						return;
					}
					this._title = res.data.name;
				});

				// Get all of the files in the folder
				const list: Array<{ id: string, name: string }> = [];
				const fetchItems = (nextPageToken?: string): Promise<void> => {
					return new Promise((resolve) => {
						this.drive.files.list({
							q: `'${id}' in parents and trashed = false`,
							pageSize: 1000,
							fields: 'nextPageToken, files(id, name)',
							pageToken: nextPageToken
						}, (err, res) => {
							if (err) {
								this.error(`{error: ${err}} while getting info from google drive for folder with {url: ${this._url}}`);
								resolve();
								return;
							}
							list.push(...res.data.files as Array<{ id: string, name: string }>);
							// if we have exactly the maximum files, fetch more items
							if (res.data.files.length === 1000) { fetchItems(res.data.nextPageToken).then(() => resolve()); }
							else { resolve(); }
						});
					});
				};
				fetchItems()
					.then(() => {
						// compares urls of objects in the two arrays, creating array of items that don't yet existing in songs
						const notExisting = list.filter(
							// grab url of element in info
							({ id: urlInInfo }) => {
								// check to see if an element in existing songs contains that same url
								return !this._songs.some(
									// grab url of element in info
									({ url: urlInSongs }) => {
										// see if urls match
										return urlInSongs === this._getIdFromUrl(urlInInfo);
									});
							});

						// do the same thing but reversed, creating array of items in songs but not in items
						const removed = this._songs.filter(({ url: urlInSongs }) => !list.some(({ id: urlInInfo }) => this._getIdFromUrl(urlInInfo) === urlInSongs));

						// add new non existing songs to songs
						for (let i = 0; i < notExisting.length; i++) {
							// add new song after creating it
							const song = new GDSong(this.guildHandler, { title: notExisting[i].name, url: `https://drive.google.com/file/d/${notExisting[i].id}` });
							const fileNameSplit = notExisting[i].name.split('.');
							song.ext = fileNameSplit[fileNameSplit.length - 1];
							this._addSong(song);
						}

						// remove removed songs from songs
						for (let i = 0; i < removed.length; i++) {
							this._removeSong(removed[i].id);
						}

						resolve();
					});
			}
			catch (error) {
				this.error(`{error: ${error}} while updating info for playlist with {url: ${this._url}}`);
				resolve();
			}
		});
	}

	/**
	 * getSong()
	 * 
	 * Gets the song with the specified index
	 * @param id - id of song to get
	 * @returns Song if found, undefined if not
	 */
	getSong(id: number) {
		// search for song that exactly matches id property
		const results = this._index.search({
			$and: [{ id: `=${id}` }]
		});

		if (results.length === 0) return undefined;
		return results[0].item;
	}

	/**
	 * getAllSongs()
	 * 
	 * Gets all the songs in this playlist
	 * @returns Array containing all songs in the playlist
	 */
	getAllSongs() { return this._songs; }


	/**
	 * search()
	 * 
	 * @param searchString - string used to search
	 * @returns array of songs that matched 
	 */
	search(searchString: string) {
		return this._index.search(searchString).map((a) => a.item);
	}

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