import { SongRef } from '../../SourceData/sourceConfig';

// type for guild data
export type GuildConfig = {
	configured?: boolean,
	channelId?: string,
	prefix?: string,
	autoplay?: boolean,
	autoplayList?: Array<SongRef>,
	songIdCount?: number,
	playlistIdCount?: number
}

// defualt settings for guilds
export const GUILD_DEFAULT: GuildConfig = {
	configured: false,
	channelId: undefined,
	prefix: '!miku ',
	autoplay: false,
	autoplayList: [],
	songIdCount: 0,
	playlistIdCount: 0
};