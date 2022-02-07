import { PassThrough } from 'stream';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';

import type { AudioSettings } from './AudioSettings.js';

ffmpeg.setFfmpegPath(ffmpegPath.path);

export class AudioProcessor {
	audioSettings: AudioSettings;
	ffmpeg: ffmpeg.FfmpegCommand;
	ffmpegPassthrough: PassThrough;
	opusPassthrough: PassThrough;

	constructor(audioSettings: AudioSettings) {
		this.audioSettings = audioSettings;
		this.opusPassthrough = new PassThrough();
	}

	processStream(pcmPassthrough: PassThrough) {
		this.ffmpegPassthrough = new PassThrough();

		this.ffmpeg = ffmpeg(this.ffmpegPassthrough)
		
		this.ffmpeg.pipe()
			.on('data', (data) => {
				this.opusPassthrough.write(data);
			});
		
		

		return this.opusPassthrough;
	}
}