// Permissions Configuration data and defaults
export type PermissionsConfig = {
	[key: string]: Array<string>;
};
export const PERMISSIONS_DEFAULT = {
	everyone: [
		'join', 
		'play', 
		'pause', 
		'resume', 
		'stop', 'leave',
		'skip', 'next',
		'repeat', 'repeat-song', 'rs',
		'repeat-queue', 'rq', 
		'shuffle', 'toggle-shuffle',
		'show-queue', 'sq',
		'clear-queue', 'cq',
		'remove',
		'advance',
		'clear-channel', 'cc',
		'autoplay', 'toggle-autoplay'
	],
	admin: ['set-channel']
};