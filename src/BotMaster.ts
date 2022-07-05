import winston from 'winston';

import GHInterface from './GuildHandlerInterface';
import getEnv from './config';
/**
 * @name BotMaster
 * Handles adding, getting, and removing guild handlers
 */
export default class BotMaster {
	private _log: winston.Logger;
	private config: ReturnType<typeof getEnv>;
	private _guildList: { [key: string]: GHInterface };

	/**
	 * @param logger - logger object
	 * @param config - environment config object
	 */
	constructor(logger: winston.Logger, config: ReturnType<typeof getEnv>) {
		this._log = logger;
		this.config = config;
		this._guildList = {};
	}

	/**
	 * @name getGuild()
	 * Returns GuildHandler Interface for guild with matching id
	 * @param id - discord guild id
	 * @return GHInterface or undefined if not found
	 */
	getGuild(id: string): GHInterface | undefined { return this._guildList[id]; }

	/**
	 * @name newGuild()
	 * Checks if guild already has a handler
	 * if not, creates a handler
	 * @param id - discord guild id string
	 */
	newGuild(id: string): void {
		if (!this.getGuild(id)) {
			const newGuild = new GHInterface(id, this._log, this.config);
			this._guildList[id] = newGuild;
		}
	}

	/**
	 * @name removeGuild()
	 * Removes guild handler with matching id
	 * @param id - discord guild id string
	 */
	removeGuild(id: string): void {
		this._guildList[id].removeGuild();
		this._guildList[id] = undefined;
	}
}