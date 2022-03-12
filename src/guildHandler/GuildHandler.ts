import * as fs from 'fs';
import * as path from 'path';
import * as Discord from 'discord.js';
import * as winston from 'winston';
import { drive, drive_v3 } from '@googleapis/drive';
import { AuthPlus } from 'googleapis-common';

import UI from './Components/UI';
import GuildConfig from './Components/Data/GuildData';
import CommandPermissions from './Components/PermissionChecker';
import VCPlayer from './Components/VCPlayer/VCPlayer';
import Queue from './Components/Queue';
import newLogger from '../Logger';
import Search from './Components/Search';
import { InteractionInfo, MessageInfo } from './GHChildInterface';

const LOG_DIR = process.env.LOG_DIR;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const GOOGLE_TOKEN_LOC = process.env.GOOGLE_TOKEN_LOC;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

/**
 * GuildHander
 *
 * Handles all bot functions for a specific guild
 */
export default class GuildHandler {
	logger: winston.Logger;					// logging
	debug: (msg: string) => void;
	info: (msg: string) => void;
	warn: (msg: string) => void;
	error: (msg: string) => void;

	private _ready: boolean;				// bot ready or not
	bot: Discord.Client;					// bot client
	guild: Discord.Guild;					// bot guild

	drive: drive_v3.Drive;					// google drive api object
	ui: UI;									// ui component
	data: GuildConfig;						// guildData component
	vcPlayer: VCPlayer;						// vcPlayer component
	queue: Queue;							// queue component
	permissions: CommandPermissions;		// permissions component
	search: Search;							// search component

