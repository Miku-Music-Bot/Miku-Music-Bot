import * as mongoDb from 'mongodb';
import path from 'path';

import GuildComponent from '../GuildComponent';
import type GuildHandler from '../../GuildHandler';
import AudioSettings from './Settings/AudioSettings';
import GuildSettings from './Settings/GuildSettings';
import PermissionSettings from './Settings/PermissionSettings';
import SourceManager from './SourceData/SourceManager';
import { GuildConfig } from './Settings/config/guildConfig';
import { AudioConfig, EQConfig } from './Settings/config/audioConfig';
import { PermissionsConfig } from './Settings/config/permissionConfig';
import { SourceDataConfig } from './SourceData/sourceConfig';

type DatabaseData = {
	guildId: string,
	guildConfig?: GuildConfig,
	audioConfig: { audio: AudioConfig, eq: EQConfig },
	permissionConfig: PermissionsConfig
	sourceDataConfig: SourceDataConfig
}

/**
 * @name GuildData
 * Abstracts away database connection
 * Handles getting and setting guild settings
 */
export default class GuildData extends GuildComponent {
	guildSettings: GuildSettings;						// guild settings component
	audioSettings: AudioSettings;						// audio settings component
	permissionSettings: PermissionSettings;				// permissions settings component
	sourceManager: SourceManager;						// sourceManager component
	private _saveCount = 0;								// how many saves are in queue
	private _collection: mongoDb.Collection;			// mongodb collection
	private _saveTimeout: NodeJS.Timeout;				// timeout for saving
	private _retrySave: NodeJS.Timer;					// timeout for retrying save

	constructor(guildHandler: GuildHandler) { super(guildHandler, path.basename(__filename)); }

	/**
	 * @name initdata()
	 * Initiallizes GuildData
	 * connects to database and tries to get data
	 * if no data exits, creates default values and saves it
	 * if an error occurs, it retries after 10 seconds
	 * calls callback once done
	 */
	initData(): Promise<void> {
		return new Promise((resolve) => {
			const _initData = async (wait: number) => {
				if (wait > this.config.MAX_DATABASE_RETRY_WAIT) { wait = this.config.MAX_DATABASE_RETRY_WAIT; }

				try {
					this.debug('Connecting to mongodb database');

					const db = this.dbClient.db(this.config.MONGODB_DBNAME);
					this._collection = db.collection(this.config.GUILDDATA_COLLECTION_NAME);

					// grab guild data from the database
					this.debug('Requesting settings from database');
					const foundGuild = await this._collection.findOne({ guildId: this.guildHandler.id }) as unknown as DatabaseData;

					if (foundGuild) {
						// if guild is in database, set things up with correct config
						this.debug('Found guild data in database, initiallizing components');
						this.guildSettings = new GuildSettings(foundGuild.guildConfig);
						this.audioSettings = new AudioSettings(foundGuild.audioConfig);
						this.permissionSettings = new PermissionSettings(foundGuild.permissionConfig);
						this.sourceManager = new SourceManager(this.guildHandler, foundGuild.sourceDataConfig);
					}
					else {
						// if guild is not found in database, save defaults to database
						this.debug('Did not find guild data in database, using defaults');
						this.guildSettings = new GuildSettings();
						this.audioSettings = new AudioSettings();
						this.permissionSettings = new PermissionSettings();
						this.sourceManager = new SourceManager(this.guildHandler);

						const newData: DatabaseData = {
							guildId: this.guildHandler.id,
							guildConfig: this.guildSettings.export(),
							audioConfig: this.audioSettings.export(),
							permissionConfig: this.permissionSettings.export(),
							sourceDataConfig: this.sourceManager.export()
						};

						this.debug('Creating guild data entry in database');
						await this._collection.insertOne(newData);
					}

					this.guildSettings.events.on('newSettings', () => { this.debug('New settings on guild settings, saving'); this._save(); });
					this.audioSettings.events.on('newSettings', () => { this.debug('New settings on audio settings, saving'); this._save(); });
					this.permissionSettings.events.on('newSettings', () => { this.debug('New settings on permission settings, saving'); this._save(); });
					this.sourceManager.events.on('newSettings', () => { this.debug('New settings on sourceManager, saving'); this._save(); });

					resolve();				// resolve once done
				} catch (error) {
					this.error(`{error: ${error.message}} retrieving/saving data from database. Trying again in ${wait} seconds. {stack:${error.stack}}`);
					setTimeout(() => { _initData(wait * 10); }, wait);
				}
			};
			_initData(1_000);
		});
	}

	/**
	 * @name _save()
	 * Queues up save to database to prevent spamming
	 */
	private _save(): void {
		this._saveCount++;
		this.debug(`Queueing save currently ${this._saveCount} saves in queue`);
		if (this._saveCount > this.config.MAX_UPDATES_BEFORE_SAVE) {
			this.debug('Max number of queued saves reached, saving');
			this._saveCount = 0;
			this._saveData();
		}
		clearTimeout(this._saveTimeout);
		this._saveTimeout = setTimeout(() => {
			this.debug('Save timeout ended, saving data');
			this._saveData();
		}, this.config.DATABASE_ACCESS_WAIT);
	}

	/**
	 * @name _saveData()
	 * Saves guildData to database
	 */
	private async _saveData(): Promise<void> {
		clearInterval(this._retrySave);
		try {
			this.debug('Saving data to database');
			const newData: DatabaseData = {
				guildId: this.guildHandler.id,
				guildConfig: this.guildSettings.export(),
				audioConfig: this.audioSettings.export(),
				permissionConfig: this.permissionSettings.export(),
				sourceDataConfig: this.sourceManager.export()
			};
			await this._collection.replaceOne({ guildId: this.guildHandler.id }, newData);
		} catch (error) {
			this.error(`{error: ${error.message}} saving data from database. Trying again in ${this.config.MAX_DATABASE_RETRY_WAIT} ms. {stack:${error.stack}}`);
			this._retrySave = setInterval(() => this._saveData(), this.config.MAX_DATABASE_RETRY_WAIT);
		}
	}

	/**
	 * @name deleteGuild()
	 * Deletes guild data in the database
	 */
	async deleteGuild(): Promise<void> {
		return new Promise((resolve) => {
			const _delete = async (wait: number) => {
				if (wait > this.config.MAX_DATABASE_RETRY_WAIT) { wait = this.config.MAX_DATABASE_RETRY_WAIT; }

				try {
					await this._collection.deleteOne({ guildId: this.guildHandler.id });
					resolve();
				}
				catch (error) {
					setTimeout(() => { _delete(wait * 10); }, wait);
				}
			};
			_delete(1_000);
		});
	}
}