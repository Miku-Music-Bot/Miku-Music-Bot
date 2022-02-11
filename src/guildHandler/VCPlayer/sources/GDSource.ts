import { EventEmitter } from 'events';

import { AudioSource } from './AudioSource';
import { GuildComponent } from '../../GuildComponent';
import type { Song } from '../Song';
import type { GuildHandler } from '../../GuildHandler';
import { PassThrough } from 'winston-daily-rotate-file';


export class GDSource extends GuildComponent implements AudioSource {
	song: Song;
	events: EventEmitter;
	playDuration: number;

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

	destroy() {
		//
	}
}