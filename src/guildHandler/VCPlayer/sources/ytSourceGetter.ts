import * as fs from 'fs';
import * as path from 'path';
import * as play from 'play-dl';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath.path);

function debug(msg: string) {
	process.send({
		type: 'debug',
		content: msg
	});
}

function warn(msg: string) {
	process.send({
		type: 'warn',
		content: msg
	});
}

function error(msg: string) {
	process.send({
		type: 'error',
		content: msg
	});
}

function addError(msg: string) {
	process.send({
		type: 'addError',
		content: msg
	});
}

process.on('message', async (settings: { url: string, tempLocation: string, attempts: number }) => {
	try {
		// obtain stream from youtube
		const source = await play.stream(settings.url, { discordPlayerCompatibility: true });
		debug(`Audio stream obtained for song with {url: ${settings.url}}, starting conversion to pcm`);

		// use ffmpeg to convert to raw pcm data
		const audioConverter = ffmpeg(source.stream)
			.audioChannels(2)							// 2 channels
			.audioFrequency(48000)						// audio freq of 48000 Hz
			.format('s16le')							// bitDepth of 16 bits
			.on('error', (e) => {
				if (e.toString().indexOf('SIGINT') == -1) {
					addError('Error while converting song to raw pcm data\n');
					error(`FFmpeg encountered {error: ${e}} while converting song with {url: ${settings.url}} to raw pcm`);
					process.send({ type: 'fatalEvent' });
				}
			});

		// split into and save even chunks of 1 sec each
		let chunkCount = -1;
		let currentBuffer = Buffer.alloc(0);
		let ready = false;
		audioConverter.pipe()
			// want to turn stream into a stream with equal sized chunks for duration counting
			// Size in bytes per second: sampleRate * (bitDepth / 8) * channelCount
			// 192000 bytes for 1 sec of raw pcm data at 48000Hz, 16 bits, 2 channels
			.on('data', async (data) => {
				// add to currentBuffer
				currentBuffer = Buffer.concat([currentBuffer, data]);

				// Once currentBuffer is the right size, save to file
				if (Buffer.byteLength(currentBuffer) >= 192000) {
					// make save a fixed size buffer of 192000, replace currentBuffer with what is left
					const save = currentBuffer.slice(0, 192000);
					currentBuffer = currentBuffer.slice(192000);

					chunkCount++;
					process.send({ type: 'chunkCount' });
					try {
						// save the chunk as <chunkNumber>.pcm
						await fs.promises.writeFile(path.join(settings.tempLocation, chunkCount.toString() + '.pcm'), save);

						// emit bufferReady event if haven't already
						if (!ready && chunkCount === 1) {
							ready = true;
							process.send({ type: 'bufferReady' });
						}
					}
					catch (e) {
						// fatal error if write fails
						addError('Failed to write song to disk\n');
						error(`{error: ${e}} while saving chunk with {chunkCount: ${chunkCount}} for song with {url: ${settings.url}}`);
						process.send({ type: 'fatalEvent' });
					}

				}
			})
			.on('end', async () => {
				// emit bufferReady event if haven't already
				if (!ready) {
					ready = true;
					process.send({ type: 'bufferReady' });
				}

				// save the last bit as final file
				chunkCount++;
				process.send({ type: 'chunkCount' });
				process.send({ type: 'finishedBuffering' });
				if (Buffer.byteLength(currentBuffer) > 0) {
					try {
						// save the chunk as <chunkNumber>.pcm
						await fs.promises.writeFile(path.join(settings.tempLocation, chunkCount.toString() + '.pcm'), currentBuffer);
					}
					catch (e) {
						// fatal error if this fails
						addError('Failed to write song to disk\n');
						error(`{error: ${e}} while saving chunk with {chunkCount: ${chunkCount}} for song with {url: ${settings.url}}`);
						process.send({ type: 'fatalEvent' });
					}
				}
				debug(`Stream for song with {url: ${settings.url}}, fully converted to pcm`);
			});
	}
	catch (err) {
		addError(`Buffer Stream Attempt: ${settings.attempts} - Failed to get song from youtube\n`);
		warn(`{error: ${err}} while getting audio stream for song with {url: ${settings.url}}`);
		process.send({ type: 'failed' });
	}
});