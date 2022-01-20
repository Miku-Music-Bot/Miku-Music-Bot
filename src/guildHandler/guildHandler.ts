import * as path from 'path';
import * as Discord from 'discord.js';

import * as winston from 'winston';

import { UI } from './ui';
import { GuildData } from './guildData/data';
import { CommandPermissions } from './permissions';
import { VCPlayer } from './vcPlayer';
import { newLogger } from './logger';

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
export class GuildHandler {
	logger: winston.Logger;
	debug: (msg: string) => void;
	info: (msg: string) => void;
	warn: (msg: string) => void;
	error: (msg: string) => void;

	ready: boolean;
	bot: Discord.Client;
	guild: Discord.Guild;
	ui: UI;
	data: GuildData;
	vcPlayer: VCPlayer;
	permissions: CommandPermissions;

	/**
	 * Creates data object and once data is ready, calls startBot()
	 * @param {string} id - discord guild id for GuildHander to be responsible for
	 */
	constructor(id: string) {
		// set up logger
		const logger = newLogger(path.join(__dirname, 'logs', id));
		this.logger = logger;
		this.debug = (msg) => { logger.debug(msg); };
		this.info = (msg) => { logger.info(msg); };
		this.warn = (msg) => { logger.warn(msg); };
		this.error = (msg) => { logger.error(msg); };

		this.info(`Creating guild handler for guild {id: ${id}}`);

		this.bot = new Discord.Client({				// set intent flags for bot
			intents: [
				Discord.Intents.FLAGS.GUILDS,					// for accessing guild roles
				Discord.Intents.FLAGS.GUILD_VOICE_STATES,		// for checking who is in vc and connecting to vc
			],
		});

		this.ready = false;
		this.bot.once('ready', () => {
			// get the guild object
			this.guild = this.bot.guilds.cache.get(this.data.guildId);

			// set up guild components
			this.ui = new UI(this);
			this.vcPlayer = new VCPlayer(this);
			this.permissions = new CommandPermissions(this);

			this.ready = true;
			this.info('Logged into discord, guild handler is ready!');

			if (!this.data.configured) {
				this.info('This guild has not been configured, waiting set-channel command');
			}
		});

		this.data = new GuildData(this, id, () => {
			this.info('Guild data ready, logging in to discord...');
			this.bot.login(DISCORD_TOKEN);
		});
	}

	/**
	 * messageHandler()
	 *
	 * Handles all messages the bot recieves
	 * @param {Discord.Message} message - discord message object
	 */
	messageHandler(message: Discord.Message) {
		// ignore if not in right channel
		if (message.channelId !== this.data.channelId && message.content.indexOf('set-channel') === -1) return;
		// ignore if bot isn't ready yet
		if (!this.ready) return;

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
			switch (command) {
				case ('set-channel'): {
					if (prefix) {
						// set the channel, send ui, then notify user
						this.data.setChannel(message.channelId);

						this.ui.sendUI();

						if (!this.data.configured) {
							this.ui.sendNotification(`<@${message.author.id}> This is where miku will live. You no longer need to use the prefix as all messages sent to this channel will be interpreted as commands and will be deleted after the command is executed.`);
							this.data.setConfigured(true);
						}
					} else if (message.channelId === this.data.channelId) {
						this.ui.sendNotification(`<@${message.author.id}> Miku already lives here!`);
					}
					break;
				}
				case ('join'): {
					// join the vc
					this.vcPlayer.join(message.author).catch(() => {/* vcPlayer.join() handles notifying user to nothing to do here */ });
					break;
				}
				case ('play'): {
					if (argument) {
						// do something
					} else {
						// do something else
					}
					break;
				}
			}
		}
	}

	removeGuild() {
		// stops the handler
	}
}