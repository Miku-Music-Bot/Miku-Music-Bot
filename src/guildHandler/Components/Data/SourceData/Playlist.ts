import { EventEmitter } from 'events';

import GuildComponent from '../../GuildComponent';
import { SongRef, PlaylistConfig } from './sourceConfig';
import Song from './Song';

export default abstract class Playlist extends GuildComponent {
	abstract get id(): number;
	abstract events: EventEmitter;
	abstract getSong(ref: SongRef): Song;
	abstract export(): PlaylistConfig;
}