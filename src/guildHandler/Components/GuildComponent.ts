import type GuildHandler from '../GuildHandler';

/**
 * Guild Component
 *
 * Makes functions for guild compontents easier to use
 */
export default class GuildComponent {
	private _guildHandler: GuildHandler;
	private _filename: string;

	/**
	 * @param guildHandler
	 */
	constructor(guildHandler: GuildHandler, filename: string) {
		this._guildHandler = guildHandler;
		this._filename = filename;
	}

	/** 
	 * Logging functions 
	 * 
	 * Logs a message, simple
	 * @param msg - message to log
	 */
	debug(msg: string) {
		this.guildHandler.logger.debug(`{filename: ${this._filename}} ${msg}`);
	}
	info(msg: string) {
		this.guildHandler.logger.info(msg);
	}
	warn(msg: string) {
		this.guildHandler.logger.warn(`{filename: ${this._filename}} ${msg}`);
	}
	error(msg: string) {
		this.guildHandler.logger.error(`{filename: ${this._filename}} ${msg}`);
	}


	// bot components
	get guildHandler() { return this._guildHandler; }
	get logger() { return this.guildHandler.logger; }
	get bot() { return this.guildHandler.bot; }
	get dbClient() { return this.guildHandler.dbClient; }
	get guild() { return this.guildHandler.guild; }
	get data() { return this.guildHandler.data; }
	get ui() { return this.guildHandler.ui; }
	get queue() { return this.guildHandler.queue; }
	get vcPlayer() { return this.guildHandler.vcPlayer; }
	get drive() { return this.guildHandler.drive; }
}
