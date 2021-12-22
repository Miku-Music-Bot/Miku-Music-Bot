const path = require('path');
const { MongoClient } = require('mongodb');

const GuildHander = require(path.join(__dirname, 'guildHandler'));

/**
 * botMaster.js
 * 
 * Handles adding and removing guild handlers
 */

const MONGODB_URI = process.env.MONGODB_URI;			// mongodb connection uri
const MONGODB_DBNAME = process.env.MONGODB_DBNAME;		// name of bot database

const dbClient = new MongoClient(MONGODB_URI);
var database = undefined;
/**
 * Connects to mongodb database
 * 
 * @returns {Promise} - resolves once connection is established
 */
function init() {
	return new Promise(async (resolve, reject) => {
		try {
			await dbClient.connect();
			database = dbClient.db(MONGODB_DBNAME);
			resolve();
		} catch (error) {
			reject(error);
		}
	})
}

var guildList = [];
/**
 * checks if guild already has a handler
 * if not, creates a handler
 * 
 * @param {string} id - discord guild id string
 */
function newGuild(id) {
	var found = false;
	for (let i = 0; i < guildList.length; i++) {
		if (guildList[i].getID() === id) {
			found = true;
		}
	}
	if (!found) {
		let newGuild = new GuildHander(id, database);
		guildList.push(newGuild);
	}
}

/**
 * Removes guild handler with matching id
 * 
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

module.exports = { init, newGuild, removeGuild }