const path = require('path');
const { EventEmitter } = require('events');
const { Client, Intents, MessageEmbed } = require('discord.js');

const UI = require(path.join(__dirname, 'UI.js'));
const GuildData = require(path.join(__dirname, 'guildData', 'GuildData.js'));
const CommandPerm = require(path.join(__dirname, 'CommandPerm.js'));

const BOT_DOMAIN = process.env.BOT_DOMAIN;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;

/* eslint-disable */
const GREY = '#5a676b';			// colors to be used
const TEAL = '#86cecb';
const PINK = '#e12885';
const YT_RED = '#FF0000';
const SC_ORANGE = '#FE5000';
const GD_BLUE = '#4688F4';
/* eslint-enable */

/**
 * GuildHander
 * 
 * Handles all bot functions for a specific guild
 */
class GuildHander extends EventEmitter {
	/**
	 * Creates GuildData object and once data is ready, calls startBot()
	 * @param {string} id - discord guild id for GuildHander to be responsible for
	 * @param {Db} db - mongodb database for bot data
	 */
	constructor(id, db) {
		super();
		console.log(`Creating guild handler for guild id: ${id}`);

		this.messageFilters = [];
		this.reactionFilters = [];

		this.bot = new Client({				// set intent flags for bot
			intents: [
				Intents.FLAGS.GUILDS,					// for accessing guild roles
				Intents.FLAGS.GUILD_VOICE_STATES,		// for checking who is in vc and connecting to vc
			]
		});

		this.bot.once('ready', () => {
			this.guild = this.bot.guilds.cache.get(this.guildData.guildId);

			console.log(`Guild handler for guild id: ${this.guildData.guildId} is ready!`);

			if (!this.guildData.configured) { this.setup(); }	// start setup if bot is not configured yet
		});

		this.ui = new UI(this);
		this.permissions = new CommandPerm(this);

		this.guildData = new GuildData(id, db);
		this.guildData.once('ready', () => {
			this.bot.login(DISCORD_TOKEN);
		});
	}

	/**
	 * setup()
	 * 
	 * Handles the user setup for a brand new server
	 */
	setup() {
		const defaultChannel = this.bot.channels.cache.filter(channel => channel.type === 'GUILD_TEXT').first();

		const setupMessage = new MessageEmbed()
			.setColor(TEAL)
			.setImage(`${BOT_DOMAIN}/thumbnail_image.jpg`)
			.setTitle('Set up Miku')
			.setDescription(`
				Miku needs an empty and dedicated text channel to use.\n
				Create or choose one and type: "${this.guildData.prefix}set-channel" in that channel`
			)
			.setFooter({ text: `For help, email: ${SUPPORT_EMAIL}` });
		defaultChannel.send({ embeds: [setupMessage] });
	}

	/**
	 * sendNotification()
	 * 
	 * Sends a notification
	 * @param {string} message - message you want to send
	 */
	sendNotification(message, channelId) {
		if (!channelId) { channelId = this.guildData.channelId; }
		const notification = new MessageEmbed()
			.setColor(GREY)
			.setDescription(message);

		this.bot.channels.cache.get(channelId).send({ embeds: [notification] });
	}

	/**
	 * sendError()
	 * 
	 * Sends a notification
	 * @param {string} message - message you want to send
	 */
	sendError(message, channelId) {
		if (!channelId) { channelId = this.guildData.channelId; }
		const notification = new MessageEmbed()
			.setColor(PINK)
			.setDescription(message);

		this.bot.channels.cache.get(channelId).send({ embeds: [notification] });
	}

	/**
	 * messageHandler()
	 * 
	 * Handles all messages the bot recieves
	 * @param {Message} message - discord message object
	 */
	messageHandler(message) {
		// if this is the set-channel command and begins with the prefix
		if (message.content === `${this.guildData.prefix}set-channel` && this.permissions.check('set-channel', message)) {
			this.guildData.setChannel(message.channelId);

			this.ui.sendUI();

			if (!this.guildData.configured) {
				this.sendNotification('This is where miku will live. You no longer need to use the prefix as all messages sent to this channel will be interpreted as commands and will be deleted after the command is executed.');
				this.guildData.setConfigured(true);
			}
		}

		// ignore if not in right channel
		if (message.channelId !== this.guildData.channelId) return;

		// split message into command and argument
		let command = '';
		let argument = '';
		if (message.content.startsWith(this.guildData.prefix)) {
			message.content = message.content.slice(0, this.guildData.prefix.length);
		}

		message.content = message.content + ' ';
		for (let i = 0; i < message.content.length; i++) {
			if (message.content[i] == ' ') {
				command = message.content.slice(0, i);
				argument = message.content.slice(i + 1, message.content.length);
			}
		}

		// check permissions for command then handle each command
		if (this.permissions.check(command, message)) {
			switch (command) {
				case ('join'): {

				}
				case ('play'): {

				}
			}
		}
	}
}

module.exports = GuildHander;