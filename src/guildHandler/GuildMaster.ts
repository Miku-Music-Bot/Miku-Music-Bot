import GuildHandler from './GuildHandler';

/**
 * BotMaster
 *
 * Handles adding, getting, and removing guild handlers
 */
export default class BotMaster {
	private _guildList: { [key: string]: GuildHandler };		// stores all guilds

	constructor() {
		this._guildList = {};
	}

	/**
	 * getguild
	 *
	 * Returns GuildHandler for guild with matching id
	 * @param id - discord guild id string
	 * @return guildHandler or undefined if not found
	 */
	getGuild(id: string): GuildHandler | undefined {
		return this._guildList[id];
	}

	/**
	 * newguild
	 *
	 * checks if guild already has a handler
	 * if not, creates a handler
	 * @param id - discord guild id string
	 */
	newGuild(id: string) {
		if (!this.getGuild(id)) {
			const newGuild = new GuildHandler(id);
			this._guildList[id] = newGuild;
		}
	}

	/**
	 * removeguild
	 *
	 * Removes guild handler with matching id
	 * @param id - discord guild id string
	 */
	removeGuild(id: string): void {
		this._guildList[id].removeGuild();
		this._guildList[id] = undefined;
	}
}