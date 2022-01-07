const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

const GUILDDATA_COLLECTION_NAME = process.env.GUILDDATA_COLLECTION_NAME || 'Guilds';

/**
 * GuildData
 * 
 * Abstracts away database connection
 * Handles getting and setting guild settings
 */
class GuildData extends EventEmitter {
	/**
	 * @param {GuildHan} guildHandler - guild handler for guild this guildData object is responsible for
	 * @param {string} id - discord guild id
	 * @param {Db} db - mongodb database for bot data
	 */
	constructor(guildHandler, id, db) {
		super();
		this.guildId = id;
		this.collection = db.collection(GUILDDATA_COLLECTION_NAME);
		this.log = guildHandler.log;
		this.initData();
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
	async initData(wait) {
		if (!wait) { wait = 1000; }
		if (wait > 60000) { wait = 60000; }
		try {
			// try gettings data from temp files if 
			var foundGuild;
			try {
				this.log('Checking temp folder for unsaved settings...');
				await fs.promises.stat(path.join(__dirname, 'temp', this.guildId + '.json'));
				foundGuild = require(path.join(__dirname, 'temp', this.guildId + '.json'));
				this.log('Unsaved data found');
			} catch (error) {
				// grab guild data from the database
				this.log('No unsaved data found, requesting settings from database');
				foundGuild = await this.collection.findOne({ guildId: this.guildId });
			}

			if (foundGuild) {
				this.configured = foundGuild.configured;
				this.channelId = foundGuild.channelId;
				this.prefix = foundGuild.prefix;
				this.filters = foundGuild.filters;
				this.playlists = foundGuild.playlists;

				this.log('Guild data retrieved');
				for (let property in this.getData()) {
					this.log(`${property}: ${this[property]}`);
				}
			}
			else {
				this.log('No guild data found, using defaults');
				this.configured = false;
				this.channelId = undefined;
				this.prefix = '!miku ';
				this.filters = [];
				this.playlists = [];

				await this.collection.insertOne(this.getData());
			}

			this.saveData();

			this.emit('ready');
		} catch (error) {
			this.log(`Error retrieving/saving data from database: ${error} trying again in ${wait} seconds`);
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
		this.log('Saving data! First trying database...');
		const result = await this.collection.replaceOne({ guildId: this.guildId }, this.getData());

		// check if save was successful or not
		if (result.modifiedCount === 1) {
			// delete temp file if needed
			this.log('Database save successful');
			try {
				await fs.promises.stat(path.join(__dirname, 'temp', this.guildId + '.json'));
				await fs.promises.unlink(path.join(__dirname, 'temp', this.guildId + '.json'));
				this.log('Temporary file successfully deleted');
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
		this.log(`Guild data: configured set to ${configured}`);
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
		this.log(`Guild data: channelId set to ${id}`);
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
		this.log(`Guild data: prefix set to ${prefix}`);
		this.prefix = prefix;
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
			playlists: this.playlists
		};
	}
}

module.exports = GuildData;