import { GuildHandler } from './guildHandler';

/**
 * BotMaster
 *
 * Handles adding, getting, and removing guild handlers
 */
export class BotMaster {
	guildList: { [key: string]: GuildHandler };		// stores all guilds

	constructor() {
		this.guildList = {};
	}

	/**
	 * getGuild()
	 *
	 * Returns GuildHandler for guild with matching id
	 * @param {string} id - discord guild id string
	 * @return {GuildHandler | undefined} - returns guildHandler or undefined if not found
	 */
	getGuild(id: string): GuildHandler | undefined {
		return this.guildList[id];
	}

	/**
	 * newGuild()
	 *
	 * checks if guild already has a handler
	 * if not, creates a handler
	 * @param {string} id - discord guild id string
	 */
	newGuild(id: string) {
		if (!this.getGuild(id)) {
			const newGuild = new GuildHandler(id);
			this.guildList[id] = newGuild;
		}
	}

	/**
	 * removeGuild()
	 *
	 * Removes guild handler with matching id
	 * @param {string} id - discord guild id string
	 */
	removeGuild(id: string): void {
		this.guildList[id].removeGuild();
		this.guildList[id] = undefined;
	}
}