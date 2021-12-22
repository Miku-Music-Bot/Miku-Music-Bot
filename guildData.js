const { EventEmitter } = require('events');

const GUILDDATA_COLLECTION_NAME = process.env.GUILDDATA_COLLECTION_NAME || 'Guilds';	// name of mongodb collection for guild data

class GuildData extends EventEmitter {
	/**
	 * Creates GuildData object
	 * 
	 * @param {string} id - discord guild id
	 * @param {Db} db - mongodb database for bot data
	 */
	constructor(id, db) {
		super();
		this.guildID = id;
		this.collection = db.collection(GUILDDATA_COLLECTION_NAME);
		this.initData();
	}

	/**
	 * Initiallizes GuildData
	 * 
	 * connects to database and tries to get data
	 * if no data exits, creates default values and saves it
	 * if an error occurs, it retries after 10 seconds
	 * emits "ready" event when done
	 */
	async initData() {
		try {
			// grab guild data from the database
			const foundGuild = await this.collection.findOne({ guildID: this.guildID });
			if (foundGuild) {
				this.configured = foundGuild.configured,
				this.channelID = foundGuild.channelID,
				this.prefix = foundGuild.prefix,
				this.filters = foundGuild.filters,
				this.playlists = foundGuild.playlists
			}
			else {
				this.configured = false;
				this.channelID = undefined;
				this.prefix = '!miku ';
				this.filters = [];
				this.playlists = [];

				await this.collection.insertOne(this.getData());
			}
			this.emit('ready');
		} catch (error) {
			console.log(`Error retrieving/saving data from database: ${error}`);
			setTimeout(() => {
				this.initData();
			}, 10000);
		}
	}

	/**
	 * @returns {object} - object containing bot settings
	 */
	getData() {
		return {
			configured: this.configured,
			guildID: this.guildID,
			channelID: this.channelID,
			prefix: this.prefix,
			filters: this.filters,
			playlists: this.playlists
		}
	}
}

module.exports = GuildData;