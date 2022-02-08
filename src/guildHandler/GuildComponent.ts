import type { GuildHandler } from './GuildHandler';

/**
 * Guild Component
 *
 * Makes functions for guild compontents easier to use
 */
export class GuildComponent {
	guildHandler: GuildHandler;
	bot: GuildHandler['bot'];
	guild: GuildHandler['guild'];
	data: GuildHandler['data'];
	ui: GuildHandler['ui'];

	logger: GuildHandler['logger'];
	debug: GuildHandler['debug'];
	info: GuildHandler['info'];
	warn: GuildHandler['warn'];
	error: GuildHandler['error'];

	/**
	 * @param guildHandler
	 */
	constructor(guildHandler: GuildHandler) {
		// guildHandler objects
		this.guildHandler = guildHandler;
		this.bot = guildHandler.bot;
		this.guild = guildHandler.guild;
		this.data = guildHandler.data;
		this.ui = guildHandler.ui;

		// logging
		this.logger = guildHandler.logger;
		this.debug = guildHandler.debug;
		this.info = guildHandler.info;
		this.warn = guildHandler.warn;
		this.error = guildHandler.error;
	}
}
