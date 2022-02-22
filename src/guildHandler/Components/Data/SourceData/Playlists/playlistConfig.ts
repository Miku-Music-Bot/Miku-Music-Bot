import { SongConfig } from '../Songs/songConfig';

export type PlaylistConfig = {
	type?: 'yt' | 'gd' | 'ud' | 'global',
	id?: number,
	songs?: Array<SongConfig>
	playlists?: Array<PlaylistConfig>
};

export const PLAYLIST_DEFAULT: PlaylistConfig = {
	type: undefined,
	id: undefined,
	songs: [],
	playlists: []
};