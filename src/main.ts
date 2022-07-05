import path from 'path';
import Discord from 'discord.js';

import dotenv from 'dotenv';	// grab env variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import BotMaster from './BotMaster';
import startWebServer from './webPanel/webPanel';
import newLogger from './Logger';
import getEnv from './config';

/**
 * @name main.js
 * Starts webserver
 * Connects to database and discord
 * Starts handlers for each guild
 * Handles guildCreate, guildDelete, messageCreate, and messageReactionAdd events
 */
const config = getEnv(path.join(__dirname, '.env'));

const log = newLogger(path.join(config.LOG_DIR, 'main'), config);
const botMaster = new BotMaster(log, config);

const bot = new Discord.Client({
	intents: [
		Discord.Intents.FLAGS.GUILDS,					// for guildCreate and guildDelete events
		Discord.Intents.FLAGS.GUILD_MESSAGES,			// for creating and deleting messages
		Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,	// for adding and removing message reactions
	],
});

bot.on('guildCreate', (guild) => {
	log.info(`Joined a new guild: ${guild.name}`);
	botMaster.newGuild(guild.id);
});

bot.on('guildDelete', (guild) => {
	log.info(`Left a guild: ${guild.name}`);
	botMaster.removeGuild(guild.id);
});

bot.on('messageCreate', async (message) => {
	if (message.author.id === bot.user.id) return; 		// ignore if message author is the bot
	if (!message.guildId) return;						// ignore if is a dm

	const guild = botMaster.getGuild(message.guildId);
	if (guild) {
		const success = await guild.messageHandler(message);
		if (success) {
			try {
				await message.delete();
			}
			catch (error) {
				log.error(`{error:${error.message}} while deleting message with {id:${message.id}}`, error);
			}
		}
	}
});

// when bot receives an interaction
bot.on('interactionCreate', async (interaction) => {
	if (!interaction.isButton()) return;				// ignore if not a button press
	if (!interaction.guildId) return;					// ignore if it is on a dm

	const guild = botMaster.getGuild(interaction.guildId);
	if (guild) {
		const success = await guild.interactionHandler(interaction);
		if (success) {
			setTimeout(async () => {	// wait just a moment to prevent spamming
				try {
					await interaction.update({});  // removes the interaction
				}
				catch (error) {
					log.error(`{error:${error.message}} while removing interaction with {interactionId:${interaction.id}} on message with {messageId:${interaction.message.id}}`, error);
				}
			}, 500);
		}
	}
});

bot.on('messageReactionAdd', async (reaction) => {
	try {							// ignore all reactions and delete them to keep ui clean
		await reaction.remove();
	}
	catch (error) {
		log.error(`{error:${error.message}} while removing reaction on message with {messageId:${reaction.message.id}}`, error);
	}
});

bot.once('ready', () => {
	log.profile('(0.0) Start Main Discord Bot');
	log.info(`Logged in to discord as ${bot.user.tag}`);

	setTimeout(async () => {			// wait before starting each guild handler to prevent rate limiting
		log.profile('(0.1) Start Guild Handlers');
		log.info('Starting guild handlers, this may take a while');
		const guildList = bot.guilds.cache.map((guild) => guild.id);

		log.info(`Found ${guildList.length} guilds that bot is in, starting handlers for each...`);
		for (let i = 0; i < guildList.length; i++) {
			botMaster.newGuild(guildList[i]);
			await new Promise(resolve => setTimeout(resolve, config.GUILD_CREATE_RATE));			// wait before starting each guild handler to prevent rate limiting
		}
		log.profile('(0.1) Start Guild Handlers');
		log.info('Finised starting guild handlers');
	}, config.GUILD_CREATE_RATE);
});

startWebServer(botMaster, log, config)
	.then(() => {
		log.profile('(0.0) Start Main Discord Bot');
		bot.login(config.DISCORD_TOKEN);
	})
	.catch((error) => {
		log.error(`{error: ${error.message}} starting web server, exiting...`, error);
		process.exit();
	});