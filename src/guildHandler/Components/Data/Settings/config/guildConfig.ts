import { SourceRef } from '../../SourceData/sourceConfig';

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

// Guild Data Configuration data and defaults
export type GuildConfig = {
	configured: boolean,
	channelId: string,
	prefix: string,
	autoplay: boolean,
	shuffle: boolean,
	autoplayList: Array<SourceRef>,
	songIdCount: number,
	playlistIdCount: number
}
export const GUILD_DEFAULT: GuildConfig = deepFreeze({
	configured: false,
	channelId: undefined,
	prefix: '!miku ',
	autoplay: false,
	shuffle: true,
	autoplayList: [],
	songIdCount: 0,
	playlistIdCount: 0
}) as GuildConfig;