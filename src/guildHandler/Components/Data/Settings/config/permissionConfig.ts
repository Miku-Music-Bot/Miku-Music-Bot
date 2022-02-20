// type for permissions config
export type PermissionsConfig = {
	[key: string]: Array<string>;
};

// default permissions
export const PERMISSIONS_DEFAULT = {
	everyone: ['join', 'play', 'pause', 'resume', 'stop'],
	admin: ['set-channel']
};