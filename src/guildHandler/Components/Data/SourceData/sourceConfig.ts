const BOT_DOMAIN = process.env.BOT_DOMAIN;

// Song Configuration data and defaults
export type SongConfig = {
	id?: number,
	type?: 'yt' | 'gd',
	title?: string,
	url: string,
	duration?: number,
	thumbnailURL?: string,
	artist?: string
	live?: boolean,
	reqBy?: string
	optional?: {
		ext?: string
	}
};
export const SONG_DEFAULT: SongConfig = {
	id: undefined,
	title: 'No Title',
	type: undefined,
	url: undefined,
	duration: undefined,
	thumbnailURL: `${BOT_DOMAIN}/thumbnails/defaultThumbnail.jpg`,
	artist: 'unknown',
	live: true,
	reqBy: '',
	optional: {}
};

// Individual Source Configuration data and defaults
export type PlaylistConfig = {
	id?: number,
	type?: 'yt' | 'gd',
	title?: string,
	url: string,
	songs?: Array<SongConfig>
}
export const PLAYLIST_DEFAULT: PlaylistConfig = {
	id: undefined,
	title: 'No Name',
	url: undefined,
	songs: []
};

// All Source Data Configuration data and defaults
export type SourceDataConfig = {
	gdPlaylists: Array<PlaylistConfig>,
	ytPlaylists: Array<PlaylistConfig>
}
export const SOURCE_DATA_DEFAULT: SourceDataConfig = {
	gdPlaylists: [
		{
			type: 'gd',
			id: undefined,
			title: 'Individual Songs - Google Drive',
			url: undefined,
			songs: []
		}
	],
	ytPlaylists: [
		{
			type: 'yt',
			id: undefined,
			title: 'Individual Songs - Youtube',
			url: undefined,
			songs: []
		}
	]
};

// Source reference
export type SourceRef = {
	type: 'yt' | 'gd',
	id: number | undefined,
	playlist: number | undefined
}