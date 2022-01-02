const { MessageEmbed } = require('discord.js');

/* eslint-disable */
const GREY = '#373b3e';
const TEAL = '#137a7f';
const PINK = '#e12885';
const YT_RED = '#FF0000';
const SC_ORANGE = '#FE5000';
const GD_BLUE = '#4688F4';
/* eslint-enable */

/**
 * UI
 * 
 * Handles creating and refreshing the main user interface of the bot
 */
class UI {
	/**
	 * UI
	 * @param {guildHandler} guildHandler - guildHandler of the guild this ui object is to be responsible for
	 */
	constructor(guildHandler) {
		this.guildHandler = guildHandler;
	}

	/**
	 * sendUI()
	 * 
	 * Sends ui to channel
	 */
	sendUI() {
		const channel = this.guildHandler.bot.channels.cache.get(this.guildHandler.guildData.channelId);
		channel.send({ embeds: [this.createUI()] });
	}

	/**
	 * createUI()
	 * 
	 * Creates discord messageEmbed for UI
	 * @returns {MessageEmbed}
	 */
	createUI() {
		const userInterface = new MessageEmbed()
			.setDescription('hi');

		return userInterface;
	}
}

module.exports = UI;