import { SourceRef } from '../../SourceData/sourceConfig';

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
export const GUILD_DEFAULT: GuildConfig = {
	configured: false,
	channelId: undefined,
	prefix: '!miku ',
	autoplay: false,
	shuffle: true,
	autoplayList: [],
	songIdCount: 0,
	playlistIdCount: 0
};