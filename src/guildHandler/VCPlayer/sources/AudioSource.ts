import { PassThrough } from 'stream';
import { EventEmitter } from 'events';
import { GuildComponent } from '../../GuildComponent';
import type { Song } from '../Song';

/**
 * AudioSource
 * 
 * Template for how audio source classes should behave
 */
export abstract class AudioSource extends GuildComponent {
	song: Song;										// should be a song object
	events: EventEmitter;							// should have a 'fatalEvent' event that is called when the song is not played fully that returns string with user friendly error log
	playDuration: number;							// should be able to get how many seconds have been played
	abstract bufferStream(): void;					// should start buffering song to local file
	abstract getStream(): Promise<PassThrough>;		// should start buffer if not started and return promise resolving to passthrough stream of pcm data
	abstract pause(): void;							// should pause stream by playing silence
	abstract resume(): void;						// should resume stream
	abstract destroy(): void;						// should gracefully stop stream and clean up
}