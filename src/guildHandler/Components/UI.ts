import * as Discord from 'discord.js';

import GuildComponent from './GuildComponent';
import type GuildHandler from '../GuildHandler';
import { InteractionInfo } from '../GHChildInterface';

const UI_REFRESH_RATE = parseInt(process.env.UI_REFRESH_RATE);
/* eslint-disable */
const BOT_DOMAIN = process.env.BOT_DOMAIN;
const DEFAULT_THUMBNAIL_URL = process.env.DEFAULT_THUMBNAIL_URL;

const GREY = '#5a676b';			// colors to be used
const TEAL = '#86cecb';
const PINK = '#e12885';
const YT_RED = '#FF0000';
const SC_ORANGE = '#FE5000';
const GD_BLUE = '#4688F4';
/* eslint-enable */

/**
 * UI
 *
 * Handles creating and refreshing the user interface of the bot in discord
 */
export default class UI extends GuildComponent {
	private _uiChannelId: string;
	private _uiMessageId: string;
	private _lastMessageJSON: string;
	private _interactionListeners: {
		[key: string]: {
			timeout?: NodeJS.Timeout,
			interactionHandler: (interaction: InteractionInfo) => Promise<boolean>
		}
	};
	private _nextRefreshTimeout: NodeJS.Timeout;

	/**
	 * @param guildHandler - guildHandler of the guild this ui object is to be responsible for
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
		this._interactionListeners = {};
	}

	/**
	 * sendUI()
	 *
	 * Sends UI to channel
	 */
	async sendUI() {
		// Delete ui if it already exists
		if (this._uiMessageId) { await this.deleteMsg(this._uiChannelId, this._uiMessageId); }

		// Handles interactions
		const interactionHandler = async (interaction: InteractionInfo) => {
			try {
				const customId = JSON.parse(interaction.customId);

				switch (customId.type) {
					case ('play/pause'): {
						// if not connected to vc, connect
						if (!this.vcPlayer.connected) {
							const joined = await this.vcPlayer.join(interaction.authorId);
							// should start playing from autoplay
							if (joined) { this.queue.nextSong(); }
							break;
						}

						// if not playing anything, start playing fron queue
						if (!this.vcPlayer.playing) {
							this.queue.nextSong();
							break;
						}

						// toggle pause/play
						if (this.vcPlayer.paused) { this.vcPlayer.resume(); }
						else { this.vcPlayer.pause(); }
						break;
					}
					case ('stop'): {
						this.vcPlayer.leave();
						this.queue.stop();
						break;
					}
					case ('skip'): {
						this.vcPlayer.finishedSong();
						break;
					}
					case ('repeat'): {
						this.queue.setRepeatSong(customId.repeat + 1);
						break;
					}
					default: { return false; }
				}
				await this.updateUI();
				return true;
			}
			catch (error) {
				this.warn(`{error: ${error}} while handling {interaction: ${JSON.stringify(interaction)}}`);
				return false;
			}
		};

		// Create and send message
		this._uiChannelId = this.data.guildSettings.channelId;
		const ui = this._createUI();
		if (this._lastMessageJSON !== JSON.stringify(ui)) {
			this._lastMessageJSON = JSON.stringify(ui);
			this._uiMessageId = await this.sendEmbed(ui, -1, interactionHandler);
		}
		this.updateUI();
	}

	/**
	 * updateUI()
	 * 
	 * Updates the UI of the bot
	 */
	async updateUI() {
		clearInterval(this._nextRefreshTimeout);
		const ui = this._createUI();
		if (this._lastMessageJSON !== JSON.stringify(ui)) {
			const success = await this.updateMsg(this.data.guildSettings.channelId, this._uiMessageId, ui);
			if (success) { this._lastMessageJSON = JSON.stringify(ui); }
		}
		this._nextRefreshTimeout = setTimeout(() => { this.updateUI(); }, UI_REFRESH_RATE);
	}

