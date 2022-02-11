import * as mongoDb from 'mongodb';

import { GuildComponent } from './GuildComponent.js';
import type { GuildHandler } from './GuildHandler.js';

const MONGODB_URI = process.env.MONGODB_URI;											// mongodb connection uri
const MONGODB_DBNAME = process.env.MONGODB_DBNAME;										// name of bot database
const GUILDDATA_COLLECTION_NAME = process.env.GUILDDATA_COLLECTION_NAME || 'Guilds';	// name of collection for guild data

/**
 * GuildData
 *
 * Abstracts away database connection
 * Handles getting and setting guild settings
 */
export class GuildData extends GuildComponent {
	guildId: string;
	collection: mongoDb.Collection;
	configured: boolean;
	channelId: string;
	prefix: string;
	playlists: Array<string>;
	permissions: { [key: string]: Array<string> };
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
	 * initData()
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
		if (!wait) {
			wait = 1000;
		}
		if (wait > 60000) {
			wait = 60000;
		}

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

			if (foundGuild) {
				// if guild data exists in database, set variables based on it
				this.configured = foundGuild.configured;
				this.channelId = foundGuild.channelId;
				this.prefix = foundGuild.prefix;
				this.playlists = foundGuild.playlists;
				this.permissions = foundGuild.permissions;

				this.debug(`Guild data retrieved. {data:${JSON.stringify(this.getData(), null, 4)}}`);
			} else {
				// if guild is not found in database, set defaults
				this.info('No guild data found, using defaults');
				this.configured = false;
				this.channelId = undefined;
				this.prefix = '!miku ';
				this.playlists = [];
				this.permissions = {};

				await this.collection.insertOne(this.getData());
			}

			cb();				// call callback once done
		} catch (error) {
			this.error(`{error: ${error}} retrieving/saving data from database. Trying again in ${wait} seconds...`);
			setTimeout(() => {
				this._initData(wait * 10, cb);
			}, wait);
		}
	}

	/**
	 * saveData()
	 *
	 * Saves guildData to database
	 */
	async saveData() {
		clearInterval(this._retrySave);
		this.debug('Saving data!');
		const result = await this.collection.replaceOne({ guildId: this.guildId }, this.getData());

		// check if save was successful or not
		if (result.modifiedCount === 1) {
			this.debug('Data save successful');
		} else {
			this.error('Data save failed, retrying in 1 min');
			this._retrySave = setInterval(() => this.saveData(), 60000);
		}
	}

	/**
	 * setConfigured()
	 *
	 * Sets configured status
	 * @param configured - configured or not
	 */
	setConfigured(configured: boolean) {
		this.debug(`Guild data: configured set to ${configured}`);
		this.configured = configured;
		this.saveData();
	}

	/**
	 * setChannel()
	 *
	 * Sets the channel id of bot
	 * @param id - discord channel id string
	 */
	setChannel(id: string) {
		this.debug(`Guild data: channelId set to ${id}`);
		this.channelId = id;
		this.saveData();
	}

	/**
	 * setPrefix()
	 *
	 * Sets the channel id of bot
	 * @param prefix - new prefix to use
	 */
	setPrefix(prefix: string) {
		this.debug(`Guild data: prefix set to ${prefix}`);
		this.prefix = prefix;
		this.saveData();
	}

	/**
	 * setPermissions()
	 *
	 * Set the permissions of the bots
	 * @param permissions - new permissions of the bat
	 */
	setPermissions(permissions: { [key: string]: Array<string> }) {
		this.debug(`Guild data: permissions set to ${JSON.stringify(permissions)}`);
		this.permissions = permissions;
		this.saveData();
	}

	/**
	 * getData()
	 *
	 * @return object containing bot settings
	 */
	getData() {
		return {
			configured: this.configured,
			guildId: this.guildId,
			channelId: this.channelId,
			prefix: this.prefix,
			playlists: this.playlists,
			permissions: this.permissions,
		};
	}
}