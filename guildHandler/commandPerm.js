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

		this.commandList = {
			'set-channel': [],
			'join': [],
			'play': [],
		};
	}

	/**
	 * init()
	 */
	init() {
		let guild = this.guildHandler.bot.guilds.cache.get(this.guildHandler.guildData.guildId);
		console.log(guild);
		console.log(guild.roles);
		guild.roles.cache.filter(role => role.name === 'everyone')
	}

	/**
	 * check()
	 * 
	 * @param {string} command - command to test
	 * @param {Message} message - discord message object that requested the command
	 * @returns {boolean} - true if user has permission to use the command, false if not
	 */
	check(command, message) {
		// if command doesn't exit, return false
		if (!this.commandList[command]) {
			this.guildHandler.sendError(`<@${message.author.id}> ${message.content} is not valid command!`, message.channel.id);
			return false;
		}

		// if the user is the guild owner, return true no matter what
		if (this.guildHandler.bot.guilds.cache.get(this.guildHandler.guildData.guildId).ownerId === message.author.id) return true;




		// if we get here, they don't have permission
		this.guildHandler.sendError(`<@${message.author.id}> You don't have permission to use the "${command}" command!`, message.channel.id);
	}
}

module.exports = CommandPerm;