function deepFreeze(object: { [key: string]: any }) {
	// Retrieve the property names defined on object
	const propNames = Object.getOwnPropertyNames(object);

	// Freeze properties before freezing self

	for (const name of propNames) {
		const value = object[name];

		if (value && typeof value === 'object') {
			deepFreeze(value);
		}
	}

	return Object.freeze(object);
}

// Permissions Configuration data and defaults
export type PermissionsConfig = {
	[key: string]: Array<string>;
};
export const PERMISSIONS_DEFAULT = deepFreeze({
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
});