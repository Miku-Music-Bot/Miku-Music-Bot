import * as path from 'path';
import * as Discord from 'discord.js';
import * as winston from 'winston';

import UI from './Components/UI';
import GuildConfig from './Components/Data/GuildData';
import CommandPermissions from './Components/PermissionChecker';
import VCPlayer from './Components/VCPlayer/VCPlayer';
import Queue from './Components/Queue';
import newLogger from '../Logger';
import Search from './Components/Search';

import { InteractionInfo, MessageInfo } from './GHChildInterface';

const LOG_DIR = process.env.LOG_DIR;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

/**
 * GuildHander
 *
 * Handles all bot functions for a specific guild
 */
export default class GuildHandler {
	logger: winston.Logger;
	debug: (msg: string) => void;
	info: (msg: string) => void;
	warn: (msg: string) => void;
	error: (msg: string) => void;

	private _ready: boolean;
	bot: Discord.Client;
	guild: Discord.Guild;

	ui: UI;
	data: GuildConfig;
	vcPlayer: VCPlayer;
	queue: Queue;
	permissions: CommandPermissions;
	search: Search;

	/**
	 * Creates data object and once data is ready, calls startbot
	 * @param id - discord guild id for GuildHander to be responsible for
	 */
	constructor(id: string) {
		// set up logger
		const logger = newLogger(path.join(LOG_DIR, id));
		this.logger = logger;
		this.debug = (msg) => { logger.debug(msg); };
		this.info = (msg) => { logger.info(msg); };
		this.warn = (msg) => { logger.warn(msg); };
		this.error = (msg) => { logger.error(msg); };

		this.info(`Creating guild handler for guild {id: ${id}}`);
		this.bot = new Discord.Client({						// set intent flags for bot
			intents: [
				Discord.Intents.FLAGS.GUILDS,					// for accessing guild roles
				Discord.Intents.FLAGS.GUILD_VOICE_STATES,		// for checking who is in vc and connecting to vc
			],
		});

		this._ready = false;									// bot ready or not to prevent messages from being processed before bot is ready to do so
		this.bot.once('ready', () => {
			// get the guild object
			this.guild = this.bot.guilds.cache.get(this.data.guildId);

			// set up guild components
			this.ui = new UI(this);
			this.vcPlayer = new VCPlayer(this);
			this.queue = new Queue(this);
			this.permissions = new CommandPermissions(this);
			this.search = new Search(this);

			// bot is now ready
			this._ready = true;
			this.info('Logged into discord, guild handler is ready!');

			// if not configured, log for helping debugging
			if (!this.data.guildSettings.configured) { this.info('This guild has not been configured, waiting set-channel command'); }
			else { this.ui.sendUI(); }
		});

		// get guild data, once data is ready, log into discord
		this.data = new GuildConfig(this, id, () => {
			this.info('Guild data ready, logging in to discord...');
			this.bot.login(DISCORD_TOKEN);
		});
	}

	/**
	 * messageHandler()
	 *
	 * Handles all messages the bot recieves
	 * @param message - object with all message information
	 */
	async messageHandler(message: MessageInfo) {
		// ignore if bot isn't ready yet
		if (!this._ready) return;
		// ignore if not in right channel
		if (message.channelId !== this.data.guildSettings.channelId && message.content.indexOf('set-channel') === -1) return;

		// split message into command and argument
		let prefix = false;
		if (message.content.startsWith(this.data.guildSettings.prefix)) {
			prefix = true;
			message.content = message.content.slice(this.data.guildSettings.prefix.length, message.content.length);
		}
		const msg = message.content + ' ';
		const command = msg.slice(0, msg.indexOf(' '));
		const argument = msg.slice(msg.indexOf(' ') + 1, msg.length);
		this.debug(`Recieved {messageId: ${message.id}} with {content: ${message.content}} and {prefix: ${prefix}} from {userId: ${message.authorId}} in {channelId: ${message.channelId}}. Determined {command: ${command}}, {argument: ${argument}}`);

		// check permissions for command then handle each command
		if (await this.permissions.checkMessage(command, message)) {
			switch (command) {
				case ('set-channel'): {
					if (prefix) {
						// set the channel, send ui, then notify user
						this.data.guildSettings.channelId = message.channelId;

						this.ui.sendUI();

						if (!this.data.guildSettings.configured) {
							this.ui.sendNotification(`<@${message.authorId}> This is where miku will live. You no longer need to use the prefix as all messages sent to this channel will be interpreted as commands and will be deleted after the command is executed.`);
							this.data.guildSettings.configured = true;
						}
					} else if (message.channelId === this.data.guildSettings.channelId) {
						this.ui.sendNotification(`<@${message.authorId}> Miku already lives here!`);
					}
					break;
				}
				case ('join'): {
					// join the vc
					this.vcPlayer.join(message.authorId);
					break;
				}
				case ('play'): {
					// if not connected to vc, connect
					if (!this.vcPlayer.connected) { 
						const joined = await this.vcPlayer.join(message.authorId);
						if (!joined) break;
					}

					// if there is an argument, means to play/add song to queue
					if (argument) {
						// search for song
						this.search.search(argument);
						break;
					}

					// if no arguments, check if already playing a song
					// if so, should resume
					if (this.vcPlayer.playing) {
						this.vcPlayer.resume();
						break;
					}

					// should start playing from autoplay
					this.queue.nextSong();
					break;
				}
				case ('pause'): {
					if (this.vcPlayer.playing) { this.vcPlayer.pause(); }
					else { this.ui.sendError('Nothing to pause!'); }
					break;
				}
				case ('resume'): {
					if (this.vcPlayer.playing) { this.vcPlayer.resume(); }
					else { this.ui.sendError('Nothing to resume!'); }
					break;
				}
				case('stop'): {
					this.vcPlayer.leave();
					break;
				}
			}
		}
	}

	/**
	 * interactionHandler()
	 * 
	 * Handles all interactions the bot recieves
	 * @param interaction - object with all interaction information
	 * @return true/false if the interaction was successful
	 */
	async interactionHandler(interaction: InteractionInfo) {
		if (!this._ready) { return false; }
		return await this.ui.buttonPressed(interaction); 
	}

	/**
	 * removeguild
	 * 
	 * Call to stop the guild handler and clean up
	 */
	removeGuild() {
		//
	}
}