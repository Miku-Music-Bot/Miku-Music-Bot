import * as path from 'path';
import * as express from 'express';
import * as winston from 'winston';

import type BotMaster from '../GuildMaster';

const PORT = process.env.PORT || 8080;

/**
 * webPanel.js
 *
 * Handles webserver for bot
 * @param botMaster - bot master object
 * @return promise that resolves once web server is ready
 */
export default function startWebServer (botMaster: BotMaster, log: winston.Logger): Promise<void> {
	const app = express();
	app.use(express.static(path.join(__dirname, 'public')));

	app.get('/', (req, res) => {
		res.send('Hello World!');
	});

	return new Promise((resolve, reject) => {
		try {
			app.listen(PORT, () => {
				log.info(`Webserver listening on port ${PORT}`);
				resolve();
			});
		} catch (error) {
			console.log(error);
			reject();
		}
	});
}