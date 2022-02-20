import { SongConfig } from '../Settings/config/songConfig';

/**
 * Song
 * 
 * Template for how Song classes should behave
 */
export default abstract class Song {
	abstract get type(): string;				// have getters for required properties
	abstract get url(): string;
	abstract get title(): string;
	abstract get duration(): number;
	abstract get thumbnailURL(): string;
	abstract get artist(): string;
	abstract get live(): boolean;
	abstract get reqBy(): string;
	abstract fetchData(): Promise<void>			// should update the info of the song
	abstract export(): SongConfig				// should be able to export data for database
}