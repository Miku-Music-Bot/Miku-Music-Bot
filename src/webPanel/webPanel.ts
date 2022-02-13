import * as path from 'path';
import * as express from 'express';

import type BotMaster from '../guildHandler/GuildMaster';

const PORT = process.env.PORT || 8080;

/**
 * webPanel.js
 *
 * Handles webserver for bot
 * @param botMaster - bot master object
 * @return promise that resolves once web server is ready
 */
export default function startWebServer (botMaster: BotMaster): Promise<void> {
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
			console.log(error);
			reject();
		}
	});
}