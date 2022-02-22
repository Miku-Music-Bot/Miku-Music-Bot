const BOT_DOMAIN = process.env.BOT_DOMAIN;

export type SongConfig = {
	id?: number,
	type?: 'yt' | 'gd',
	title?: string,
	url?: string,
	duration?: number,
	thumbnailURL?: string,
	artist?: string
	live?: boolean,
	reqBy?: string
};

export type SongRef = {
	id: number,
	playlist: Array<number>
}

export const SONG_DEFAULT: SongConfig = {
	id: undefined,
	title: 'No Title',
	type: undefined,
	url: 'OVERRIDE THIS',
	duration: undefined,
	thumbnailURL: `${BOT_DOMAIN}/default-thumbnail.jpg`,
	artist: 'unknown',
	live: true,
	reqBy: undefined
};