const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const guildComponent = require(path.join(__dirname, '..', 'guildComponent.js'));

const MONGODB_URI = process.env.MONGODB_URI;											// mongodb connection uri
const MONGODB_DBNAME = process.env.MONGODB_DBNAME;										// name of bot database
const GUILDDATA_COLLECTION_NAME = process.env.GUILDDATA_COLLECTION_NAME || 'Guilds';	// name of collection for guild data

/**
 * GuildData
 * 
 * Abstracts away database connection
 * Handles getting and setting guild settings
 */
class GuildData extends guildComponent {
	/**
	 * @param {GuildHandler} guildHandler - guild handler for guild this guildData object is responsible for
	 * @param {string} id - discord guild id
	 * @param {function} cb - callback for when done getting data
	 */
	constructor(guildHandler, id, cb) {
		super(guildHandler);
		this.guildId = id;

		this.initData(1000, cb);
	}

	/**
	 * initData()
	 * 
	 * Initiallizes GuildData
	 * connects to database and tries to get data
	 * if no data exits, creates default values and saves it
	 * if an error occurs, it retries after 10 seconds
	 * emits "ready" event when done
	 * @param {number} wait - amount of time to wait before retrying in case of an error
	 */
	async initData(wait, cb) {
		if (!wait) { wait = 1000; }
		if (wait > 60000) { wait = 60000; }
		try {
			this.debug('Connecting to mongodb database');

			// connect to mongodb database
			const dbClient = new MongoClient(MONGODB_URI);
			await dbClient.connect();

			const db = dbClient.db(MONGODB_DBNAME);
			this.collection = db.collection(GUILDDATA_COLLECTION_NAME);

			// try gettings data from temp files if 
			var foundGuild;
			try {
				this.debug('Checking temp folder for unsaved settings...');
				await fs.promises.stat(path.join(__dirname, 'temp', this.guildId + '.json'));
				foundGuild = require(path.join(__dirname, 'temp', this.guildId + '.json'));
				this.debug(`Unsaved data found at {location: ${path.join(__dirname, 'temp', this.guildId + '.json')}}`);
			} catch (error) {
				// grab guild data from the database
				this.debug('No unsaved data found, requesting settings from database');
				foundGuild = await this.collection.findOne({ guildId: this.guildId });
			}


			if (foundGuild) {
				this.configured = foundGuild.configured;
				this.channelId = foundGuild.channelId;
				this.prefix = foundGuild.prefix;
				this.filters = foundGuild.filters;
				this.playlists = foundGuild.playlists;
				this.permissions = {};

				this.debug('Guild data retrieved. {data: ');
				for (let property in this.getData()) {
					this.debug(`\t{${property}: ${JSON.stringify(this[property])}}`);
				}
				this.debug('}');
			}
			else {
				this.info('No guild data found, using defaults');
				this.configured = false;
				this.channelId = undefined;
				this.prefix = '!miku ';
				this.filters = [];
				this.playlists = [];
				this.permissions = {};

				await this.collection.insertOne(this.getData());
			}

			cb();			// call callback once done
			this.saveData();
		} catch (error) {
			this.error(`{error: ${error}} retrieving/saving data from database. Trying again in ${wait} seconds...`);
			setTimeout(() => {
				this.initData(wait * 10);
			}, wait);
		}
	}

	/**
	 * saveData()
	 * 
	 * Saves guildData to database
	 * If that fails, it saves data to a temporary file then retries connection every minute 
	 */
	async saveData() {
		clearInterval(this.retrySave);
		this.debug('Saving data! First trying database...');
		const result = await this.collection.replaceOne({ guildId: this.guildId }, this.getData());

		// check if save was successful or not
		if (result.modifiedCount === 1) {
			// delete temp file if needed
			this.debug('Database save successful');
			try {
				await fs.promises.stat(path.join(__dirname, 'temp', this.guildId + '.json'));
				await fs.promises.unlink(path.join(__dirname, 'temp', this.guildId + '.json'));
				this.debug(`Temporary file at {location: ${path.join(__dirname, 'temp', this.guildId + '.json')}} successfully deleted`);
			} catch { /* */ }
		}
		else {
			this.log('Could not save data to MongoDB database, saving temporary file...');
			try {
				await fs.promises.writeFile(path.join(__dirname, 'temp', this.guildId + '.json'), JSON.stringify(this.getData()));
				this.log('Temporary file successfully saved');
			}
			catch (error) {
				this.log(`Error: {${error}} while saving data to temporary file, retrying in 1 min`);
			}
			this.retrySave = setInterval(() => this.saveData(), 60000);
		}
	}

	/**
	 * setConfigured()
	 * 
	 * Sets configured status
	 * @param {boolean} configured - configured or not
	 */
	setConfigured(configured) {
		this.debug(`Guild data: configured set to ${configured}`);
		this.configured = configured;
		this.saveData();
	}

	/**
	 * setChannel()
	 * 
	 * Sets the channel id of bot
	 * @param {string} id - discord channel id string
	 */
	setChannel(id) {
		this.debug(`Guild data: channelId set to ${id}`);
		this.channelId = id;
		this.saveData();
	}

	/**
	 * setPrefix()
	 * 
	 * Sets the channel id of bot
	 * @param {string} prefix - new prefix to use
	 */
	setPrefix(prefix) {
		this.debug(`Guild data: prefix set to ${prefix}`);
		this.prefix = prefix;
		this.saveData();
	}

	/**
	 * setPermissions()
	 * 
	 * Set the permissions of the bots
	 * @param {object} permissions 
	 */
	setPermissions(permissions) {
		this.debug('Guild data: permissions set to ${permissions}');
		this.permissions = permissions;
		this.saveData();
	}

	/**
	 * getData()
	 * 
	 * @returns {object} - object containing bot settings
	 */
	getData() {
		return {
			configured: this.configured,
			guildId: this.guildId,
			channelId: this.channelId,
			prefix: this.prefix,
			filters: this.filters,
			playlists: this.playlists,
			permissions: this.permissions,
		};
	}
}

module.exports = GuildData;