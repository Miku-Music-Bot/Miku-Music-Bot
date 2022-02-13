import * as path from 'path';
import * as Discord from 'discord.js';
import * as winston from 'winston';

import UI from './UI';
import GuildData from './Data';
import CommandPermissions from './Permissions';
import VCPlayer from './VCPlayer/VCPlayer';
import Queue from './VCPlayer/Queue';
import AudioSettings from './VCPlayer/AudioSettings';
import newLogger from './Logger';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

import YTSource from './VCPlayer/sources/YTSource';
import Song from './VCPlayer/Song';
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
	data: GuildData;
	vcPlayer: VCPlayer;
	queue: Queue;
	permissions: CommandPermissions;
	audioSettings: AudioSettings;


	source: YTSource;
	/**
	 * Creates data object and once data is ready, calls startbot
	 * @param id - discord guild id for GuildHander to be responsible for
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
			this.audioSettings = new AudioSettings(this);




			this.source = new YTSource(this, { url: 'https://www.youtube.com/watch?v=5qap5aO4i9A', live: true, type: 'yt', fetchData: async () => { /* */ } } as unknown as Song);
			this.source.bufferStream();
			// bot is now ready
			this._ready = true;
			this.info('Logged into discord, guild handler is ready!');

			// if not configured, log for helping debugging
			if (!this.data.configured) { this.info('This guild has not been configured, waiting set-channel command'); }
		});

		// get guild data, once data is ready, log into discord
		this.data = new GuildData(this, id, () => {
			this.info('Guild data ready, logging in to discord...');
			this.bot.login(DISCORD_TOKEN);
		});
	}

	/**
	 * messageHandler()
	 *
	 * Handles all messages the bot recieves
	 * @param message - discord message object
	 */
	async messageHandler(message: Discord.Message) {
		// ignore if bot isn't ready yet
		if (!this._ready) return;
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
		if (await this.permissions.checkMessage(command, message)) {
			switch (command) {
				case ('set-channel'): {
					if (prefix) {
						// set the channel, send ui, then notify user
						this.data.channelId = message.channelId;

						this.ui.sendUI();

						if (!this.data.configured) {
							this.ui.sendNotification(`<@${message.author.id}> This is where miku will live. You no longer need to use the prefix as all messages sent to this channel will be interpreted as commands and will be deleted after the command is executed.`);
							this.data.configured = true;
						}
					} else if (message.channelId === this.data.channelId) {
						this.ui.sendNotification(`<@${message.author.id}> Miku already lives here!`);
					}
					break;
				}
				case ('join'): {
					// join the vc
					this.vcPlayer.join(message.author).catch(() => { /* vcPlayer.join() handles notifying user to nothing to do here */ });
					break;
				}
				case ('play'): {
					// if there is an argument, means to play/add song to queue
					if (argument) {
						// start queue song process
						break;
					}

					// if no arguments, check if already playing a song
					// if so, should resume
					if (this.vcPlayer.playing) {
						this.vcPlayer.resume();
						break;
					}

					// should start playing from autoplay
					this.vcPlayer.play(this.source);
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
	 * removeguild
	 * 
	 * Call to stop the guild handler and clean up
	 */
	removeGuild() {
		//
	}
}