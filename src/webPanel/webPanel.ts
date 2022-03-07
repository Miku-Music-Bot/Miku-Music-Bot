import * as fs from 'fs';
import * as path from 'path';
import express = require('express');
import * as winston from 'winston';
import { google } from 'googleapis';

import type BotMaster from '../GuildMaster';

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
	app.use(express.static(path.join(__dirname, 'public')));

	const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

	app.get('/', (req, res) => {
		res.send('Hello World!');
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
			app.listen(PORT, () => {
				log.info(`Webserver listening on port ${PORT}`);

				try { 
					fs.accessSync(GOOGLE_TOKEN_LOC); 
					log.info(`Found Google Drive token data at {location:${GOOGLE_TOKEN_LOC}}`);
					resolve();
				} 
				catch {
					log.info(`Google Drive token data not found at {location:${GOOGLE_TOKEN_LOC}}, head to "${GOOGLE_REDIRECT_URI}", to authenticate Google Drive API`);

					// Keep checking for file
					const reCheck = setInterval(() => {
						try { 
							fs.accessSync(GOOGLE_TOKEN_LOC); 
							log.info(`Found Google Drive token data at {location:${GOOGLE_TOKEN_LOC}}`);
							clearInterval(reCheck);
							resolve();
						} catch { /* */ }
					}, 1000);
				}
			});
		} catch (error) {
			console.log(error);
			reject();
		}
	});
}