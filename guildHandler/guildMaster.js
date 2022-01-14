const path = require('path');

const GuildHander = require(path.join(__dirname, 'guildHandler.js'));

/**
 * botMaster.js
 * 
 * Handles adding, getting, and removing guild handlers
 */

var guildList = {};		// stores all guilds
/**
 * getGuild()
 * 
 * Returns GuildHandler for guild with matching id
 * @param {string} id - discord guild id string
 * @returns {guildHandler | undefined} - returns guildHandler or undefined if not found
 */
function getGuild(id) { return guildList[id]; }

/**
 * newGuild()
 * 
 * checks if guild already has a handler
 * if not, creates a handler
 * @param {string} id - discord guild id string
 */
function newGuild(id) {
	if (!getGuild(id)) {
		let newGuild = new GuildHander(id);
		guildList[id] = newGuild;
	}
}

/**
 * removeGuild()
 * 
 * Removes guild handler with matching id
 * @param {string} id - discord guild id string
 */
function removeGuild(id) {
	guildList[id].removeGuild();
	guildList[id] = undefined;
}

module.exports = { getGuild, newGuild, removeGuild };