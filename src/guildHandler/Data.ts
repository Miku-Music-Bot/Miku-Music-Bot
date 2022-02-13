import * as mongoDb from 'mongodb';

import GuildComponent from './GuildComponent';
import type GuildHandler from './GuildHandler';
import type { AudioSettingsConfig } from './VCPlayer/AudioSettings';

const MONGODB_URI = process.env.MONGODB_URI;											// mongodb connection uri
const MONGODB_DBNAME = process.env.MONGODB_DBNAME;										// name of bot database
const GUILDDATA_COLLECTION_NAME = process.env.GUILDDATA_COLLECTION_NAME || 'Guilds';	// name of collection for guild data

// type for guild data
type guildDataConfig = {
	configured: boolean,
	channelId: string,
	prefix: string,
	playlists: Array<string>,
	permissions: { [key: string]: Array<string> },
	audioSettings: AudioSettingsConfig
}

// defualt settings for guilds
const DEFAULTCONFIG: guildDataConfig = {
	configured: false,
	channelId: undefined,
	prefix: '!miku ',
	playlists: [],
	permissions: {},
	audioSettings: {}
};

/**
 * GuildData
 *
 * Abstracts away database connection
 * Handles getting and setting guild settings
 */
export default class GuildData extends GuildComponent {
	guildId: string;
	collection: mongoDb.Collection;
	private _guildData: guildDataConfig;
	private _retrySave: NodeJS.Timer;

	/**
	 * @param guildHandler - guild handler for guild this guildData object is responsible for
	 * @param id - discord guild id
	 * @param cb - callback for when done getting data
	 */
	constructor(guildHandler: GuildHandler, id: string, cb: () => void) {
		super(guildHandler);
		this.guildId = id;

		this._initData(1000, cb);
	}

	/**
	 * initdata()
	 *
	 * Initiallizes GuildData
	 * connects to database and tries to get data
	 * if no data exits, creates default values and saves it
	 * if an error occurs, it retries after 10 seconds
	 * calls callback once done
	 * @param wait - amount of time to wait before retrying in case of an error
	 * @param cb - callback for when done getting data
	 */
	private async _initData(wait: number, cb: () => void) {
		if (!wait) { wait = 1000; }
		if (wait > 60000) { wait = 60000; }

		try {
			this.debug('Connecting to mongodb database');

			// connect to mongodb database
			const dbClient = new mongoDb.MongoClient(MONGODB_URI);
			await dbClient.connect();

			const db = dbClient.db(MONGODB_DBNAME);
			this.collection = db.collection(GUILDDATA_COLLECTION_NAME);

			// grab guild data from the database
			this.debug('Requesting settings from database');
			const foundGuild = await this.collection.findOne({ guildId: this.guildId });

			// assume default settings
			Object.assign(this._guildData, DEFAULTCONFIG);
			
			// if guild data exists in database, set variables based on it 
			if (foundGuild) { Object.assign(this._guildData, foundGuild); }
			// if guild is not found in database, save defaults to database
			else { await this.collection.insertOne(this._guildData); }

			cb();				// call callback once done
		} catch (error) {
			this.error(`{error: ${error}} retrieving/saving data from database. Trying again in ${wait} seconds...`);
			setTimeout(() => { this._initData(wait * 10, cb); }, wait);
		}
	}

	/**
	 * savedata()
	 *
	 * Saves guildData to database
	 */
	private async _saveData() {
		clearInterval(this._retrySave);
		try {
			await this.collection.replaceOne({ guildId: this.guildId }, this._guildData);	
		} catch (error) {
			this.error(`{error: ${error}} saving data from database. Trying again in 1 min`);
			this._retrySave = setInterval(() => this._saveData(), 60000);
		}
	}

	// getters and setters
	get configured() { return this._guildData.configured; }
	set configured(configured: boolean) { this._guildData.configured = configured; this._saveData(); }

	get channelId() { return this._guildData.channelId; }
	set channelId(id: string) { this._guildData.channelId = id; this._saveData(); }

	get prefix() { return this._guildData.prefix; }
	set prefix(prefix: string) { this._guildData.prefix = prefix; this._saveData(); }

	get playlists() { return this._guildData.playlists; }
	set playlists(playlists: Array<string>) { this._guildData.playlists = playlists; this._saveData(); }

	get permissions() { return this._guildData.permissions; }
	set permissions(permissions: { [key: string]: Array<string> }) { this._guildData.permissions = permissions; this._saveData(); }

	get audioSettings() { return this._guildData.audioSettings; }
	set audioSettings(audioSettings: AudioSettingsConfig) { this._guildData.audioSettings = audioSettings; this._saveData(); }
}