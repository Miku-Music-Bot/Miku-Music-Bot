import * as mongoDb from 'mongodb';

import GuildComponent from '../GuildComponent';
import type GuildHandler from '../../GuildHandler';
import AudioSettings from './Settings/AudioSettings';
import GuildSettings from './Settings/GuildSettings';
import PermissionSettings from './Settings/PermissionSettings';
import { GuildConfig } from './Settings/config/guildConfig';
import { AudioConfig, EQConfig } from './Settings/config/audioConfig';
import { PermissionsConfig } from './Settings/config/permissionConfig';

const MONGODB_URI = process.env.MONGODB_URI;											// mongodb connection uri
const MONGODB_DBNAME = process.env.MONGODB_DBNAME;										// name of bot database
const GUILDDATA_COLLECTION_NAME = process.env.GUILDDATA_COLLECTION_NAME || 'Guilds';	// name of collection for guild data

type DatabaseData = {
	guildId: string,
	guildConfig?: GuildConfig,
	audioConfig: { audio: AudioConfig, eq: EQConfig },
	permissionConfig: PermissionsConfig
}

/**
 * GuildData
 *
 * Abstracts away database connection
 * Handles getting and setting guild settings
 */
export default class GuildData extends GuildComponent {
	guildSettings: GuildSettings;
	audioSettings: AudioSettings;
	permissionSettings: PermissionSettings;
	private _guildId: string;
	private _collection: mongoDb.Collection;
	private _saveTimeout: NodeJS.Timeout;
	private _retrySave: NodeJS.Timer;

	/**
	 * @param guildHandler - guild handler for guild this guildData object is responsible for
	 * @param id - discord guild id
	 * @param cb - callback for when done getting data
	 */
	constructor(guildHandler: GuildHandler, id: string, cb: () => void) {
		super(guildHandler);
		this._guildId = id;

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
		if (wait > 60000) { wait = 60000; }

		try {
			this.debug('Connecting to mongodb database');

			// connect to mongodb database
			const dbClient = new mongoDb.MongoClient(MONGODB_URI);
			await dbClient.connect();

			const db = dbClient.db(MONGODB_DBNAME);
			this._collection = db.collection(GUILDDATA_COLLECTION_NAME);

			// grab guild data from the database
			this.debug('Requesting settings from database');
			const foundGuild = await this._collection.findOne({ guildId: this._guildId }) as unknown as DatabaseData;

			if (foundGuild) {
				// if guild is in database, set things up with correct config
				this.guildSettings = new GuildSettings(foundGuild.guildConfig);
				this.audioSettings = new AudioSettings(foundGuild.audioConfig);
				this.permissionSettings = new PermissionSettings(foundGuild.permissionConfig);
			}
			else {
				// if guild is not found in database, save defaults to database
				this.guildSettings = new GuildSettings();
				this.audioSettings = new AudioSettings();
				this.permissionSettings = new PermissionSettings();

				const newData: DatabaseData = {
					guildId: this._guildId,
					guildConfig: this.guildSettings.export(),
					audioConfig: this.audioSettings.export(),
					permissionConfig: this.permissionSettings.export(),
				};

				await this._collection.insertOne(newData);
			}

			this.guildSettings.on('newSettings', () => { this._save(); });
			this.audioSettings.on('newSettings', () => { this._save(); });
			this.permissionSettings.on('newSettings', () => { this._save(); });

			cb();				// call callback once done
		} catch (error) {
			this.error(`{error: ${error}} retrieving/saving data from database. Trying again in ${wait} seconds...`);
			setTimeout(() => { this._initData(wait * 10, cb); }, wait);
		}
	}

	/**
	 * _save()
	 * 
	 * Queues up save to database to prevent spamming
	 */
	private _save() {
		clearTimeout(this._saveTimeout);
		this._saveTimeout = setTimeout(() => { this._saveData(); }, 1000);
	}

	/**
	 * saveData()
	 *
	 * Saves guildData to database
	 */
	private async _saveData() {
		clearInterval(this._retrySave);
		try {
			const newData: DatabaseData = {
				guildId: this._guildId,
				guildConfig: this.guildSettings.export(),
				audioConfig: this.audioSettings.export(),
				permissionConfig: this.permissionSettings.export(),
			};
			await this._collection.replaceOne({ guildId: this._guildId }, newData);
		} catch (error) {
			this.error(`{error: ${error}} saving data from database. Trying again in 1 min`);
			this._retrySave = setInterval(() => this._saveData(), 60000);
		}
	}

	// getter for guildId
	get guildId() { return this._guildId; }
}