	/**
	 * createUI()
	 *
	 * Creates discord messageEmbed for UI
	 * @return Discord message embed
	 */
	private _createUI(): Discord.MessageOptions {
		const songInfoMaxLength = 50;

		const queueInfo = this.queue.getUIInfo();

		const userInterface = new Discord.MessageEmbed();

		if (!queueInfo.nowPlaying) {
			// If not playing right now, show idle UI
			userInterface
				.setTitle('Idle - Listening for Commands')
				.setDescription('Click the "help" button below if you need help')
				.setThumbnail(DEFAULT_THUMBNAIL_URL);
		}
		else {
			// Check song status, (paused over buffering over playing)
			let status = '';
			if (this.vcPlayer.paused) { status = 'Paused'; }
			else if (this.vcPlayer.currentSource.buffering) { status = 'Buffering'; }
			else { status = 'Playing'; }
			userInterface.setAuthor({ name: status });

			// Song title
			let title = queueInfo.nowPlayingSong.title;
			if (queueInfo.nowPlayingSong.title.length > songInfoMaxLength) {
				title = queueInfo.nowPlayingSong.title.substring(0, songInfoMaxLength - 3) + '...';
			}
			userInterface.setTitle(this.ui.escapeString(title));

			// Set thumbnail
			userInterface.setThumbnail(queueInfo.nowPlayingSong.thumbnailURL);

			// Create progress bar
			const progressBarLength = 70;
			let progressBar = '';
			// Convert duration in sec to string and add to progress bar
			let progress = this.vcPlayer.currentSource.getPlayedDuration();
			let hours: number | string = Math.floor(progress / 3600);
			if (hours < 10) { hours = '0' + hours.toString(); }
			progress %= 3600;
			let min: number | string = Math.floor(progress / 60);
			if (min < 10) { min = '0' + min.toString(); }
			progress %= 60;
			let sec: number | string = progress;
			if (sec < 10) { sec = '0' + sec.toString(); }
			progressBar += `-${hours.toString()}:${min.toString()}:${sec.toString()} [`;

			// Figure out where to put the indicator
			progress = this.vcPlayer.currentSource.getPlayedDuration();
			const lineLength = progressBarLength - progressBar.length - this.vcPlayer.currentSource.song.durationString.length - 2;
			const indicatorLoc = Math.round(progress / this.vcPlayer.currentSource.song.duration * lineLength);
			// Create bar
			for (let i = 0; i < lineLength; i++) {
				if (i === indicatorLoc) { progressBar += '|'; }
				else { progressBar += '-'; }
			}
			// Add overall duration to the end
			progressBar += (this.vcPlayer.currentSource.song.live) ? '] Live' : `] ${queueInfo.nowPlayingSong.durationString}`;
			userInterface.setDescription(progressBar);

			// Song information
			let sourceName = '';
			switch (queueInfo.nowPlayingSong.type) {
				case ('yt'): { sourceName = 'Youtube'; break; }
				case ('gd'): { sourceName = 'Google Drive'; break; }
			}
			userInterface.addFields([
				{
					name: 'Requested By',
					value: (queueInfo.nowPlayingSong.reqBy === '') ? 'Autoplay' : `<@${queueInfo.nowPlayingSong.reqBy}>`,
					inline: true
				},
				{
					name: (queueInfo.nowPlayingSong.type === 'yt') ? 'Channel' : 'Artist',
					value: (queueInfo.nowPlayingSong.artist) ? this.escapeString(queueInfo.nowPlayingSong.artist) : 'unknown',
					inline: true
				},
				{
					name: 'Link',
					value: `[${this.escapeString(sourceName)}](${queueInfo.nowPlayingSong.url})`,
					inline: true
				}
			]);

			// Last played information
			if (queueInfo.lastPlayed) {
				let lastPlayedText = '';
				if (queueInfo.lastPlayed.title.length > songInfoMaxLength) {
					lastPlayedText += queueInfo.lastPlayed.title.substring(0, songInfoMaxLength - 3) + '...';
				}
				else { lastPlayedText += queueInfo.lastPlayed.title; }
				userInterface.addFields({
					name: 'Last Played',
					value: `${this.escapeString(lastPlayedText)} - [${(queueInfo.lastPlayed.reqBy) ? `<@${queueInfo.lastPlayed.reqBy}>` : 'Autoplay'}]`,
					inline: false
				});
			}

			// Queue information
			let queueTxt = '';
			for (let i = 0; i < 3; i++) {
				if (i === queueInfo.nextInQueue.length) {
					if (queueInfo.repeatQueue === 0) { queueTxt += '**>> End Of Queue <<**'; break; }
					else { queueTxt += '**>> Repeat Queue <<**'; break; }
				}

				// Index number for item
				let itemText = `${(queueInfo.nextInQueue[i].index + 1).toString()}. `;
				// Add title of song cut off to be the right length
				if (queueInfo.nextInQueue[i].song.title.length > songInfoMaxLength) {
					itemText += this.escapeString(queueInfo.nextInQueue[i].song.title.substring(0, songInfoMaxLength - 3 - itemText.length) + '...');
				}
				else { itemText += queueInfo.nextInQueue[i].song.title; }
				queueTxt += `${itemText} - [${(queueInfo.nextInQueue[i].song.reqBy) ? `<@${queueInfo.nextInQueue[i].song.reqBy}>` : 'Autoplay'}]\n`;
			}
			userInterface.addFields({
				name: 'Queue',
				value: queueTxt,
				inline: false
			});

			// Autoplay information
			let autoplayTxt = '';
			if (queueInfo.autoplay) {
				for (let i = 0; i < 3; i++) {
					if (i === queueInfo.nextInAutoplay.length) { autoplayTxt += '**>> End Of Autoplay Queue <<**'; break; }
					// Index number for item
					let itemText = `${(queueInfo.nextInAutoplay[i].index + 1).toString()}. `;
					// Add title of song cut off to be the right length
					if (queueInfo.nextInAutoplay[i].song.title.length > songInfoMaxLength) {
						itemText += this.escapeString(queueInfo.nextInAutoplay[i].song.title.substring(0, songInfoMaxLength - 3 - itemText.length) + '...');
					}
					else { itemText += queueInfo.nextInAutoplay[i].song.title; }
					autoplayTxt += `${itemText}\n`;
				}
			}
			else { autoplayTxt += 'Autoplay is off'; }
			userInterface.addFields({
				name: 'Autoplay',
				value: autoplayTxt,
				inline: false
			});
		}

		let autostopDisplay = 'off';
		if (queueInfo.autostop === 'queue') { autostopDisplay = 'After this song'; }
		if (queueInfo.autostop === 'song') { autostopDisplay = 'After finishing queue'; }
		userInterface
			.addFields([
				{
					name: 'Autoplay',
					value: queueInfo.autoplay ? 'on' : 'off',
					inline: true
				},
				{
					name: 'Autostop',
					value: autostopDisplay,
					inline: true
				},
				{
					name: 'Repeat Queue',
					value: `${queueInfo.repeatQueue} time${(queueInfo.repeatQueue !== 1) ? 's' : ''}`,
					inline: true
				}
			]);

		// Buttons
		const audioControls = new Discord.MessageActionRow()
			.addComponents(
				// Play pause button
				new Discord.MessageButton()
					.setLabel('Play/Pause')
					.setCustomId(JSON.stringify({ type: 'play/pause', special: 1 }))
					.setStyle('PRIMARY')
			)
			.addComponents(
				// Stop button
				new Discord.MessageButton()
					.setLabel('Stop')
					.setCustomId(JSON.stringify({ type: 'stop', special: 2 }))
					.setStyle('DANGER')
					.setDisabled(!this.vcPlayer.connected)
			)
			.addComponents(
				// Skip button
				new Discord.MessageButton()
					.setLabel('Skip')
					.setCustomId(JSON.stringify({ type: 'skip', special: 3 }))
					.setStyle('SUCCESS')
					.setDisabled(!this.vcPlayer.playing)
			)
			.addComponents(
				// Shuffle button
				new Discord.MessageButton()
					.setLabel(`Shuffle: ${(queueInfo.shuffle) ? 'on' : 'off'}`)
					.setCustomId(JSON.stringify({ type: 'shuffle', repeat: !queueInfo.shuffle, special: 4 }))
					.setStyle('SECONDARY')
					.setDisabled(!this.vcPlayer.playing)
			)
			.addComponents(
				// Repeat button
				new Discord.MessageButton()
					.setLabel(`Repeat Song: ${queueInfo.repeatSong} time${(queueInfo.repeatSong !== 1) ? 's' : ''}`)
					.setCustomId(JSON.stringify({ type: 'repeat', repeat: queueInfo.repeatSong, special: 5 }))
					.setStyle('SECONDARY')
					.setDisabled(!this.vcPlayer.playing)
			);

		// Links
		const links = new Discord.MessageActionRow()
			.addComponents(
				// Web panel link
				new Discord.MessageButton()
					.setLabel('Web Panel')
					.setURL(`${BOT_DOMAIN}/${this.data.guildId}`)
					.setStyle('LINK')
			)
			.addComponents(
				// Report issue link
				new Discord.MessageButton()
					.setLabel('Report Issue')
					.setURL(`${BOT_DOMAIN}/${this.data.guildId}/report`)
					.setStyle('LINK')
			)
			.addComponents(
				// Help link
				new Discord.MessageButton()
					.setLabel('Help')
					.setURL(`${BOT_DOMAIN}/${this.data.guildId}/help`)
					.setStyle('LINK')
			);

		return { embeds: [userInterface], components: [audioControls, links] };
	}

