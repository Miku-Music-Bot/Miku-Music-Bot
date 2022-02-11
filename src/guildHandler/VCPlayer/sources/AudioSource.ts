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
	song: Song;																		// should be a song object
	events: EventEmitter;															// should have a 'fatalEvent' event that is called when the song is not played fully that returns string with user friendly error log	abstract bufferStream(attempts: number, seek: number): void;					// should start buffering song to local file
	abstract getStream(): Promise<PassThrough>;										// should start buffer if not started and return promise resolving to passthrough stream of pcm data
	abstract setChunkTiming(timing: number): void;									// should be able to change chunkTiming for nightcore (10 0.1sec chunks per second vs 13.33 0.1 chunks per second aka 100ms vs 75ms delay between chunks)
	abstract pause(): void;															// should pause stream by playing silence
	abstract resume(): void;														// should resume stream
	abstract destroy(): void;														// should gracefully stop stream and clean up
}