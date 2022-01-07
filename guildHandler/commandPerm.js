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
		this.log = this.guildHandler.log;
		this.permissions = {
			'set-channel': [],
			'join': [],
			'play': [],
			'pause': [],
		};
	}

	/**
	 * init()
	 * 
	 * Gets all the discord roles from guild data and retrieves them to be used
	 */
	init() {
		if (this.guildHandler.guildData.permissions.length === 0) {
			this.log('Guild permissions have not been set, setting defaults...');
			let guild = this.guildHandler.bot.guilds.cache.get(this.guildHandler.guildData.guildId);
			let everyone = guild.roles.cache.filter(role => role.name === '@everyone')
			this.log(`Found @everyone role with id: ${everyone.id}`);

			let defaults = [ 'join', 'play', 'pause' ]
			for (let i = 0; i < defaults.length; i++) {
				this.addPermission(defaults[i], everyone.id);
			}
		}
	}

	/**
	 * addPermission()
	 * 
	 * @param {string} command - command to change permissions for
	 * @param {string} roleId - discord role id for permissions you would like to add 
	 */
	addPermission(command, roleId) {
		removePermission(command, roleId);
		this.permissions[command].push(roleId);
		this.savePermissions();
		this.log(`Added permission for roleId: ${roleId} for command: ${command}`);
	}

	/**
	 * removePermission()
	 * 
	 * @param {string} command - command to change permissions for
	 * @param {string} roleId - discord role id for permissions you would like to add
	 */
	removePermission(command, roleId) {
		let location = this.permissions[command].indexOf(roleId);
		if (location !== -1) {
			this.permissions[command].splice(i, 1);
			this.savePermissions();
			this.log(`Removed permission for roleId: ${roleId} for command: ${command}`);
		}
	}

	/**
	 * savePermission()
	 * 
	 * Saves the permissions to guild data
	 */
	savePermissions() {
		this.guildHandler.guildData.setPermissions(this.permissions);
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
		if (!this.permissions[command]) {
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