	async deleteMsg(channelId: string, messageId: string) {
		try {
			const channel = await this.bot.channels.fetch(channelId) as Discord.TextChannel;
			const message = await channel.messages.fetch(messageId);

			await message.delete();
			clearTimeout(this._interactionListeners[messageId].timeout);
			delete this._interactionListeners[messageId];
		}
		catch (error) { this.error(`{error: ${error}} while deleting message with {messageId: ${messageId}} in {channelId: ${channelId}}`); }
	}

	/**
	 * sendNotification()
	 *
	 * Sends a notification
	 * @param message - message you want to send
	 * @param channelId - discord channel id for text channel for message to be sent
	 */
	async sendNotification(message: string, channelId: string | void): Promise<void> {
		if (!channelId) { channelId = this.data.guildSettings.channelId; }

		try {
			this.debug(`Sending notification with {message: ${message}} to {channelId: ${channelId}}`);
			const notification = new Discord.MessageEmbed()
				.setTitle('Notification')
				.setColor(GREY)
				.setDescription(message);


			const row = new Discord.MessageActionRow()
				.addComponents(
					// close button
					new Discord.MessageButton()
						.setLabel('Close')
						.setCustomId('close')
						.setStyle('DANGER')
				);

			const interactionHandler = async (interaction: InteractionInfo) => {
				if (interaction.customId === 'close') {
					this.deleteMsg(interaction.parentChannelId, interaction.parentMessageId);
					return true;
				}
				return false;
			};

			this.sendEmbed({ embeds: [notification], components: [row] }, 60_000, interactionHandler);
		}
		catch (error) { this.error(`{error: ${error}} while creating/sending notification message with {message: ${message}}`); }
	}

