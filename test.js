/* eslint-disable */
const fs = require('fs');
const play = require('play-dl');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg')
const { PassThrough } = require('stream');

ffmpeg.setFfmpegPath(ffmpegPath.path); // set path for ffmpeg

play.getFreeClientID().then((clientID) => {
	play.setToken({
		soundcloud: {
			client_id: clientID
		}
	});
});

/*
176400 bytes for 1 sec of raw pcm data at 44100kHz, 16 bit, 2 channels
*/

(async () => {
	const source = await play.stream('https://soundcloud.com/user-892096870/renai-circulation', { discordPlayerCompatibility: true });
	ffmpeg(source.stream)
		.audioFilters('loudnorm=I=-32')
		.save('test.mp3');
})();
