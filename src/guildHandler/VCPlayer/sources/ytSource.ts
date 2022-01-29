import play from 'play-dl';
import type { Song } from '../Song.js';

/**
 * YTSource
 *
 * Handles getting audio from a yt source
 */
export class YTSource {
	song: Song;
	stream: NodeJS.ReadableStream;

	/**
	 * @param {Song} song
	 */
	constructor(song: Song) {
		this.song = song;
	}

	async getStream() {
		const info = await play.video_info('https://www.youtube.com/watch?v=Zc05le75CfI');
		return await play.stream_from_info(info);
	}

	destroy() {
		//
	}
}
