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
	 * @param {string} id - discord guild id
	 * @param {Db} db - mongodb database for bot data
	 */
	constructor(id, db) {
		super();
		this.guildId = id;
		this.collection = db.collection(GUILDDATA_COLLECTION_NAME);
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
	 */
	async initData() {
		try {
			// try gettings data from temp files if 
			var foundGuild;
			try {
				await fs.promises.stat(path.join(__dirname, 'temp', this.guildId + '.json'));
				foundGuild = require(path.join(__dirname, 'temp', this.guildId + '.json'));
			} catch (error) {
				// grab guild data from the database
				foundGuild = await this.collection.findOne({ guildId: this.guildId });
			}

			if (foundGuild) {
				this.configured = foundGuild.configured;
				this.channelId = foundGuild.channelId;
				this.prefix = foundGuild.prefix;
				this.filters = foundGuild.filters;
				this.playlists = foundGuild.playlists;
			}
			else {
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
			console.error(`Error retrieving/saving data from database: ${error}`);
			setTimeout(() => {
				this.initData();
			}, 10000);
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
		const result = await this.collection.replaceOne({ guildId: this.guildId }, this.getData());

		// check if save was successful or not
		if (result.modifiedCount === 1) {
			// delete temp file if needed
			try {
				await fs.promises.stat(path.join(__dirname, 'temp', this.guildId + '.json'));
				await fs.promises.unlink(path.join(__dirname, 'temp', this.guildId + '.json'));
			} catch { /* */ }
		}
		else {
			console.error('Could not save data to MongoDB database, saving temporary file');
			try {
				await fs.promises.writeFile(path.join(__dirname, 'temp', this.guildId + '.json'), JSON.stringify(this.getData()));
				this.retrySave = setInterval(() => this.saveData(), 6000);
			}
			catch (error) {
				console.error(error);
				this.retrySave = setInterval(() => this.saveData(), 6000);
			}
		}
	}

	/**
	 * setConfigured()
	 * 
	 * Sets configured status
	 * @param {boolean} configured - configured or not
	 */
	setConfigured(configured) {
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