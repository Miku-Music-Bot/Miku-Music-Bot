const { MongoClient } = require('mongodb');
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
	 * calls callback once done
	 * @param {number} wait - amount of time to wait before retrying in case of an error
	 * @param {function} cb - callback for when done getting data
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

			// grab guild data from the database
			this.debug('No unsaved data found, requesting settings from database');
			const foundGuild = await this.collection.findOne({ guildId: this.guildId });


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
	 */
	async saveData() {
		clearInterval(this.retrySave);
		this.debug('Saving data!');
		const result = await this.collection.replaceOne({ guildId: this.guildId }, this.getData());

		// check if save was successful or not
		if (result.modifiedCount === 1) {
			this.debug('Data save successful');
		}
		else {
			this.error('Data save failed, retrying in 1 min');
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