	/**
	 * sendError()
	 *
	 * Sends an error notification
	 * @param message - message you want to send
	 * @param saveErrorId - create an error id or not
	 * @param channelId - discord channel id for text channel for message to be sent
	 * @return randomized error id
	 */
	sendError(message: string, saveErrorId: boolean | void, channelId: string | void): number {
		if (!channelId) { channelId = this.data.guildSettings.channelId; }

		// Unix Timestamp + random number between 100000000000000-999999999999999
		const errorId = Date.now() + Math.floor(Math.random() * (999999999999999 - 100000000000000) + 100000000000000);
		(async () => {
			try {
				this.debug(`Sending error message with {message: ${message}} to {channelId: ${channelId}}`);

				const error = new Discord.MessageEmbed()
					.setTitle('Error')
					.setColor(PINK)
					.setDescription(message);

				if (saveErrorId) { error.setFooter({ text: `Error id ${errorId}` }); }

				const row = new Discord.MessageActionRow()
					.addComponents(
						// close button
						new Discord.MessageButton()
							.setLabel('Close')
							.setCustomId('close')
							.setStyle('DANGER')
					);

				const interactionHandler = async (interaction: InteractionInfo) => {
					if (interaction.customId === 'close') {
						this.deleteMsg(interaction.parentChannelId, interaction.parentMessageId);
						return true;
					}
					return false;
				};

				this.sendEmbed({ embeds: [error], components: [row] }, -1, interactionHandler);
			}
			catch (error) { this.error(`{error: ${error}} while creating/sending error message with {message: ${message}}.`); }
		})();
		return errorId;
	}

