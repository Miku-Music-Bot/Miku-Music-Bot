import { Guild } from 'discord.js';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

import { PermissionsConfig, PERMISSIONS_DEFAULT } from './config/permissionConfig';

type EventTypes = {
	newSettings: () => void,
}

/**
 * @name PermissionSettings
 * Contains bot's guild settings
 * Emits 'newSettings' event when settings are changed
 */
export default class PermissionSettings {
	events: TypedEmitter<EventTypes>;
	private _permissionSettings: PermissionsConfig;

	constructor(settings?: PermissionsConfig) {
		this.events = new EventEmitter() as TypedEmitter<EventTypes>;

		// apply settings
		if (!settings) return;
		this._permissionSettings = {};
		const keys = Object.keys(settings);

		for (let i = 0; i < keys.length; i++) {
			this._permissionSettings[keys[i]] = [];
			for (let j = 0; j < settings[keys[i]].length; j++) {
				this._permissionSettings[keys[i]].push(settings[keys[i]][j]);
			}
		}
	}

	/**
	 * @name resetPermissions()
	 * Inititallizes permissions with default everyone and admin permissions
	 */
	resetPermissions(guild: Guild): void {
		this._permissionSettings = {};
		// find @everyone role id
		const everyone = guild.roles.cache.filter((role: { name: string }) => role.name === '@everyone').first();
		// give the default @everyone permissions to each command
		for (let i = 0; i < PERMISSIONS_DEFAULT.everyone.length; i++) {
			this._permissionSettings[PERMISSIONS_DEFAULT.everyone[i]] = [];
			this.addPermission(PERMISSIONS_DEFAULT.everyone[i], everyone.id);
		}

		// create default permissions for admins
		for (let i = 0; i < PERMISSIONS_DEFAULT.admin.length; i++) {
			this._permissionSettings[PERMISSIONS_DEFAULT.admin[i]] = [];
		}
		this.events.emit('newSettings');
	}

	/**
	 * @name addPermission()
	 * Add a roleId to a permission
	 */
	addPermission(command: string, roleId: string): void {
		// remove the permission in case it already existed
		this.removePermission(command, roleId);
		this._permissionSettings[command].push(roleId);
		this.events.emit('newSettings');
	}

	/**
	 * @name removePermission()
	 * Remove a roleId for a permission
	 */
	removePermission(command: string, roleId: string): boolean {
		// find location of the roleId in the permissions list
		const location = this._permissionSettings[command].indexOf(roleId);

		if (location !== -1) {
			// if found, remove it and save to database
			this._permissionSettings[command].splice(location, 1);
			this.events.emit('newSettings');
			return true;
		}
		return false;
	}

	/**
	 * @name getFor()
	 * Get the list of allowed roles for a particular permission
	 */
	getFor(command: string): readonly string[] {
		const permissions = [];
		for (let i = 0; i < this._permissionSettings[command].length; i++) { permissions.push(this._permissionSettings[command][i]); }
		return Object.freeze(permissions);
	}

	/**
	 * @name export()
	 * Exports the settings in the format to be saved in database
	 */
	export(): PermissionsConfig { return this._permissionSettings; }
}