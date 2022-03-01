import * as Discord from 'discord.js';

import GuildComponent from './GuildComponent';
import type GuildHandler from '../GuildHandler';
import { InteractionObject } from '../GHChildInterface';

/* eslint-disable */
const BOT_DOMAIN = process.env.BOT_DOMAIN;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;

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
	private _uiMessageId: string;
	private _interactionListeners: {
		[key: string]: {
			timeout?: NodeJS.Timeout,
			interactionHandler: (interaction: InteractionObject) => void
		}
	};

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
		// Handles interactions
		const interactionHandler = async (interaction: InteractionObject) => {
			switch (interaction.customId) {
				case ('play/pause'): {
					// if not connected to vc, connect
					if (!this.vcPlayer.connected) {
						const joined = await this.vcPlayer.join(interaction.authorId);
						// should start playing from autoplay
						if (joined) { this.queue.nextSong(true); }
						break;
					}

					// toggle pause/play
					if (this.vcPlayer.playing) { this.vcPlayer.resume(); }
					else { this.vcPlayer.pause(); }
					break;
				}
				case ('stop'): {
					this.vcPlayer.leave();
					break;
				}
				case ('skip'): {
					this.queue.nextSong();
					break;
				}
			}
			this.updateUI();
		};

		// Create and send message
		this._uiMessageId = await this.sendEmbed(this._createUI(), -1, interactionHandler);
	}

	/**
	 * updateUI()
	 * 
	 * Updates the UI of the bot
	 */
	updateUI() { this.updateMsg(this.data.guildSettings.channelId, this._uiMessageId, this._createUI()); }

	/**
	 * createUI()
	 *
	 * Creates discord messageEmbed for UI
	 * @return Discord message embed
	 */
	private _createUI(): Discord.MessageOptions {
		const userInterface = new Discord.MessageEmbed()
			.setDescription('hi');

		const audioControls = new Discord.MessageActionRow()
			.addComponents(
				// Play pause button
				new Discord.MessageButton()
					.setLabel('Play/Pause')
					.setCustomId('play/pause')
					.setStyle('PRIMARY')
			)
			.addComponents(
				// Stop button
				new Discord.MessageButton()
					.setLabel('Stop')
					.setCustomId('stop')
					.setStyle('DANGER')
					.setDisabled(!this.vcPlayer.connected)
			)
			.addComponents(
				// Skip button
				new Discord.MessageButton()
					.setLabel('Skip')
					.setCustomId('skip')
					.setStyle('SUCCESS')
					.setDisabled(!this.vcPlayer.playing)
			)
			.addComponents(
				// Repeat button
				new Discord.MessageButton()
					.setLabel('Repeat')
					.setCustomId('repeat')
					.setStyle('SECONDARY')
					.setDisabled(!this.vcPlayer.playing)
			);

		return { embeds: [userInterface], components: [audioControls] };
	}

	private async _deleteMsg(channelId: string, messageId: string) {
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
						.setLabel('❌')
						.setCustomId('close')
						.setStyle('PRIMARY')
				);

			const interactionHandler = (interaction: InteractionObject) => {
				if (interaction.customId === 'close') {
					this._deleteMsg(interaction.parentChannelId, interaction.parentMessageId);
				}
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
		const errorId = (Date.now() * 1000) + Math.floor(Math.random() * (999999999999999 - 100000000000000) + 100000000000000);
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
							.setLabel('❌')
							.setCustomId('close')
							.setStyle('PRIMARY')
					);

				const interactionHandler = (interaction: InteractionObject) => {
					if (interaction.customId === 'close') {
						this._deleteMsg(interaction.parentChannelId, interaction.parentMessageId);
					}
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
	async sendEmbed(messageOptions: Discord.MessageOptions, life?: number, interactionHandler?: (interaction: InteractionObject) => void) {
		if (!life) { life = -1; }
		if (!interactionHandler) { interactionHandler = () => { return; }; }
		try {
			// grab text channel
			const channel = await this.bot.channels.fetch(this.data.guildSettings.channelId);
			if (channel instanceof Discord.TextChannel) {
				// send embed if it is a text channel
				const msg = await channel.send(messageOptions);
				this.debug(`Embed with {title: ${messageOptions.embeds[0].title}} sent, {messageId: ${msg.id}}`);

				this._interactionListeners[msg.id] = { interactionHandler };

				// set timeout if given
				if (life !== -1) { this._interactionListeners[msg.id].timeout = setTimeout(() => { this._deleteMsg(channel.id, msg.id); }, life); }
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
			message.edit(messageOptions);
		}
		catch (error) { this.error(`{error: ${error}} while updating message with {messageId: ${messageId}} in {channelId: ${channelId}}`); }
	}

	/**
	 * buttonPressed()
	 * 
	 * Handles what happens when a button on a message is pressed
	 * @param interaction - interaction object of button that was pressed
	 */
	buttonPressed(interaction: InteractionObject) {
		// grabs the right interaction handler and calls it
		try { this._interactionListeners[interaction.parentMessageId].interactionHandler(interaction); }
		catch { /* */ }
	}
}