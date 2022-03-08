import type GuildHandler from '../GuildHandler';

/**
 * Guild Component
 *
 * Makes functions for guild compontents easier to use
 */
export default class GuildComponent {
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

	get drive() { return this.guildHandler.drive; }
	get bot() { return this.guildHandler.bot; }
	get guild() { return this.guildHandler.guild; }
	get data() { return this.guildHandler.data; }
	get ui() { return this.guildHandler.ui; }
	get queue() { return this.guildHandler.queue; }
	get vcPlayer() { return this.guildHandler.vcPlayer; }
}
