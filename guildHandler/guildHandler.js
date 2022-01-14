const path = require('path');
const { Client, Intents, MessageEmbed, MessageEmbedFooter, MessageActionRow, MessageButton } = require('discord.js');

const UI = require(path.join(__dirname, 'ui.js'));
const Data = require(path.join(__dirname, 'data.js'));
const Permissions = require(path.join(__dirname, 'permissions.js'));
const VCPlayer = require(path.join(__dirname, 'vcPlayer.js'));
const newLogger = require(path.join(__dirname, 'logger.js'));

/* eslint-disable */														//<<<<<<<<<<<<<<<<<<<< remove this sometime
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
		const logger = newLogger(path.join(__dirname, 'logs', id));
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
				this.info('This guild has not been configured, waiting set-channel command');
			}
		});

		this.data = new Data(this, id, () => {
			this.info('Guild data ready, logging in to discord...');
			this.bot.login(DISCORD_TOKEN);
		});
	}

	/**
	 * sendNotification()
	 * 
	 * Sends a notification
	 * @param {string} message - message you want to send
	 * @param {string} channelId - discord channel id for text channel for message to be sent
	 */
	async sendNotification(message, channelId) {
		if (!channelId) { channelId = this.data.channelId; }

		try {
			this.debug(`Sending notification with {message: ${message}} to {channelId: ${channelId}}`);
			const notification = new MessageEmbed()
				.setColor(GREY)
				.setDescription(message);


			const row = new MessageActionRow()
				.addComponents(
					new MessageButton()					// remove button
						.setCustomId('primary')
						.setStyle('PRIMARY')
						.setEmoji('❌')
				);

			const channel = await this.bot.channels.fetch(channelId);
			const msg = await channel.send({ embeds: [notification], components: [row] });
			this.debug(`Notification message sent, {messageId: ${msg.id}}`);
		}
		catch (error) {
			this.error(`{error: ${error}} while creating/sending notification message.`);
		}
	}

	/**
	 * sendError()
	 * 
	 * Sends a notification
	 * @param {string} message - message you want to send
	 * @param {boolean} saveErrorId - create an error id or not
	 * @param {string} channelId - discord channel id for text channel for message to be sent
	 */
	sendError(message, saveErrorId, channelId) {
		if (!channelId) { channelId = this.data.channelId; }

		const errorId = Math.floor(Math.random() * (999999999999999 - 100000000000000) + 100000000000000);
		(async () => {
			try {
				this.debug(`Sending error message with {message: ${message}} to {channelId: ${channelId}}`);

				const error = new MessageEmbed()
					.setColor(PINK)
					.setDescription(message);

				if (saveErrorId) {
					error.setFooter(new MessageEmbedFooter(`Error id ${errorId}`));
				}

				const channel = await this.bot.channels.fetch(channelId);
				const msg = await channel.send({ embeds: [error] });
				this.debug(`Error message sent, {messageId: ${msg.id}}`);
			}
			catch (error) {
				this.error(`{error: ${error}} while creating/sending error message.`);
			}
		})();
		return errorId;
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
		if (message.content.startsWith(this.data.prefix)) {
			prefix = true;
			message.content = message.content.slice(this.data.prefix.length, message.content.length);
		}
		const msg = message.content + ' ';
		const command = msg.slice(0, msg.indexOf(' '));
		const argument = msg.slice(msg.indexOf(' ') + 1, msg.length);

		this.debug(`Recieved {messageId: ${message.id}} with {content: ${message.content}} and {prefix: ${prefix}} from {userId: ${message.author.id}} in {channelId: ${message.channelId}}. Determined {command: ${command}}, {argument: ${argument}}`);

		// check permissions for command then handle each command
		if (this.permissions.checkMessage(command, message)) {
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
					this.vcPlayer.join(message.author).catch(() => { /* vcPlayer.join() handles notifying user to nothing to do here */ });
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
	}
}

module.exports = GuildHander;