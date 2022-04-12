import fs from 'fs';
import https from 'https';
import express from 'express';
import winston from 'winston';
import { AuthPlus } from 'googleapis-common';
import path from 'path';

import type BotMaster from '../GuildMaster';

const ASSETS_LOC = process.env.ASSETS_LOC;
const BOT_DOMAIN = process.env.BOT_DOMAIN;
const PORT = process.env.PORT;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const GOOGLE_SCOPE = process.env.GOOGLE_SCOPE;
const GOOGLE_TOKEN_LOC = process.env.GOOGLE_TOKEN_LOC;

/**
 * webPanel.js
 *
 * Handles webserver for bot
 * @param botMaster - bot master object
 * @return promise that resolves once web server is ready
 */
export default function startWebServer(botMaster: BotMaster, log: winston.Logger): Promise<void> {
	const app = express();
	app.use(express.static(ASSETS_LOC));

	const authPlus = new AuthPlus();
	const oAuth2Client = new authPlus.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

	app.get('/', (req, res) => {
		res.send('Hello World!');
	});

	app.get('/thumbnails/:id', async (req, res) => {
		try {
			await fs.promises.access(path.join(ASSETS_LOC, 'thumbnails', req.params.id));
			res.send(path.join(ASSETS_LOC, 'thumbnails', req.params.id));
		}
		catch {
			res.sendFile(path.join(ASSETS_LOC, 'thumbnails', 'defaultThumbnail.jpg'));
		}
	});

	app.get('/admin', (req, res) => {
		// <<<<<<<<<<<<<<<< Should authenticate first
		res.send('admin');
	});

	app.get('/driveAuth/', (req, res) => {
		// <<<<<<<<<<<<<<< Should authenticate first
		if (req.query.code) {
			log.info('Recieved google drive oauth code, getting token');
			oAuth2Client.getToken(req.query.code as string, async (err, token) => {
				if (err) {
					log.error(`{error:${err}} when retrieving access token`);
					// <<<<<<<<<<<<<<<<<<<<< send an error
					// res.redirect()
					return;
				}

				try {
					await fs.promises.writeFile(GOOGLE_TOKEN_LOC, JSON.stringify(token));
					log.info(`Saved Google Drive token to {location:${GOOGLE_TOKEN_LOC}}`);
					res.redirect(`${BOT_DOMAIN}/admin`);
				}
				catch (error) {
					log.error(`{error:${error}} while saving google drive token to {location:${GOOGLE_TOKEN_LOC}}`);
					// <<<<<<<<<<<<<<<<<<<<< send an error
					// res.redirect()
				}
			});
			return;
		}
		const authUrl = oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: GOOGLE_SCOPE,
		});

		log.info(`Recieved request to authenticate Google Drive API, redirecting user to {url:${authUrl}}`);
		res.redirect(authUrl);
	});

	return new Promise((resolve, reject) => {
		try {
			const httpsServer = https.createServer({
				key: fs.readFileSync('/etc/letsencrypt/live/mikubot.app/privkey.pem'),
				cert: fs.readFileSync('/etc/letsencrypt/live/mikubot.app/fullchain.pem'),
			}, app);

			httpsServer.listen(PORT, () => {
				log.info(`Webserver listening on port ${PORT}`);

				try {
					fs.accessSync(GOOGLE_TOKEN_LOC);
					log.debug(`Found Google Drive token data at {location:${GOOGLE_TOKEN_LOC}}`);
					resolve();
				}
				catch {
					log.info(`Google Drive token data not found at "${GOOGLE_TOKEN_LOC}", head to "${GOOGLE_REDIRECT_URI}", to authenticate Google Drive API`);

					// Keep checking for file
					const recheck = setInterval(() => {
						try {
							fs.accessSync(GOOGLE_TOKEN_LOC);
							log.info(`Found Google Drive token data at {location:${GOOGLE_TOKEN_LOC}}`);
							clearInterval(recheck);
							resolve();
						} catch { /* */ }
					}, 5_000);
				}
			});
		} catch (error) {
			log.error(`{error:${error}} while starting webserver`);
			reject();
		}
	});
}