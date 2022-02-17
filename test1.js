/* eslint-disable */
const youtubedl = require('youtube-dl-exec')
const pathToFfmpeg = require('ffmpeg-static')
const fs = require('fs')

const subprocess = youtubedl.exec('https://www.youtube.com/watch?v=5qap5aO4i9A', {
	output: '-',
	ffmpegLocation: pathToFfmpeg
})

console.log(`Running subprocess as ${subprocess.pid}`)

subprocess.stdout.on('data', (data) => {
	console.log(data);
});
