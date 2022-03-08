import * as path from 'path';
import type { drive_v3 } from 'googleapis';
import mm from 'music-metadata';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import ffmpeg = require('fluent-ffmpeg');
import ffmpegPath = require('ffmpeg-static');

import Song from '../Song';
import GuildComponent from '../../../GuildComponent';
import type GuildHandler from '../../../../GuildHandler';
import { SongConfig, SONG_DEFAULT } from '../sourceConfig';

const BOT_DOMAIN = process.env.BOT_DOMAIN;
const GD_METADATA_READ_AMOUNT = process.env.GD_METADATA_READ_AMOUNT;
const ASSETS_LOC = process.env.ASSETS_LOC;

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * GDSong
 *
 * Represents a song from google drive
 */
export default class GDSong extends GuildComponent implements Song {
	events: EventEmitter;
	private _songInfo: SongConfig;

	/**
	 * @param guildHandler
	 * @param info - songInfo of song you want to create
	 */
	constructor(guildHandler: GuildHandler, info: SongConfig) {
		super(guildHandler);
		this.events = new EventEmitter();

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

		if (save) { setImmediate(() => { this.events.emit('newSettings', this); }); }
	}

	/**
	 * _getIdFromUrl()
	 * 
	 * Get's the file or folder id from a url
	 * @param url - google drive url
	 * @returns google drive file/folder id
	 */
	getIdFromUrl(url: string) { return url.match(/[-\w]{25,}(?!.*[-\w]{25,})/)[0]; }

	/**
	 * fetchData()
	 * 
	 * Grabs updated info for song
	 */
	async fetchData(): Promise<void> {
		return new Promise((resolve) => {
			try {
				setTimeout(() => resolve(), 5000);
				const id = this.getIdFromUrl(this._songInfo.url);
				if (!id) {
					this.error(`Google drive song with {url: ${this._songInfo.url}} does not have a valid file id`);
					resolve();
					return;
				}
				this.drive.files.get(
					{ fileId: id, alt: 'media', headers: { 'Range': `bytes=0-${GD_METADATA_READ_AMOUNT}` } } as drive_v3.Params$Resource$About$Get,
					{ responseType: 'stream' },
					(err, res) => {
						if (err) {
							this.error(`{error: ${err}} while getting info from google drive for song with {url: ${this._songInfo.url}}`);
							resolve();
							return;
						}
						let header = Buffer.alloc(0);
						res.data
							.on('error', (e) => { 
								this.error(`{error: ${e}} while downloading info for song with {url: ${this._songInfo.url}}`); 
								resolve();
							})
							.on('data', (data) => { header = Buffer.concat([header, data]); })
							.on('end', async () => {
								try {
									const metadata = await mm.parseBuffer(header);

									if (!metadata || !metadata.common || !metadata.format) return;
									if (metadata.common.title) { this._songInfo.title = metadata.common.title; }
									if (metadata.common.artist) { this._songInfo.artist = metadata.common.artist; }
									if (metadata.format.duration) { this._songInfo.duration = Math.round(metadata.format.duration); }
									if (metadata.common.artist) { this._songInfo.artist = metadata.common.artist; }

									const pass = new PassThrough();
									ffmpeg(pass)
										.output(path.join(ASSETS_LOC, 'thumbnails', `${id}.jpg`))
										.on('end', () => {
											this._songInfo.thumbnailURL = `${BOT_DOMAIN}/thumbnails/${id}.jpg`;
											this.events.emit('newSettings', this);
											resolve();
										})
										.on('error', (e) => { this.warn(`{error: ${e}} while parsing image for song with {url: ${this._songInfo.url}}`); })
										.run();
									pass.write(header);
									pass.end();
								}
								catch (e) {
									this.error(`{error: ${e}} while parsing metadata for song with {url: ${this._songInfo.url}}`);
									resolve();
								}
							});
					});
			}
			catch (error) {
				this.error(`{error: ${error}} while updating info for song with {url: ${this._songInfo.url}}`);
				resolve();
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
	get duration() { return this._songInfo.duration; }
	get thumbnailURL() { return this._songInfo.thumbnailURL; }
	get artist() { return this._songInfo.artist; }
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
}
