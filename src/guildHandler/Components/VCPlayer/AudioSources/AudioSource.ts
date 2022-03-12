import { PassThrough } from 'stream';
import EventEmitter from 'events';

import type Song from '../../Data/SourceData/Song';

/**
 * AudioSource
 * 
 * Template for how audio source classes should behave
 */
export default abstract class AudioSource {
	song: Song;																		// should be a song object
	events: EventEmitter;															// should have a 'error' event that is emitted when the song is not played fully that returns string with user friendly error log
	buffering: boolean;																// should have property that indicates that song is buffering
	destroyed: boolean;																// should be able to check if source has already been destroyed
	abstract bufferStream(attempts: number, seek: number): void;					// should start buffering song to local file or ready live stream
	abstract getStream(): Promise<PassThrough>;										// should start buffer if not started and return promise resolving to passthrough stream of opus data
	abstract setChunkTiming(timing: number): void;									// should be able to change chunkTiming for nightcore (10 0.1sec chunks per second vs 13.33 0.1 chunks per second aka 100ms vs 75ms delay between chunks)
	abstract getPlayedDuration(): number;											// should return the numbers of seconds of song that has been played
	abstract pause(): void;															// should pause stream by playing silence
	abstract resume(): void;														// should resume stream
	abstract destroy(): void;														// should gracefully stop stream and clean up
}