
import * as path from 'path';
import * as Discord from 'discord.js';

import * as dotenv from 'dotenv';	// grab env variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import BotMaster from './GuildMaster';
import startWebServer from './webPanel/webPanel';
import newLogger from './Logger';

const GUILD_REFRESH_INTERVAL = parseInt(process.env.GUILD_REFRESH_INTERVAL);
const LOG_DIR = process.env.LOG_DIR;
/**
 * main.js
 *
 * Starts webserver
 * Connects to database and discord
 * Starts handlers for each guild
 * Handles guildCreate, guildDelete, messageCreate, and messageReactionAdd events
 */

const log = newLogger(path.join(LOG_DIR, 'main'));
const botMaster = new BotMaster(log);

/**
 * checks guilds bot is in and adds handlers for all of them just in case
 */
function refreshGuilds() {
	const guildList = bot.guilds.cache.map((guild) => guild.id);
	for (let i = 0; i < guildList.length; i++) {
		botMaster.newGuild(guildList[i]);
	}
}

// Set up discord events
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;		// discord bot token

const bot = new Discord.Client({				// set intent flags for bot
	intents: [
		Discord.Intents.FLAGS.GUILDS,					// for guildCreate and guildDelete events
		Discord.Intents.FLAGS.GUILD_MESSAGES,			// for creating and deleting messages
		Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,	// for adding and removing message reactions
	],
});

// when bot joins a server
bot.on('guildCreate', (guild) => {
	log.info(`Joined a new guild: ${guild.name}`);
	botMaster.newGuild(guild.id);
});

// when bot leaves a server
bot.on('guildDelete', (guild) => {
	log.info(`Left a guild: ${guild.name}`);
	botMaster.removeGuild(guild.id);
});

// when bot receives a message
bot.on('messageCreate', async (message) => {
	if (message.author.id === bot.user.id) return; 		// ignore if message author is the bot
	if (!message.guildId) return;						// ignore if is a dm

	const guild = botMaster.getGuild(message.guildId);
	if (guild) { 
		const sucess = await guild.messageHandler(message); 
		if (sucess) { try { message.delete(); } catch { /* */ } }
	}
});

// when bot receives an interaction
bot.on('interactionCreate', async (interaction) => {
	if (!interaction.isButton()) return;				// ignore if not a button press
	if (!interaction.guildId) return;
	
	// Send to correct guild handler and update to respond to discord to indicate that reaction has been recieved
	const guild = botMaster.getGuild(interaction.guildId);
	if (guild) {
		const success = await guild.interactionHandler(interaction);
		if (success) { setTimeout(async () => { try { await interaction.update({}); } catch { /* */ } }, 500); }
	}
});

// when bot recieves a reaction
bot.on('messageReactionAdd', async (reaction) => {
	// delete it
	try { await reaction.remove(); } catch { /* */ }
});

// once ready, start handlers for all existing guilds
bot.once('ready', () => {
	log.info(`Logged in to discord as ${bot.user.tag}`);

	// refresh guilds every minute
	setTimeout(refreshGuilds, 5000);
	setInterval(refreshGuilds, GUILD_REFRESH_INTERVAL);
});

// start web panel
startWebServer(botMaster, log)
	.then(() => {
		// login as bot
		bot.login(DISCORD_TOKEN);
	})
	.catch((error) => {
		// stop if web server fails to start
		log.error(`{error: ${error}} starting web server, exiting...`);
		process.exit();
	});