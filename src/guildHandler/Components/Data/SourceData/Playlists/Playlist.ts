import { EventEmitter } from 'events';
import GuildComponent from '../../../GuildComponent';
import { SongRef } from '../Songs/songConfig';
import Song from '../Songs/Song';
import { PlaylistConfig } from './playlistConfig';

export default abstract class Playlist extends GuildComponent {
	abstract get id(): number;
	abstract events: EventEmitter;
	abstract getSong(ref: SongRef): Song;
	abstract export(): PlaylistConfig;
}