	/**
	 * sendEmbed()
	 *
	 * Sends an already made embed
	 * @param messageOptions - messageOptions for you want to send
	 * @param life - time in miliseconds you want this to be, -1 if infinite
	 * @param interactionHandler - function called to handle when mesage recieves an interaction
	 */
	async sendEmbed(messageOptions: Discord.MessageOptions, life?: number, interactionHandler?: (interaction: InteractionInfo) => Promise<boolean>) {
		if (!life) { life = -1; }
		if (!interactionHandler) { interactionHandler = async () => { return false; }; }
		try {
			// grab text channel
			const channel = await this.bot.channels.fetch(this.data.guildSettings.channelId);
			if (channel instanceof Discord.TextChannel) {
				// send embed if it is a text channel
				const msg = await channel.send(messageOptions);
				this.debug(`Embed with {title: ${messageOptions.embeds[0].title}} sent, {messageId: ${msg.id}}`);

				this._interactionListeners[msg.id] = { interactionHandler };

				// set timeout if given
				if (life !== -1) { this._interactionListeners[msg.id].timeout = setTimeout(() => { this.deleteMsg(channel.id, msg.id); }, life); }
				return msg.id;
			}
			else { this.debug(`Channel with {channelId: ${this.data.guildSettings.channelId}} was not a text channel, embed with {title: ${messageOptions.embeds[0].title}} was not sent`); }
		}
		catch (error) { this.error(`{error: ${error}} while creating/sending embed with {title: ${messageOptions.embeds[0].title}}.`); }
		return null;
	}

	/**
	 * updateMsg()
	 * 
	 * Updates a message
	 * @param channelId - id of channel message is in
	 * @param messageId - id of message to edit
	 * @param messageOptions - data to update message with
	 */
	async updateMsg(channelId: string, messageId: string, messageOptions: Discord.MessageOptions) {
		try {
			const channel = await this.bot.channels.fetch(channelId) as Discord.TextChannel;
			const message = await channel.messages.fetch(messageId);
			await message.edit(messageOptions);
			return true;
		}
		catch (error) {
			this.error(`{error: ${error}} while updating message with {messageId: ${messageId}} in {channelId: ${channelId}}`);
			return false;
		}
	}

	/**
	 * escapeString()
	 * 
	 * Escapes a string to be displayed as is in discord
	 * @param string - string to escape
	 * @returns escaped string
	 */
	escapeString(string: string) {
		let escaped = '';
		const toEscape = ['*', '_', '~', '`', '>', '|'];
		for (let i = 0; i < string.length; i++) {
			if (toEscape.indexOf(string[i]) === -1) { escaped += string[i]; }
			else { escaped += `\\${string[i]}`; }
		}
		return escaped;
	}

	/**
	 * buttonPressed()
	 * 
	 * Handles what happens when a button on a message is pressed
	 * @param interaction - interaction object of button that was pressed
	 */
	async buttonPressed(interaction: InteractionInfo) {
		// grabs the right interaction handler and calls it
		try { return await this._interactionListeners[interaction.parentMessageId].interactionHandler(interaction); }
		catch { return false; }
	}
}