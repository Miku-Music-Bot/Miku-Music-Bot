const path = require('path');
const { Client, Intents } = require('discord.js');

/**
 * main.js
 * 
 * Starts webserver
 * Connects to database and discord
 * Starts handlers for each guild
 * Handles when bot is added or removed from channels
 */

const botMaster = require(path.join(__dirname, 'botMaster.js'));

/**
 * checks guilds bot is in and adds handlers for all of them just in case
 */
function refreshGuilds() {
	const guildList = bot.guilds.cache.map(guild => guild.id);
	for (let i = 0; i < guildList.length; i++) {
		botMaster.newGuild(guildList[i]);
	}
}

// Set up discord events
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;		// discord bot token

const bot = new Client({				// set intent flags for bot
	intents: [
		Intents.FLAGS.GUILDS			// for guildCreate and guildDelete events
	]
});

// when bot joins a server
bot.on('guildCreate', (guild) => {
	console.log(`Joined a new guild: ${guild.name}`);
	botMaster.newGuild(guild.id);
});

// when bot leaves a server
bot.on('guildDelete', (guild) => {
	console.log(`Left a guild: ${guild.name}`);
	botMaster.removeGuild(guild.id);
});

// once ready, start handlers for all existing guilds
bot.once('ready', () => {
	console.log(`Logged in as ${bot.user.tag}!`);

	refreshGuilds();
	setInterval(refreshGuilds, 60000);
});

// get botMaster ready
botMaster.init()
	.then(() => {
		// login as bot
		bot.login(DISCORD_TOKEN);
	})
	.catch((error) => {
		// stop if connection to database fails
		console.log(`Error connecting to database: ${error}`);
		process.exit();
	});
