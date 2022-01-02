const path = require('path');
const express = require('express');

const PORT = process.env.PORT || 8080;

/**
 * webPanel.js
 * 
 * Handles webserver for bot
 * @param {object} botMaster - bot master object
 * @returns {Promise} - resolves once web server is ready
 */
module.exports = function (botMaster) {
	botMaster;					// delete this later plz <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

	const app = express();
	app.use(express.static(path.join(__dirname, 'public')));

	app.get('/', (req, res) => {
		res.send('Hello World!');
	});

	return new Promise((resolve, reject) => {
		try {
			app.listen(PORT, () => {
				console.log(`Webserver listening on port ${PORT}`);
				resolve();
			});
		} catch (error) {
			reject(error);
		}
	});
};