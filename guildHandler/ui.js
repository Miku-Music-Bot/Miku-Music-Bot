const path = require('path');
const { MessageEmbed } = require('discord.js');

const GuildComponent = require(path.join(__dirname, 'guildComponent.js'));

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
class UI extends GuildComponent {
	/**
	 * UI
	 * @param {GuildHandler} guildHandler - guildHandler of the guild this ui object is to be responsible for
	 */
	constructor(guildHandler) {
		super(guildHandler);
	}

	/**
	 * sendUI()
	 * 
	 * Sends ui to channel
	 */
	sendUI() {
		const channel = this.bot.channels.cache.get(this.data.channelId);
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