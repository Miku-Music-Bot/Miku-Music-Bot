"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var Discord = require("discord.js");
/**
 * main.js
 *
 * Starts webserver
 * Connects to database and discord
 * Starts handlers for each guild
 * Handles guildCreate, guildDelete, messageCreate, and messageReactionAdd events
 */
var dotenv = require("dotenv"); // grab env variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });
var guildMaster_1 = require("./guildHandler/guildMaster");
var webPanel_1 = require("./webPanel/webPanel");
var botMaster = new guildMaster_1.BotMaster();
/**
 * checks guilds bot is in and adds handlers for all of them just in case
 */
function refreshGuilds() {
    var guildList = bot.guilds.cache.map(function (guild) { return guild.id; });
    for (var i = 0; i < guildList.length; i++) {
        botMaster.newGuild(guildList[i]);
    }
}
// Set up discord events
var DISCORD_TOKEN = process.env.DISCORD_TOKEN; // discord bot token
var bot = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, // for adding and removing message reactions
    ],
});
// when bot joins a server
bot.on('guildCreate', function (guild) {
    console.log("Joined a new guild: ".concat(guild.name));
    botMaster.newGuild(guild.id);
});
// when bot leaves a server
bot.on('guildDelete', function (guild) {
    console.log("Left a guild: ".concat(guild.name));
    botMaster.removeGuild(guild.id);
});
// when bot receives a message
bot.on('messageCreate', function (message) {
    if (message.author.id === bot.user.id)
        return; // ignore if message author is the bot
    if (!message.guildId)
        return; // ignore if is a dm
    var guild = botMaster.getGuild(message.guildId);
    if (guild) {
        guild.messageHandler(message);
    }
});
// when bot receives an interaction
bot.on('interactionCreate', function (interaction) {
    if (!interaction.isButton())
        return; // ignore if not a button press
    console.log(interaction);
});
// once ready, start handlers for all existing guilds
bot.once('ready', function () {
    console.log("Logged in to discord as ".concat(bot.user.tag));
    // refresh guilds every minute
    setTimeout(refreshGuilds, 5000);
    setInterval(refreshGuilds, 60000);
});
// start web panel
(0, webPanel_1.startWebServer)(botMaster)
    .then(function () {
    // login as bot
    bot.login(DISCORD_TOKEN);
})
    .catch(function (error) {
    // stop if web server fails to start
    console.log("Error starting web server: ".concat(error));
    process.exit();
});
