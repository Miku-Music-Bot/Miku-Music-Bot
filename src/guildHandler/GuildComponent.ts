import type { GuildHandler } from './GuildHandler';

/**
 * Guild Component
 *
 * Makes functions for guild compontents easier to use
 */
export class GuildComponent {
	guildHandler: GuildHandler;

	logger: GuildHandler['logger'];
	debug: GuildHandler['debug'];
	info: GuildHandler['info'];
	warn: GuildHandler['warn'];
	error: GuildHandler['error'];

	/**
	 * @param guildHandler
	 */
	constructor(guildHandler: GuildHandler) {
		this.guildHandler = guildHandler;
		// logging
		this.logger = guildHandler.logger;
		this.debug = guildHandler.debug;
		this.info = guildHandler.info;
		this.warn = guildHandler.warn;
		this.error = guildHandler.error;
	}

	bot() { return this.guildHandler['bot']; }
	guild() { return this.guildHandler['guild']; }
	data() { return this.guildHandler['data']; }
	ui() { return this.guildHandler['ui']; }
	queue() { return this.guildHandler['queue']; }
}
