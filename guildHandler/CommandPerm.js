/**
 * CommandPerm
 * 
 * Checks if user has permission to use a certain command
 */
class CommandPerm {
	/**
	 * @param {GuildHandler} guildHandler 
	 */
	constructor(guildHandler) {
		this.guildHandler = guildHandler;
		this.commandList = [
			{
				command: 'set-channel',
				roles: []
			}
		];
	}

	/**
	 * check()
	 * 
	 * @param {string} command - command to test
	 * @param {Message} message - discord message object that requested the command
	 */
	check(command, message) {
		if (this.guildHandler.bot.guilds.cache.get(this.guildHandler.guildData.guildId).ownerId === message.author.id) return true;

		this.guildHandler.sendError(`<@${message.author.id}> You don\t have permission to use the "${command}" command!`, message.channel.id);
	}
}

module.exports = CommandPerm;