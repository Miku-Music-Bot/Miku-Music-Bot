import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

import AudioSource from './AudioSource';
import GuildComponent from '../../GuildComponent';
import type Song from '../../Data/SourceData/Song';
import type GuildHandler from '../../../GuildHandler';


export class GDSource extends GuildComponent implements AudioSource {
	song: Song;
	events: EventEmitter;
	buffering: boolean;
	destroyed: boolean;

	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
		//
	}

	bufferStream(attempts: number, seek: number) {
		//
	}

	async getStream(): Promise<PassThrough> {
		return new PassThrough(); 	//<<<temp
	}

	setChunkTiming(timing: number) {
		//
	}

	pause() {
		//
	}

	resume() {
		//
	}
	
	getPlayedDuration() {
		return 0;
	}

	destroy() {
		//
	}
}