import type { drive_v3 } from '@googleapis/drive';

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
	drive: drive_v3.Drive;

	/**
	 * @param guildHandler
	 */
	constructor(guildHandler: GuildHandler, filename: string) {
		this.guildHandler = guildHandler;
		
		// logging
		this.debug = (msg) => { guildHandler.logger.debug(`{filename: ${filename}} ${msg}`); };
		this.info = (msg) => { guildHandler.logger.info(`{filename: ${filename}} ${msg}`); };
		this.warn = (msg) => { guildHandler.logger.warn(`{filename: ${filename}} ${msg}`); };
		this.error = (msg) => { guildHandler.logger.error(`{filename: ${filename}} ${msg}`); };

		this.drive = guildHandler.drive;
	}

	get bot() { return this.guildHandler.bot; }
	get guild() { return this.guildHandler.guild; }
	get data() { return this.guildHandler.data; }
	get ui() { return this.guildHandler.ui; }
	get queue() { return this.guildHandler.queue; }
	get vcPlayer() { return this.guildHandler.vcPlayer; }
}
