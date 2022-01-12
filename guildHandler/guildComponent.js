/**
 * Guild Component
 * 
 * Makes functions for guild compontents easier to use
 */
class GuildComponent {
	/**
	 * @param {GuildHandler} guildHandler
	 */
	constructor(guildHandler) {
		// guildHandler objects
		this.bot = guildHandler.bot;
		this.guild = guildHandler.guild;
		this.data = guildHandler.data;

		// guildHandler functions
		this.sendNotification = guildHandler.sendNotification;
		this.sendError = guildHandler.sendError;
		// logging
		this.logger = guildHandler.logger;
		this.debug = guildHandler.debug;
		this.info = guildHandler.info;
		this.warn = guildHandler.warn;
		this.error = guildHandler.error;
		this.fatal = guildHandler.fatal;
	}
}

module.exports = GuildComponent;