import Discord from "discord.js";
import path from "path";
import dotenv from "dotenv";	// grab env variables
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import StartComponents from "./start_components";
import Logger from "./logger";
import GuildHandler from "./message_listener/guild_handler";

const logger = new Logger("miku");

// Set up discord events
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;		// discord bot token

const bot = new Discord.Client({				// set intent flags for bot
  intents: [
    Discord.GatewayIntentBits.Guilds,					        // for guildCreate and guildDelete events
    Discord.GatewayIntentBits.GuildMessages,			    // for creating and deleting messages
    Discord.GatewayIntentBits.GuildMessageReactions,	// for adding and removing message reactions
    Discord.GatewayIntentBits.GuildVoiceStates        // for checking who is in vc and connecting to vc
  ],
});

const guild_handler_map: { [key: string]: GuildHandler } = {};

// when bot joins a server
bot.on("guildCreate", (guild) => {
  logger.info(`Joined a new guild named ${guild.name}`);

  if (!guild_handler_map[guild.id]) {
    logger.debug(`Guild handler does not yet exist for guild with {guild_id:${guild.id}}, creating one`);
    guild_handler_map[guild.id] = new GuildHandler(guild.id);
  } else {
    logger.debug(`Guild handler for guild with {guild_id:${guild.id}}, skipping creating guild handler`);
  }
});

// when bot leaves a server
bot.on("guildDelete", (guild) => {
  logger.info(`Left a guild named ${guild.name}`);

  logger.debug(`Attempting to remove guild with {guild_id:${guild.id}}`);
  const handler = guild_handler_map[guild.id];
  try {
    handler.RemoveGuild();
    delete guild_handler_map[guild.id];
    logger.debug(`Successfully removed guild with {guild_id:${guild.id}}`);
  } catch (error) {
    logger.error(`Error while removing guild with {guild_id:${guild.id}}`, error);
  }
});

// when bot receives a message
bot.on("messageCreate", (message) => {
  if (message.author.id === bot.user.id) return; 		// ignore if message author is the bot
  if (!message.guildId) return;						          // ignore if is a dm

  const handler = guild_handler_map[message.guildId];
  if (handler) {
    handler.MessageHandler(message);
  }
});

// when bot receives an interaction
bot.on("interactionCreate", (interaction) => {
  if (!interaction.isButton()) return;				// ignore if not a button press
  if (!interaction.guildId) return;

  const handler = guild_handler_map[interaction.guildId];
  if (handler) {
    handler.InteractionHandler(interaction);
  }
});

// when bot recieves a reaction
bot.on("messageReactionAdd", async (reaction) => {
  // delete it
  try { await reaction.remove(); } catch { /* */ }
});

// once ready, start handlers for all existing guilds
bot.once("ready", () => {
  logger.info(`Logged in to discord as ${bot.user.tag}`);

  const guildList = bot.guilds.cache.map((guild) => guild.id);
  for (let i = 0; i < guildList.length; i++) {
    logger.debug(`Creating guild handler for guild with {guild_id:${guildList[i]}}`);
    guild_handler_map[guildList[i]] = new GuildHandler(guildList[i]);
  }
});

StartComponents().then(() => {
  bot.login(DISCORD_TOKEN);
});
