import path from 'path';

import GuildComponent from './GuildComponent.js';
import type GuildHandler from '../GuildHandler.js';
import { MessageInfo } from '../GHChildInterface.js';

/**
 * PermissionChecker
 *
 * Checks if user has permission to use a certain command
 */
export default class PermissionChecker extends GuildComponent {
	/**
	 * @param guildHandler - guild handler for guild this permissions object is responsible for
	 */
	constructor(guildHandler: GuildHandler) { 
		super(guildHandler, path.basename(__filename));
		this.data.permissionSettings.initPermissions(this.guild);
	}

	/**
	 * checkMessage()
	 *
	 * @param command - command to test
	 * @param message - message object that requested the command
	 * @return true if user has permission to use the command, false if not
	 */
	async checkMessage(command: string, message: MessageInfo): Promise<boolean> {
		try {
			this.debug(`Checking permissions for {authorId: ${message.authorId}} and {command:${command}}`);
			const allowedRoles = this.data.permissionSettings.getFor(command);
			
			// if command doesn't exist, return false
			if (!allowedRoles) {
				this.debug(`Command from {messageId: ${message.id}} does not exist.`);
				this.ui.sendError(`<@${message.authorId}> "${this.ui.escapeString(message.content)}" is not valid command!`, false, message.channelId);
				return false;
			}
			this.debug(`{allowedRoles:${allowedRoles}} found for {command:${command}}`);

			// if the user is the guild owner, return true no matter what
			if (this.guild.ownerId === message.authorId) {
				this.debug(`Command from {messageId: ${message.id}} came from guild owner, permission allowed`);
				return true;
			}

			// fetch guild member with role information
			const member = await this.guild.members.fetch({ user: message.authorId });
			let found = false;
			for (let i = 0; i < allowedRoles.length; i++) {
				if (member.roles.cache.get(allowedRoles[i]).id === allowedRoles[i]) { found = true; }
			}
			if (found) {
				this.debug(`User with {userId: ${message.authorId}} has permissions to use command from {messageId: ${message.id}}`);
				return true;
			}

			// if we get here, they don't have permission
			this.debug(`Permission rejected to command with {messageId: ${message.id}}, sending error message`);
			this.ui.sendError(`<@${message.authorId}> You don't have permission to use the "${command}" command!`, false, message.channelId);
			return false;
		} catch (error) {
			const errorId = this.ui.sendError(`<@${message.authorId}> Sorry! There was an error while checking permissions for your command.`, true);
			this.error(`{error: ${error.message}} while checking permissions for {messageId: ${message.id}}. {stack:${error.stack}} {errorId: ${errorId}}`);
			return false;
		}
	}
}
