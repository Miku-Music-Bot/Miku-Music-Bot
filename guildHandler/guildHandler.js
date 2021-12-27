const path = require('path');
const { Client, Intents, MessageEmbed } = require('discord.js');

const GuildData = require(path.join(__dirname, 'guildData', 'guildData.js'));

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;		// discord bot token
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;		// support email
/**
 * GuildHander
 * 
 * Handles all bot functions for a specific guild
 */
class GuildHander {
	/**
	 * Creates GuildData object, once data is ready, connects to discord
	 * @param {string} id - discord guild id for GuildHander to be responsible for
	 * @param {Db} db - mongodb database for bot data
	 */
	constructor(id, db) {
		console.log(`Creating guild handler for guild id: ${id}`);

		this.guildData = new GuildData(id, db);
		this.guildData.once('ready', () => {
			this.startBot();
		});
	}

	/**
	 * startBot()
	 * 
	 * Sets up discord client and events
	 */
	startBot() {
		this.bot = new Client({				// set intent flags for bot
			intents: [
				Intents.FLAGS.GUILDS,					// for accessing guild roles
				Intents.FLAGS.GUILD_MESSAGES,			// for creating and deleting messages
				Intents.FLAGS.GUILD_MESSAGE_REACTIONS,	// for adding and removing message reactions
				Intents.FLAGS.GUILD_VOICE_STATES,		// for checking who is in vc and connecting to vc
			]
		});

		this.bot.on('message', (message) => {
			this.messageHandler(message);
		});

		this.bot.once('ready', () => {
			this.guild = this.bot.guilds.cache.get(this.guildData.guildID);

			console.log(`Guild handler for guild id: ${this.guildData.guildID} is ready!`);

			if (!this.guildData.configured) {
				this.setup();
			}
		});

		this.bot.login(DISCORD_TOKEN);
	}

	/**
	 * setup()
	 * 
	 * Handles the user setup for a brand new server
	 */
	setup() {
		const defaultChannel = this.bot.channels.cache.filter(channel => channel.type === 'GUILD_TEXT').first();

		const setupMessage = new MessageEmbed()
			.setColor('#86cecb')
			.setTitle('Set up Miku')
			.setDescription(`
				Miku needs an empty and dedicated text channel to use.\n
				Create or choose one and type: "${this.guildData.prefix}set-channel" in that channel`
			)
			.setFooter(`For help, email: ${SUPPORT_EMAIL}`);
		defaultChannel.send({ embeds: [setupMessage] });
	}

	/**
	 * messageHandler()
	 * 
	 * Handles all messages the bot recieves
	 */
	messageHandler() {

	}

	/**
	 * getID()
	 * 
	 * @returns {string} - discord guild id for GuildHandler
	 */
	getID() {
		return this.guildData.guildID;
	}
}

module.exports = GuildHander;