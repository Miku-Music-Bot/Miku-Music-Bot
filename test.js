/* eslint-disable */
const fs = require('fs');
const play = require('play-dl');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg')
const { PassThrough } = require('stream');

ffmpeg.setFfmpegPath(ffmpegPath.path); // set path for ffmpeg

/*
play.getFreeClientID().then((clientID) => {
	play.setToken({
		soundcloud: {
			client_id: clientID
		}
	});
});


Size in bytes per second: sampleRate * (bitDepth / 8) * channelCount
176400 bytes for 1 sec of raw pcm data at 44100kHz, 16 bit, 2 channels
*/
//.audioFilters('loudnorm=I=-32')
/*
(async () => {
	const source = await play.stream('https://www.youtube.com/watch?v=Zc05le75CfI&list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh&index=1', { discordPlayerCompatibility: true });

	var block = new BlockStream(44100);
	console.log(source.type);
	ffmpeg(source.stream)
		.audioChannels(2)
		.withAudioFrequency(44100)
		.on('end', () => {
			console.log('ffmpeg finished');
		})
		.on('error', (error) => {
			console.log(error);
		})
		.format('s16le')
		.pipe(block);

	block.pipe(fs.createWriteStream('test1.pcm'));
})();

*/

process.env.TEMP_DIR = "C:\\Users\\Ben1324\\Documents\\GitHub\\Miku-DiscordMusicBot\\built\\temp";

const { YTSource } = require('./built/guildHandler/VCPlayer/sources/YTSource.js');
const { AudioProcessor } = require('./built/guildHandler/VCPlayer/AudioProcessor.js');
const { AudioSettings } = require('./built/guildHandler/VCPlayer/AudioSettings.js');

const processor = new AudioProcessor(new AudioSettings()/*{
	debug: (a) => {
		console.log('Debug: ', a);
	},
	warn: (a) => {
		console.log('Warn: ', a);
	},
	error: (a) => {
		console.log('Error: ', a);
	}
}*/);
const source = new YTSource({
	debug: (a) => {
		console.log('Debug: ', a);
	},
	warn: (a) => {
		console.log('Warn: ', a);
	},
	error: (a) => {
		console.log('Error: ', a);
	}
}, {
	url: 'https://www.youtube.com/watch?v=5KsXVs8Vg7U&list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh&index=18'
});

(async () => {
	const stream = await source.getStream();
	//stream.pipe(fs.createWriteStream('test.pcm'));

	const processedStream = processor.processStream(stream);

	processedStream.pipe(fs.createWriteStream('test.ogg'));
})();