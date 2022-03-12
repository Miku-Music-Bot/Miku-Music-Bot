import fs from 'fs';
import path from 'path';
import mm from 'music-metadata';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import ffmpeg = require('fluent-ffmpeg');
import ffmpegPath = require('ffmpeg-static');
import crypto from 'crypto';

import Song from '../Song';
import GuildComponent from '../../../GuildComponent';
import type GuildHandler from '../../../../GuildHandler';
import { SongConfig, SONG_DEFAULT } from '../sourceConfig';

type EventTypes = {
	newSettings: (song: GDSong) => void,
}

const TEMP_DIR = process.env.TEMP_DIR;
const BOT_DOMAIN = process.env.BOT_DOMAIN;
const ASSETS_LOC = process.env.ASSETS_LOC;

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * GDSong
 *
 * Represents a song from google drive
 */
export default class GDSong extends GuildComponent implements Song {
	events: TypedEmitter<EventTypes>;
	private _songInfo: SongConfig;

	/**
	 * @param guildHandler
	 * @param info - songInfo of song you want to create
	 */
	constructor(guildHandler: GuildHandler, info: SongConfig) {
		super(guildHandler, path.basename(__filename));
		this.events = new EventEmitter() as TypedEmitter<EventTypes>;

		// set defaults
		let save = false;
		this._songInfo = Object.assign({}, SONG_DEFAULT);
		this._songInfo.type = 'gd';
		this._songInfo.live = false;
		if (!info.id) {
			save = true;
			this._songInfo.id = this.data.guildSettings.songIdCount;
			this.data.guildSettings.songIdCount++;
		}
		Object.assign(this._songInfo, info);

		if (save) { this.events.emit('newSettings', this); }
	}

	/**
	 * _getIdFromUrl()
	 * 
	 * Get's the file or folder id from a url
	 * @param url - google drive url
	 * @returns google drive file/folder id
	 */
	getIdFromUrl(url: string): string { return url.match(/[-\w]{25,}(?!.*[-\w]{25,})/)[0]; }

	/**
	 * fetchData()
	 * 
	 * Grabs updated info for song
	 * @param save - don't delete the temp file or not
	 * @returm promise that resolves to location of temp file
	 */
	async fetchData(save?: boolean): Promise<string> {
		this.debug(`Fetching data for song with {url:${this._songInfo.url}}`);
		return new Promise((resolve) => {
			const tempLocation = path.join(TEMP_DIR, crypto.createHash('md5').update(this._songInfo.url + Math.floor(Math.random() * 1000000000000000).toString()).digest('hex') + `.${this.ext}`);
			this.debug(`Downloading song from google drive to {location:${tempLocation}}`);
			try {
				const id = this.getIdFromUrl(this._songInfo.url);
				if (!id) {
					this.error(`Google drive song with {url: ${this._songInfo.url}} does not have a valid file id`);
					resolve(tempLocation);
					return;
				}

				this.drive.files.get(
					{ fileId: id, alt: 'media' },
					{ responseType: 'stream' },
					async (error, res) => {
						if (error) {
							this.error(`{error: ${error.message}} while getting info from google drive for song with {url: ${this._songInfo.url}}. {stack:${error.stack}}`);
							resolve(tempLocation);
							return;
						}

						res.data.pipe(fs.createWriteStream(tempLocation));

						res.data.on('end', async () => {
							try {
								const metadata = await mm.parseFile(tempLocation);

								if (!metadata || !metadata.common || !metadata.format) return;
								if (metadata.common.title) { this._songInfo.title = metadata.common.title; }
								if (metadata.common.artist) { this._songInfo.artist = metadata.common.artist; }
								if (metadata.format.duration) { this._songInfo.duration = Math.round(metadata.format.duration); }

								ffmpeg(tempLocation)
									.audioCodec('copy')
									.videoCodec('copy')
									.output(path.join(ASSETS_LOC, 'thumbnails', `${id}.jpg`))
									.on('end', async () => {
										this._songInfo.thumbnailURL = `${BOT_DOMAIN}/thumbnails/${id}.jpg`;
										if (!save) { try { await fs.promises.unlink(tempLocation); } catch { /* */ } }
										this.events.emit('newSettings', this);
										resolve(tempLocation);
									})
									.on('error', async (e) => {
										this.warn(`{error: ${e}} while parsing image for song with {url: ${this._songInfo.url}}`);
										if (!save) { try { await fs.promises.unlink(tempLocation); } catch { /* */ } }
										this.events.emit('newSettings', this);
										resolve(tempLocation);
									})
									.run();
							}
							catch (error) {
								this.error(`{error:${error.message}} while parsing metadata for song with {url:${this._songInfo.url}}. {stack:${error.stack}}`);
							}
						});
					});
			}
			catch (error) {
				this.error(`{error: ${error.message}} while updating info for song with {url: ${this._songInfo.url}}. {stack:${error.stack}}`);
				resolve(tempLocation);
			}
		});
	}

	/**
	* export()
	* 
	* Exports the settings in the format to be saved in database
	* @returns object to be saved in database
	*/
	export(): SongConfig {
		const info = Object.assign({}, this._songInfo);
		info.reqBy = '';
		return info;
	}

	// getters
	get id() { return this._songInfo.id; }
	get type() { return this._songInfo.type; }
	get url() { return this._songInfo.url; }
	get title() { return this._songInfo.title; }
	set title(title: string) { this._songInfo.title = title; this.events.emit('newSettings', this); }

	get duration() { return this._songInfo.duration; }
	set duration(duration: number) { this._songInfo.duration = duration; this.events.emit('newSettings', this); }

	get thumbnailURL() { return this._songInfo.thumbnailURL; }
	set thumbnailURL(thumbnailURL: string) { this._songInfo.thumbnailURL = thumbnailURL; this.events.emit('newSettings', this); }

	get artist() { return this._songInfo.artist; }
	set artist(artist: string) { this._songInfo.artist = artist; this.events.emit('newSettings', this); }

	get live() { return this._songInfo.live; }
	get durationString() {
		if (this.live) { return 'Unknown'; }
		let secs = this._songInfo.duration;
		let hours: number | string = Math.floor(secs / 3600);
		if (hours < 10) { hours = '0' + hours.toString(); }
		secs %= 3600;
		let min: number | string = Math.floor(secs / 60);
		if (min < 10) { min = '0' + min.toString(); }
		secs %= 60;
		let sec: number | string = secs;
		if (sec < 10) { sec = '0' + sec.toString(); }
		return `${hours.toString()}:${min.toString()}:${sec.toString()}`;
	}
	get reqBy() { return this._songInfo.reqBy; }
	set reqBy(reqBy: string) { this._songInfo.reqBy = reqBy; }

	get ext() { return this._songInfo.optional.ext; }
	set ext(ext: string) { this._songInfo.optional.ext = ext; }
}
