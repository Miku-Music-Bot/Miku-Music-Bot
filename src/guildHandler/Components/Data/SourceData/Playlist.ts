import EventEmitter from 'events';

import GuildComponent from '../../GuildComponent';
import { PlaylistConfig } from './sourceConfig';
import Song from './Song';

export default abstract class Playlist extends GuildComponent {
	abstract events: EventEmitter;										// should emit 'newSettings' event when new data should be saved
	abstract get type(): 'yt' | 'gd'									// shoudl have type
	abstract get id(): number;											// should have unique id
	abstract get title(): string;										// should be able to get title
	abstract get url(): string;											// should be able to get url
	abstract fetchData(): Promise<void>;								// should update data for playlist
	abstract getSong(id: number): Song;									// should return song with id given if it exists in playlist
	abstract getAllSongs(): Array<Song>;								// should return all songs in the playlist
	abstract search(searchString: string): Array<Song>;					// should be able to search for songs
	abstract export(): PlaylistConfig;									// should return data that should be saved in database
}