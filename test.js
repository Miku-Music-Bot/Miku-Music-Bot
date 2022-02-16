/* eslint-disable */

const youtubedl = require('youtube-dl-exec');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg');

const sub = youtubedl.exec('https://www.youtube.com/watch?v=5qap5aO4i9A', {
	output: '-',
	hlsPreferFfmpeg: true,
	ffmpegLocation: ffmpegPath.path
});

sub.stdout.on('data', (data) => {
	console.log(data);
})