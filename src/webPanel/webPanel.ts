import fs from 'fs';
import express from 'express';
import winston from 'winston';
import { AuthPlus } from 'googleapis-common';
import path from 'path';

import type BotMaster from '../GuildMaster';
import getEnv from '../config';
/**
 * webPanel.js
 *
 * Handles webserver for bot
 * @param botMaster - bot master object
 * @return promise that resolves once web server is ready
 */
export default function startWebServer(botMaster: BotMaster, log: winston.Logger, config: ReturnType<typeof getEnv>): Promise<void> {
	const app = express();
	app.use(express.static(config.ASSETS_LOC));

	const authPlus = new AuthPlus();
	const oAuth2Client = new authPlus.OAuth2(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);

	app.get('/', (req, res) => {
		res.send('Hello World!');
	});

	app.get('/thumbnails/:id', async (req, res) => {
		try {
			await fs.promises.access(path.join(config.ASSETS_LOC, 'thumbnails', req.params.id));
			res.send(path.join(config.ASSETS_LOC, 'thumbnails', req.params.id));
		}
		catch {
			res.sendFile(path.join(config.ASSETS_LOC, 'thumbnails', 'defaultThumbnail.jpg'));
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
					await fs.promises.writeFile(config.GOOGLE_TOKEN_LOC, JSON.stringify(token));
					log.info(`Saved Google Drive token to {location:${config.GOOGLE_TOKEN_LOC}}`);
					res.redirect(`${config.BOT_DOMAIN}/admin`);
				}
				catch (error) {
					log.error(`{error:${error}} while saving google drive token to {location:${config.GOOGLE_TOKEN_LOC}}`);
					// <<<<<<<<<<<<<<<<<<<<< send an error
					// res.redirect()
				}
			});
			return;
		}
		const authUrl = oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: config.GOOGLE_SCOPE,
		});

		log.info(`Recieved request to authenticate Google Drive API, redirecting user to {url:${authUrl}}`);
		res.redirect(authUrl);
	});

	return new Promise((resolve, reject) => {
		try {
			app.listen(config.PORT, () => {
				log.info(`Webserver listening on port ${config.PORT}`);

				try {
					fs.accessSync(config.GOOGLE_TOKEN_LOC);
					log.debug(`Found Google Drive token data at {location:${config.GOOGLE_TOKEN_LOC}}`);
					resolve();
				}
				catch {
					log.info(`Google Drive token data not found at "${config.GOOGLE_TOKEN_LOC}", head to "${config.GOOGLE_REDIRECT_URI}", to authenticate Google Drive API`);

					// Keep checking for file
					const recheck = setInterval(() => {
						try {
							fs.accessSync(config.GOOGLE_TOKEN_LOC);
							log.info(`Found Google Drive token data at {location:${config.GOOGLE_TOKEN_LOC}}`);
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