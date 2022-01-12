const path = require('path');
const { Client, Intents, MessageEmbed } = require('discord.js');

const UI = require(path.join(__dirname, 'ui.js'));
const Data = require(path.join(__dirname, 'guildData', 'data.js'));
const Permissions = require(path.join(__dirname, 'permissions.js'));
const VCPlayer = require(path.join(__dirname, 'vcPlayer.js'));
const newLogger = require(path.join(__dirname, 'logger.js'));

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
class GuildHander {
	/**
	 * Creates data object and once data is ready, calls startBot()
	 * @param {string} id - discord guild id for GuildHander to be responsible for
	 */
	constructor(id) {
		const logger = newLogger(path.join(__dirname, 'id'));
		this.logger = logger;
		this.debug = (msg) => { logger.debug(msg); };
		this.info = (msg) => { logger.info(msg); };
		this.warn = (msg) => { logger.warn(msg); };
		this.error = (msg) => { logger.error(msg); };
		this.fatal = (msg) => { logger.fatal(msg); };

		this.info(`Creating guild handler for guild {id: ${id}}`);

		this.bot = new Client({				// set intent flags for bot
			intents: [
				Intents.FLAGS.GUILDS,					// for accessing guild roles
				Intents.FLAGS.GUILD_VOICE_STATES,		// for checking who is in vc and connecting to vc
			]
		});

		this.bot.once('ready', () => {
			this.guild = this.bot.guilds.cache.get(this.data.guildId);

			this.ui = new UI(this);
			this.vcPlayer = new VCPlayer(this);
			this.permissions = new Permissions(this);
			this.permissions.init();

			this.info('Logged into discord, guild handler is ready!');

			if (!this.data.configured) {
				this.info('This guild has not been configured, running setup...');
				this.setup();
			}
		});

		this.data = new Data(this, id, () => {
			this.info('Guild data ready, logging in to discord...');
			this.bot.login(DISCORD_TOKEN);
		});
	}

	/**
	 * setup()
	 * 
	 * Handles the user setup for a brand new server
	 * @param {number} wait - amount of time to wait before retrying in case of an error
	 */
	setup(wait) {
		if (!wait) { wait = 1000; }
		if (wait > 60000) { wait = 60000; }
		const defaultChannel = this.bot.channels.cache.filter(channel => channel.type === 'GUILD_TEXT').first();
		this.debug(`Found default channel with {id: ${defaultChannel.id}} to send setup message to`);

		const setupMessage = new MessageEmbed()
			.setColor(TEAL)
			.setImage(`${BOT_DOMAIN}/thumbnail_image.jpg`)
			.setTitle('Set up Miku')
			.setDescription(`
				Miku needs an empty and dedicated text channel to use.\n
				Create or choose one and type: "${this.data.prefix}set-channel" in that channel`
			)
			.setFooter({ text: `For help, email: ${SUPPORT_EMAIL}` });
		defaultChannel.send({ embeds: [setupMessage] })
			.then((message) => {
				this.debug(`Setup message sent, {messageId: ${message.id}}`);
			})
			.catch((error) => {
				this.error(`{error: ${error}} sending setup message, trying again in ${wait} sec...`);
				setTimeout(() => {
					this.setup(wait * 10);
				}, wait);
			});
	}

	/**
	 * sendNotification()
	 * 
	 * Sends a notification
	 * @param {string} message - message you want to send
	 * @param {string} channelId - discord channel id for text channel for message to be sent
	 * @param {number} wait - amount of time to wait 
	 */
	sendNotification(message, channelId, wait) {
		if (!wait) { wait = 1000; }
		if (wait > 60000) { wait = 60000; }
		if (!channelId) { channelId = this.data.channelId; }

		this.debug(`Sending notification with {message: ${message}} to {channelId: ${channelId}}`);
		const notification = new MessageEmbed()
			.setColor(GREY)
			.setDescription(message);

		this.bot.channels.cache.get(channelId).send({ embeds: [notification] })
			.then((message) => {
				this.debug(`Notification message sent, {messageId: ${message.id}}`);
			})
			.catch((error) => {
				this.error(`{error: ${error}} sending setup message, trying again in ${wait} sec...`);
				setTimeout(() => {
					this.setup(wait * 10);
				}, wait);
			});
	}

	/**
	 * sendError()
	 * 
	 * Sends a notification
	 * @param {string} message - message you want to send
	 * @param {string} channelId - discord channel id for text channel for message to be sent
	 * @param {number} wait - amount of time to wait 
	 */
	sendError(message, channelId, wait) {
		if (!wait) { wait = 1000; }
		if (wait > 60000) { wait = 60000; }
		if (!channelId) { channelId = this.data.channelId; }

		this.debug(`Sending notification with {message: ${message}} to {channelId: ${channelId}}`);
		const error = new MessageEmbed()
			.setColor(PINK)
			.setDescription(message);

		this.bot.channels.cache.get(channelId).send({ embeds: [error] })
			.then((message) => {
				this.debug(`Error message sent, {messageId: ${message.id}}`);
			})
			.catch((error) => {
				this.error(`{error: ${error}} sending setup message, trying again in ${wait} sec`);
				setTimeout(() => {
					this.setup(wait * 10);
				}, wait);
			});
	}

	/**
	 * messageHandler()
	 * 
	 * Handles all messages the bot recieves
	 * @param {Message} message - discord message object
	 */
	messageHandler(message) {
		// ignore if not in right channel
		if (message.channelId !== this.data.channelId && message.content.indexOf('set-channel') === -1) return;

		// split message into command and argument
		let prefix = false;
		let command = '';
		let argument = '';
		if (message.content.startsWith(this.data.prefix)) {
			prefix = true;
			message.content = message.content.slice(this.data.prefix.length, message.content.length);
		}
		let msg = message.content + ' ';
		for (let i = 0; i < msg.length; i++) {
			if (msg[i] === ' ') {
				command = msg.slice(0, i);
				argument = msg.slice(i + 1, msg.length);
			}
		}

		this.debug(`Recieved {messageId: ${message.id}} with {content: ${message.content}} from {userId: ${message.author.id}} in {channelId: ${message.channelId}}. Determined {command: ${command}}, {argument: ${argument}}`);

		// check permissions for command then handle each command
		if (this.permissions.check(command, message)) {
			this.debug(`Permission granted to command with {messageId: ${message.id}}`);
			switch (command) {
				case ('set-channel'): {
					if (prefix) {
						this.data.setChannel(message.channelId);

						this.ui.sendUI();

						if (!this.data.configured) {
							this.sendNotification('This is where miku will live. You no longer need to use the prefix as all messages sent to this channel will be interpreted as commands and will be deleted after the command is executed.');
							this.data.setConfigured(true);
						}
					}
					break;
				}
				case ('join'): {
					this.vcPlayer.join(message.member.voice.channelId);
					break;
				}
				case ('play'): {
					if (argument) {
						// do something
					}
					else {
						// do something else
					}
					break;
				}
			}
		}
		else {
			this.debug(`Permission rejected to command with {messageId: ${message.id}}`);
		}
	}
}

module.exports = GuildHander;