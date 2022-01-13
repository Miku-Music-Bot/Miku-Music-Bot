const path = require('path');
const GuildComponent = require(path.join(__dirname, 'guildComponent.js'));

/**
 * CommandPerm
 * 
 * Checks if user has permission to use a certain command
 */
class CommandPerm extends GuildComponent {
	/**
	 * @param {GuildHandler} guildHandler 
	 */
	constructor(guildHandler) {
		super(guildHandler);
		this.permissions = {
			'set-channel': [],
			'join': [],
			'play': [],
			'pause': []
		};
	}

	/**
	 * init()
	 * 
	 * Gets all the discord roles from guild data and retrieves them to be used
	 */
	init() {
		// this needs to be better <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
		if (Object.keys(this.data.permissions).length === 0) {
			this.info('Guild permissions have not been set, setting defaults.');
			let everyone = this.guild.roles.cache.filter(role => role.name === '@everyone').first();
			this.debug(`Found @everyone role with {id: ${everyone.id}}`);

			let defaults = ['join', 'play', 'pause'];
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
		this.removePermission(command, roleId);
		this.permissions[command].push(roleId);
		this.savePermissions();
		this.info(`Added permission for {roleId: ${roleId}} for {command: ${command}}`);
	}

	/**
	 * removePermission()
	 * 
	 * @param {string} command - command to change permissions for
	 * @param {string} roleId - discord role id for permissions you would like to add
	 */
	removePermission(command, roleId) {
		if (!this.permissions[command]) { this.permissions[command] = []; }
		let location = this.permissions[command].indexOf(roleId);
		if (location !== -1) {
			this.permissions[command].splice(location, 1);
			this.savePermissions();
			this.info(`Removed permission for {roleId: ${roleId}} for {command: ${command}}`);
		}
	}

	/**
	 * savePermission()
	 * 
	 * Saves the permissions to guild data
	 */
	savePermissions() {
		this.data.setPermissions(this.permissions);
	}

	/**
	 * check()
	 * 
	 * @param {string} command - command to test
	 * @param {Message} message - discord message object that requested the command
	 * @returns {boolean} - true if user has permission to use the command, false if not
	 */
	async check(command, message) {
		try {
			this.debug(`Checking permissions for {messageId: ${message.id}}`);

			// if command doesn't exist, return false
			if (!this.permissions[command]) {
				this.debug(`Command from {messageId: ${message.id}} does not exist`);
				this.sendError(`<@${message.author.id}> ${message.content} is not valid command!`, message.channel.id);
				return false;
			}

			// if the user is the guild owner, return true no matter what
			if (this.guild.ownerId === message.author.id) {
				this.debug(`Command from {messageId: ${message.id}} came from guild owner, permission allowed`);
				return true;
			}

			// fetch guild member with role information
			const member = await this.guild.members.fetch({ user: message.author.id, force: true });
			let found = false;
			for (let i = 0; i < this.permissions[command].length; i++) {
				if (member.roles.cache.get(this.permissions[command][i])) {
					found = true;
				}
			}
			if (found) {
				this.debug(`User with {userId: ${message.author.id}} has permissions to use command from {messageId: ${message.id}}`);
				return true;
			}

			this.debug(`Permission rejected to command with {messageId: ${message.id}}`);
			// if we get here, they don't have permission
			this.sendError(`<@${message.author.id}> You don't have permission to use the "${command}" command!`, message.channel.id);
		}
		catch (error) {
			const errorId = Math.floor(Math.random() * (999999999999999 - 100000000000000) + 100000000000000);
			this.sendError(`<@${message.author.id}> Sorry! There was an error while joining voice channel.\nError id: ${errorId}`);
			this.error(`{error: ${error}} while checking permissions for {messageId: ${message.id}}. {errorId: ${errorId}}`);
			return false;
		}
	}
}

module.exports = CommandPerm;