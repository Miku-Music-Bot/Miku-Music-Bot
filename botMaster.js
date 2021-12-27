const path = require('path');
const { MongoClient } = require('mongodb');

const GuildHander = require(path.join(__dirname, 'guildHandler', 'guildHandler'));

/**
 * botMaster.js
 * 
 * Connects to mogodb database
 * Handles adding, getting, and removing guild handlers
 */

const MONGODB_URI = process.env.MONGODB_URI;			// mongodb connection uri
const MONGODB_DBNAME = process.env.MONGODB_DBNAME;		// name of bot database

const dbClient = new MongoClient(MONGODB_URI);
var database = undefined;
/**
 * init()
 * 
 * Connects to mongodb database
 * @returns {Promise} - resolves once connection is established
 */
function init() {
	return new Promise((resolve, reject) => {
		dbClient.connect()
			.then(() => {
				database = dbClient.db(MONGODB_DBNAME);
				resolve();
			})
			.catch((error) => {
				reject(error);
			});
	});
}

var guildList = [];		// stores all guilds
/**
 * getGuild()
 * 
 * Returns GuildHandler for guild with matching id
 * @param {string} id - discord guild id string
 */
function getGuild(id) {
	for (let i = 0; i < guildList.length; i++) {
		if (guildList[i].getID() === id) {
			return guildList[i];
		}
	}
	return null;
}


/**
 * newGuild()
 * 
 * checks if guild already has a handler
 * if not, creates a handler
 * @param {string} id - discord guild id string
 */
function newGuild(id) {
	if (!getGuild(id)) {
		let newGuild = new GuildHander(id, database);
		guildList.push(newGuild);
	}
}

/**
 * removeGuild()
 * 
 * Removes guild handler with matching id
 * @param {string} id - discord guild id string
 */
function removeGuild(id) {
	for (let i = 0; i < guildList.length; i++) {
		if (guildList[i].getName() === id) {
			guildList[i].removeGuild();
			guildList.splice(i, 1);
		}
	}
}

module.exports = { init, getGuild, newGuild, removeGuild };