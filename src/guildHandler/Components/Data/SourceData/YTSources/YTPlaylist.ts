import Fuse from 'fuse.js';
import path from 'path';
import ytpl = require('ytpl');
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

import GuildHandler from '../../../../GuildHandler';
import GuildComponent from '../../../GuildComponent';
import Playlist from '../Playlist';
import { PlaylistConfig, PLAYLIST_DEFAULT } from '../sourceConfig';
import YTSong from './YTSong';

type EventTypes = {
	newSettings: () => void,
}

const SEARCH_THRESHOLD = parseFloat(process.env.SEARCH_THRESHOLD);
const SEARCH_DISTANCE = parseInt(process.env.SEARCH_DISTANCE);

export default class YTPlaylist extends GuildComponent implements Playlist {
	events: TypedEmitter<EventTypes>;
	private _type: 'yt';
	private _id: number;
	private _title: string;
	private _url: string;
	private _songs: Array<YTSong>;
	private _index: Fuse<YTSong>;

	/**
	 * @param guildHandler
	 * @param info - songInfo of song you want to create
	 */
	constructor(guildHandler: GuildHandler, plInfo?: PlaylistConfig) {
		super(guildHandler, path.basename(__filename));
		this.events = new EventEmitter() as TypedEmitter<EventTypes>;

		// set defaults
		let save = false;
		const info = Object.assign({}, PLAYLIST_DEFAULT);
		if (!plInfo || !plInfo.id) {
			save = true;
			plInfo.id = this.data.guildSettings.playlistIdCount;
			this.data.guildSettings.playlistIdCount++;
		}
		Object.assign(info, plInfo);
		this._type = 'yt';
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
			const song = new YTSong(this.guildHandler, info.songs[i]);
			this.addSong(song);
		}

		if (save) { this.events.emit('newSettings'); }
	}

	/**
	 * addSong()
	 * 
	 * Checks if song already exists in playlist anda dds a song to the playlist
	 * @param song - song to add to playlist
	 */
	addSong(song: YTSong): void {
		this.debug(`Adding song with {url:${song.url}}`);
		// remove the song just in case it already exists
		this._removeSong(song.id);
		this._index.add(song);
		song.events.on('newSettings', (s) => {
			this.debug(`Song with {url:${s.url}} has new settings, saving`);
			this.addSong(s);
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
	private _removeSong(id: number): void {
		this.debug(`Removing song with {id:${id}}`);
		// find item that exactly matches id property
		const results = this._index.search({
			$and: [{ id: '=' + id }]
		});
		if (results.length === 0) {
			this.debug(`No song with {id:${id}} found, nothing removed`);
			return;
		}
		this._index.removeAt(results[0].refIndex);
		this.events.emit('newSettings');
	}

	/**
	 * fetchData()
	 * 
	 * Grabs updated info for playlist
	 */
	async fetchData(): Promise<void> {
		if (!this._url) return;
		try {
			this.debug(`Fetching data for playlist with {url:${this._url}}`);
			const info = await ytpl(this._url);
			if (!info) {
				this.info(`No song info found for playlist with {url:${this._url}}`);
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
			this.debug(`Found ${notExisting.length} songs that aren't in the playlist yet`);
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
				this.addSong(song);
			}

			// remove removed songs from songs
			this.debug(`Found ${removed.length} songs that aren't in the playlist anymore`);
			for (let i = 0; i < removed.length; i++) {
				this._removeSong(removed[i].id);
			}
		}
		catch (error) {
			this.error(`{error: ${error.message}} while updating info for playlist with {url: ${this._url}}. {stack:${error.stack}}`);
		}
	}

	/**
	 * getSong()
	 * 
	 * Gets the song with the specified index
	 * @param id - id of song to get
	 * @returns Song if found, undefined if not
	 */
	getSong(id: number): YTSong {
		this.debug(`Getting song with {id:${id}}`);
		// search for song that exactly matches id property
		const results = this._index.search({
			$and: [{ id: `=${id}` }]
		});

		if (results.length === 0) {
			this.debug(`Song with {id:${id}} not found, returning nothing`);
			return undefined;
		}
		return results[0].item;
	}

	/**
	 * getAllSongs()
	 * 
	 * Gets all the songs in this playlist
	 * @returns Array containing all songs in the playlist
	 */
	getAllSongs(): Array<YTSong> { return this._songs; }


	/**
	 * search()
	 * 
	 * @param searchString - string used to search
	 * @returns array of songs that matched 
	 */
	search(searchString: string): Array<YTSong> {
		return this._index.search(searchString).map((a) => a.item);
	}

	/**
	 * export()
	 * 
	 * Exports the settings in the format to be saved in database		
	 * @returns object to be saved in database
	 */
	export(): PlaylistConfig {
		const songs = [];
		for (let i = 0; i < this._songs.length; i++) { songs.push(this._songs[i].export()); }
		return {
			id: this._id,
			title: this._title,
			url: this._url,
			songs
		};
	}

	get type() { return this._type; }
	get id() { return this._id; }
	get title() { return this._title; }
	get url() { return this._url; }
}