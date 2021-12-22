const path = require('path');
const { Client, Intents }  = require('discord.js');

const GuildData = require(path.join(__dirname, 'guildData.js'));

/**
 * Handles all bot functions for specific guild
 */
class GuildHander {
	/**
	 * Creates new GuildHandler
	 *
	 * Creates GuildData object then once data is ready, connects to discord
	 * 
	 * @param {string} id - discord guild id for GuildHander to be responsible for
	 * @param {Db} db - mongodb database for bot data
	 */
	constructor(id, db) {
		console.log(`Creating guild handler for guild id: ${id}`);
		this.guildData = new GuildData(id, db);
		this.guildData.once('ready', () => {
			this.startBot();
		});
	}

	startBot() {
		const DISCORD_TOKEN = process.env.DISCORD_TOKEN;		// discord bot token

		this.bot = new Client({				// set intent flags for bot
			intents: [
				Intents.FLAGS.GUILDS	// for guildCreate and guildDelete events
			]
		});

		this.bot.once('ready', () => {
			console.log(`Guild handler for guild id: ${this.guildData.guildID} is ready!`);
			console.log(this.guildData);
		})

		this.bot.login(DISCORD_TOKEN);
	}

	/**
	 * @returns {string} - discord guild id for GuildHandler
	 */
	getID() {
		return this.guildData.guildID;
	}
}

module.exports = GuildHander;