	/**
	 * Creates data object and once data is ready, calls startbot
	 * @param id - discord guild id for GuildHander to be responsible for
	 */
	constructor(id: string) {

		// set up logger
		const filename = path.basename(__filename);
		const logger = newLogger(path.join(LOG_DIR, id));
		this.logger = logger;
		this.debug = (msg) => { logger.debug(`{filename: ${filename}} ${msg}`); };
		this.info = (msg) => { logger.info(msg); };
		this.warn = (msg) => { logger.warn(`{filename: ${filename}} ${msg}`); };
		this.error = (msg) => { logger.error(`{filename: ${filename}} ${msg}`); };

		this.debug(`Created logger for guild handler with {guildId: ${id}}, logging to {dir:${path.join(LOG_DIR, id)}}`);
		this.info(`Creating guild handler for guild id: ${id}`);

		// Authenticate with google drive api
		try {
			const authPlus = new AuthPlus();
			const auth = new authPlus.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
			this.info(`Attempting to read google drive token from: "${GOOGLE_TOKEN_LOC}"`);
			const token = fs.readFileSync(GOOGLE_TOKEN_LOC).toString();
			auth.setCredentials(JSON.parse(token));
			this.drive = drive({ version: 'v3', auth });
			this.info('Successfully authenticated with Google Drive Api');
		}
		catch (error) {
			this.error(`{error:${error.message}} while trying to read google drive token. {stack:${error.stack}}`);
			process.exit();
		}

		// Create discord client
		this.bot = new Discord.Client({								// set intent flags for bot
			intents: [
				Discord.Intents.FLAGS.GUILDS,						// for accessing guild roles
				Discord.Intents.FLAGS.GUILD_VOICE_STATES,			// for checking who is in vc and connecting to vc
			],
		});

		this._ready = false;										// bot is not ready yet
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
			if (!this.data.guildSettings.configured) {
				this.info(`This guild has not been configured, waiting "${this.data.guildSettings.prefix}set-channel" command`);

				// Get first text channel and send setup message
				const defaultChannel = this.guild.channels.cache.filter(channel => channel.type === 'GUILD_TEXT').first();
				this.debug(`Found default channel with {id:${defaultChannel.id}} to send setup message to`);
				this.ui.sendNotification(`Thanks for inviting me! Type "${this.data.guildSettings.prefix}set-channel" to choose the channel I'll reside in.`);
			}
			else {
				// Send UI otherwise
				this.debug(`Bot has been configured, sending UI to {channel:${this.data.guildSettings.channelId}}`);
				this.ui.sendUI(true);
			}
		});

		// get guild data, once data is ready, log into discord
		this.debug('Fetching guild data from database.');
		this.data = new GuildConfig(this, id, () => {
			this.info('Guild data ready, logging in to discord.');
			this.bot.login(DISCORD_TOKEN);
		});
	}

	/**
	 * messageHandler()
	 *
	 * Handles all messages the bot recieves
	 * @param message - object with message info object
	 * @returms Promise resolves to true if handled message, false if not
	 */
	async messageHandler(message: MessageInfo): Promise<boolean> {
		// ignore if bot isn't ready yet
		if (!this._ready) {
			this.debug('Recieved {messageId: ${message.id}} with {content: ${message.content}} and {prefix: ${prefix}} from {userId: ${message.authorId}} in {channelId: ${message.channelId}} before bot was ready, ignoring');
			return false;
		}
		// ignore if not in right channel
		if (message.channelId !== this.data.guildSettings.channelId && message.content.toLowerCase().indexOf('set-channel') === -1) return false;

		// split message into command and argument
		message.content = message.content.toLowerCase();
		let prefix = false;
		if (message.content.startsWith(this.data.guildSettings.prefix)) {
			prefix = true;
			message.content = message.content.slice(this.data.guildSettings.prefix.length, message.content.length);
		}
		const msg = message.content + ' ';
		const command = msg.slice(0, msg.indexOf(' '));
		const argument = msg.slice(msg.indexOf(' ') + 1, msg.length);
		this.debug(`Recieved {messageId: ${message.id}} with {content: ${message.content}} and {prefix: ${prefix}} from {userId: ${message.authorId}} in {channelId: ${message.channelId}}. Parsed {command: ${command}}, {argument: ${argument}}`);

		// check permissions for command then handle each command
		if (await this.permissions.checkMessage(command, message)) {
			switch (command) {
				case ('set-channel'): {
					this.info('Recieved "set-channel" command');
					// Set channel id to channel id of incoming message
					if (message.channelId === this.data.guildSettings.channelId) {
						// if channel id matches the current channel id
						this.debug('New channel id matches current channel id, sending notification');
						this.ui.sendNotification(`<@${message.authorId}> Miku already lives here!`);
					}
					else if (prefix) {
						// set the channel, send ui, then notify user if this is the first time
						this.info(`Guild handler channel id set to "${message.channelId}"`);
						this.data.guildSettings.channelId = message.channelId;

						this.ui.sendUI();

						if (!this.data.guildSettings.configured) {
							this.debug('First time guild has been configured, sending introduction message');
							this.ui.sendNotification(`<@${message.authorId}> This is where miku will live. You no longer need to use the prefix as all messages sent to this channel will be interpreted as commands and will be deleted after the command is executed.`);
							this.data.guildSettings.configured = true;
						}
					}
					break;
				}
				case ('join'): {
					this.info('Recieved "join" command, joining voice channel');
					// join the vc
					this.vcPlayer.join(message.authorId);
					break;
				}
				case ('play'): {
					this.info('Recieved "play" command');
					// if not connected to vc, connect
					if (!this.vcPlayer.connected) {
						this.info('Not in voice channel, joining');
						const joined = await this.vcPlayer.join(message.authorId);
						if (!joined) {
							this.warn('Did not successfully join voice channel, will not try to play song');
							break;
						}
					}

					// if there is an argument, means to play/add song to queue
					if (argument) {
						// search for song
						this.info('Argument detected, searching for song');
						this.search.search(argument);
						break;
					}

					// if no arguments, check if already playing a song
					// if so, should resume
					if (this.vcPlayer.playing) {
						this.info('No Arguments detected and currently playing song, resuming playback');
						this.vcPlayer.resume();
						break;
					}

					// should start playing from autoplay
					this.info('Nothing playing right now and no arguments detected, playing what\'s next in the queue');
					this.queue.nextSong();
					break;
				}
				case ('pause'): {
					this.info('Recieved "pause" command');
					// Pause the player if currently playing
					if (this.vcPlayer.playing) {
						this.info('Currently playing song, pausing');
						this.vcPlayer.pause();
					}
					else {
						this.info('Not currently playing, nothing to pause, sending notification');
						this.ui.sendNotification('Nothing to pause!');
					}
					break;
				}
				case ('resume'): {
					this.info('Recieved "resume" command');

					if (this.vcPlayer.playing) {
						this.info('Currently playing song, resuming');
						this.vcPlayer.resume();
					}
					else {
						this.info('Not currently playing, nothing to pause, sending notification');
						this.ui.sendNotification('Nothing to resume!');
					}
					break;
				}
				case ('stop'): case ('leave'): {
					this.info('Recieved "stop" command, leaving voice channel');
					this.vcPlayer.leave();
					break;
				}
				case ('skip'): case ('next'): {
					this.info('Recieved "skip" command, ending current song early');
					this.vcPlayer.finishedSong();
					break;
				}
				case ('repeat-song'): case ('repeat'): case ('rs'): {
					this.info('Recieved "repeat-song" command');

					let count;
					const parsed = parseInt(argument);
					if (!isNaN(parsed)) {
						this.debug(`Successfully parsed {integer:${parsed}} from argument`);
						count = parsed;
					}
					else {
						if (argument.indexOf('infinite') !== -1 || argument.indexOf('infinity') !== -1) {
							this.debug('Argument contained "infinite" or "infinity", setting repeat count to -1');
							count = -1;
						}
						else {
							this.debug('Failed to parse integer from command nor did it contain "infinite" or "infinity", sending notification');
							this.ui.sendNotification(`<@${message.authorId}> "${argument}" is not a number!`);
							break;
						}
					}

					this.info(`Setting repeat song count to {count:${count}}`);
					this.queue.setRepeatSong(count);
					break;
				}
				case ('repeat-queue'): case ('rq'): {
					this.info('Recieved "repeat-queue" command');

					let count;
					const parsed = parseInt(argument);
					if (!isNaN(parsed)) {
						this.debug(`Successfully parsed {integer:${parsed}} from argument`);
						count = parsed;
					}
					else {
						if (argument.indexOf('infinite') !== -1 || argument.indexOf('infinity') !== -1) {
							this.debug('Argument contained "infinite" or "infinity", setting repeat count to -1');
							count = -1;
						}
						else {
							this.debug('Failed to parse integer from command nor did it contain "infinite" or "infinity", sending notification');
							this.ui.sendNotification(`<@${message.authorId}> "${argument}" is not a number!`);
							break;
						}
					}

					this.info(`Setting repeat queue count to {count:${count}}`);
					this.queue.setRepeatQueue(count);
					break;
				}
				case ('shuffle'): case ('toggle-shuffle'): {
					this.info('Recieved "toggle-shuffle" command');

					let state = undefined;
					if (argument.indexOf('on') !== -1 || argument.indexOf('true') !== -1) {
						this.debug('Argument contained "on" or "true", setting state to true');
						state = true;
					}
					else if (argument.indexOf('off') !== -1 || argument.indexOf('false') !== -1) {
						this.debug('Argument contained "off" or "false", setting state to false');
						state = false;
					}

					this.info(`Setting shuffle to {state:${state}}`);
					this.queue.toggleShuffle(state);
					break;
				}
				case ('show-queue'): case ('sq'): {
					this.info('Recieved "show-queue" command');

					let page = 1;
					const parsed = parseInt(argument);
					if (!isNaN(parsed)) {
						this.debug(`Successfully parsed {integer:${parsed}} from argument`);
						page = parsed;
					}
					else { this.debug('Failed to parse integer from argument, seting page to 1'); }

					this.info(`Showing page: ${page} of queue`);
					this.queue.showPage(page);
					break;
				}
				case ('clear-queue'): case ('cq'): {
					this.info('Recieved "clear-queue" command, clearing queue');
					this.queue.clearQueue();
					break;
				}
				case ('remove'): {
					this.info('Recieved "remove" command');

					let index;
					const parsed = parseInt(argument);
					if (!isNaN(parsed)) {
						this.debug(`Successfully parsed {integer:${parsed}} from argument`);
						index = parsed;
					}
					else {
						this.debug('Failed to parse integer from argument, will not remove a song, sending notification');
						this.ui.sendNotification(`<@${message.authorId}> "${argument}" is not a number!`);
						break;
					}

					this.info(`Removing song with index: ${index}`);
					this.queue.removeSong(index);
					break;
				}
				case ('advance'): {
					this.info('Recieved "advance" command');

					let index;
					const parsed = parseInt(argument);
					if (!isNaN(parsed)) {
						this.debug(`Successfully parsed {integer:${parsed}} from argument`);
						index = parsed;
					}
					else {
						this.debug('Failed to parse integer from argument, will not remove a song, sending notification');
						this.ui.sendNotification(`<@${message.authorId}> "${argument}" is not a number!`);
						break;
					}

					this.info(`Advancing song with index: ${index}`);
					this.queue.advance(index);
					break;
				}
				case ('clear-channel'): case ('cc'): {
					this.info('Recieved "clear-channel" command');

					let count = 10;
					const parsed = parseInt(argument);
					if (!isNaN(parsed)) {
						this.debug(`Successfully parsed {integer:${parsed}} from argument`);
						count = parsed;
					}
					else { this.debug(`Failed to parse integer from argument, using default value of ${count}`); }

					// grab text channel
					this.debug(`Fetching channel with {channelId:${message.channelId}}`);
					const channel = await this.bot.channels.fetch(message.channelId);
					this.debug(`Found channel {channelId:${message.channelId}}`);

					if (channel instanceof Discord.TextChannel) {
						try {
							this.debug(`Attempting to delete ${count} messages from channel with channelId: ${message.channelId}`);
							await channel.bulkDelete(count);
							this.debug(`Successfully deleted ${count} messages from channel with channelId: ${message.channelId}, resending UI and sending notification`);

							this.ui.sendUI(true);
							setTimeout(() => { this.ui.sendNotification(`Deleted ${count} messages`); }, 1000);
						}
						catch (error) {
							this.warn(`{error:${error.message}} while bulk deleting messages. Sending notification`);
							this.ui.sendNotification(`Failed to delete ${count} messages, maybe they are too old?`);
						}
					}
					break;
				}
				case ('toggle-autoplay'): case ('autoplay'): {
					this.info('Recieved "toggle-shuffle" command');

					let state = !this.data.guildSettings.autoplay;
					if (argument.indexOf('on') !== -1 || argument.indexOf('true') !== -1) {
						this.debug('Argument contained "on" or "true", setting state to true');
						state = true;
					}
					else if (argument.indexOf('off') !== -1 || argument.indexOf('false') !== -1) {
						this.debug('Argument contained "off" or "false", setting state to false');
						state = false;
					}

					this.info(`Setting autoplay to ${state}`);
					this.data.guildSettings.autoplay = state;
					break;
				}
				default: {
					this.warn(`Message {id:${message.id}} with {command:${command}} and {argument:${argument}} was not handled in switch case`);
					break;
				}
			}
		}
		this.debug('Updating UI after handling message');
		await this.ui.updateUI();
		return true;
	}

	/**
	 * interactionHandler()
	 * 
	 * Handles all interactions the bot recieves
	 * @param interaction - object with all interaction information
	 * @return Promise resovles to true if the interaction was handled, false if not
	 */
	async interactionHandler(interaction: InteractionInfo): Promise<boolean> {
		this.debug(`Recieved interaction from {authorId:${interaction.authorId}} with {customId:${interaction.customId}}, {parentMessageId:${interaction.parentMessageId}}, and {parentChannelId:${interaction.parentChannelId}}`);
		if (!this._ready) {
			this.debug('Recieved interaction before bot was ready, ignoring');
			return false;
		}
		return await this.ui.buttonPressed(interaction);
	}

	/**
	 * removeGuild();
	 * 
	 * Call to stop the guild handler and clean up
	 */
	async removeGuild(purge?: boolean): Promise<void> {
		this.info('Cleaning up and removing guild');

		this.vcPlayer.leave();
		this.ui.deleteAllMsg();
		if (purge) {
			this.info('Purging guild data from database');
			await this.data.deleteGuild();
		}
	}
}