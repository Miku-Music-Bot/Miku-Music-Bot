const path = require('path');
const { Client, Intents } = require('discord.js');

/**
 * main.js
 * 
 * Starts webserver
 * Connects to database and discord
 * Starts handlers for each guild
 * Handles guildCreate, guildDelete, messageCreate, and messageReactionAdd events
 */

require('dotenv').config();	// grab env variables

const botMaster = require(path.join(__dirname, 'guildHandler', 'guildMaster.js'));
const webPanel = require(path.join(__dirname, 'webPanel', 'webPanel.js'));

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
		Intents.FLAGS.GUILDS,					// for guildCreate and guildDelete events
		Intents.FLAGS.GUILD_MESSAGES,			// for creating and deleting messages
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,	// for adding and removing message reactions
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

// when bot receives a message
bot.on('messageCreate', (message) => {
	if (message.author.id === bot.user.id) return; 		// ignore if message author is the bot
	if (!message.guildId) return;						// ignore if is a dm

	let guild = botMaster.getGuild(message.guildId);
	if (guild) { guild.messageHandler(message); }
});

// when bot receives an interaction
bot.on('interactionCreate', interaction => {
	if (!interaction.isButton()) return;				// ignore if not a button press
	console.log(interaction);
});

// once ready, start handlers for all existing guilds
bot.once('ready', () => {
	console.log(`Logged in to discord as ${bot.user.tag}`);

	// refresh guilds every minute
	setTimeout(refreshGuilds, 5000);
	setInterval(refreshGuilds, 60000);
});


// start web panel
webPanel(botMaster)
	.then(() => {
		// login as bot
		bot.login(DISCORD_TOKEN);
	})
	.catch((error) => {
		// stop if web server fails to start
		console.log(`Error starting web server: ${error}`);
		process.exit();
	});