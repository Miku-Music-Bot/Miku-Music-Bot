import { PassThrough } from 'stream';

export class AudioProcessor {
	passthrough: PassThrough;

	constructor() {
		this.passthrough = new PassThrough();
	}
}