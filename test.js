/* eslint-disable */
const pathToFfmpeg = require('ffmpeg-static')

const { spawn } = require('child_process');
const ls = spawn('./src/guildHandler/VCPlayer/sources/yt-dlp.exe', [
	'-o', '-',
	'--no-playlist',
	'--ffmpeg-location', pathToFfmpeg,
	'--quiet',
	'https://www.youtube.com/watch?v=AAwJ0_uqhb4&list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh&index=1'
]);

ls.stdout.on('data', (data) => {
	console.log(data);
});

ls.stdout.on('end', () => {
	console.log('end');
})

ls.stderr.on('data', (data) => {
	console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
	console.log(`child process exited with code ${code}`);
});