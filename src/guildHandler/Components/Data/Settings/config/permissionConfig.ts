// Permissions Configuration data and defaults
export type PermissionsConfig = {
	[key: string]: Array<string>;
};
export const PERMISSIONS_DEFAULT = {
	everyone: ['join', 'play', 'pause', 'resume', 'stop'],
	admin: ['set-channel']
};