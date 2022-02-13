import type * as Discord from 'discord.js';

import GuildComponent from './GuildComponent.js';
import type GuildHandler from './GuildHandler.js';

/**
 * CommandPermissions
 *
 * Checks if user has permission to use a certain command
 */
export default class CommandPermissions extends GuildComponent {
	private _permissions: { [key: string]: Array<string> };

	/**
	 * @param guildHandler - guild handler for guild this permissions object is responsible for
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
		this._permissions = {};

		// if the database didn't have permissions saved, set to defaults
		const defaultEveryone = ['join', 'play', 'pause', 'resume', 'stop'];
		const defaultAdmin = ['set-channel'];
		if (Object.keys(this.data.permissions).length < defaultEveryone.length + defaultAdmin.length) {
			this.info('Guild permissions have not been set, setting defaults.');

			// find @everyone role id
			const everyone = this.guild.roles.cache.filter((role: { name: string }) => role.name === '@everyone').first();
			this.debug(`Found @everyone role with {id: ${everyone.id}}`);

			// give the default @everyone permissions to each command
			for (let i = 0; i < defaultEveryone.length; i++) {
				this._permissions[defaultEveryone[i]] = [];
				this.addPermission(defaultEveryone[i], everyone.id);
			}

			// create default permissions for admins
			for (let i = 0; i < defaultAdmin.length; i++) { this._permissions[defaultAdmin[i]] = []; }
		}
		this._permissions = JSON.parse(JSON.stringify(this.data.permissions));
	}

	/**
	 * addPermission()
	 *
	 * @param command - command to change permissions for
	 * @param roleId - discord role id for permissions you would like to add
	 */
	addPermission(command: string, roleId: string) {
		// remove the permission in case it already existed
		this.removePermission(command, roleId);
		this._permissions[command].push(roleId);

		// save to database
		this.data.setPermissions(this._permissions);
		this.info(`Added permission for {roleId: ${roleId}} for {command: ${command}}`);
	}

	/**
	 * removePermission()
	 *
	 * @param command - command to change permissions for
	 * @param roleId - discord role id for permissions you would like to add
	 */
	removePermission(command: string, roleId: string) {
		// find location of the roleId in the permissions list
		const location = this._permissions[command].indexOf(roleId);

		if (location !== -1) {
			// if found, remove it and save to database
			this._permissions[command].splice(location, 1);
			this.data.setPermissions(this._permissions);
			this.info(`Removed permission for {roleId: ${roleId}} for {command: ${command}}`);
		}
	}

	/**
	 * checkMessage()
	 *
	 * @param command - command to test
	 * @param message - discord message object that requested the command
	 * @return true if user has permission to use the command, false if not
	 */
	async checkMessage(command: string, message: Discord.Message): Promise<boolean> {
		try {
			this.debug(`Checking permissions for {messageId: ${message.id}}`);

			// if command doesn't exist, return false
			if (!this._permissions[command]) {
				this.debug(`Command from {messageId: ${message.id}} does not exist.`);
				this.ui.sendError(`<@${message.author.id}> "${message.content}" is not valid command!`, false, message.channel.id);
				return false;
			}

			// if the user is the guild owner, return true no matter what
			if (this.guild.ownerId === message.author.id) {
				this.debug(`Command from {messageId: ${message.id}} came from guild owner, permission allowed`);
				return true;
			}

			// fetch guild member with role information
			const member = await this.guild.members.fetch({ user: message.author.id });
			let found = false;
			for (let i = 0; i < this._permissions[command].length; i++) {
				if (member.roles.cache.get(this._permissions[command][i]).id === this._permissions[command][i]) { found = true; }
			}
			if (found) {
				this.debug(`User with {userId: ${message.author.id}} has permissions to use command from {messageId: ${message.id}}`);
				return true;
			}

			// if we get here, they don't have permission
			this.debug(`Permission rejected to command with {messageId: ${message.id}}`);
			this.ui.sendError(`<@${message.author.id}> You don't have permission to use the "${command}" command!`, false, message.channel.id);
			return false;
		} catch (error) {
			const errorId = this.ui.sendError(`<@${message.author.id}> Sorry! There was an error while joining voice channel.`, true);
			this.error(`{error: ${error}} while checking permissions for {messageId: ${message.id}}. {errorId: ${errorId}}`);
			return false;
		}
	}
}
