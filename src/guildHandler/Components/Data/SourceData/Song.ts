import EventEmitter from 'events';

import { SongConfig } from './sourceConfig';

/**
 * Song
 * 
 * Template for how Song classes should behave
 */
export default abstract class Song {
	abstract events: EventEmitter;
	abstract get id(): number;					// have getters for required properties
	abstract get type(): string;
	abstract get url(): string;
	abstract get title(): string;
	abstract get duration(): number;
	abstract get durationString(): string;
	abstract get thumbnailURL(): string;
	abstract get artist(): string;
	abstract get live(): boolean;
	abstract get reqBy(): string;
	abstract set reqBy(reqBy: string);
	abstract fetchData(): Promise<unknown>		// should update the info of the song
	abstract export(): SongConfig				// should be able to export data for database
}