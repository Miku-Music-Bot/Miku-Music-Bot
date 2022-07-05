import fs from 'fs';
import express from 'express';
import winston from 'winston';
import { AuthPlus } from 'googleapis-common';

import type BotMaster from '../BotMaster';
import getEnv from '../config';
import createAdminRouter from './authRouter';
import createThumbnailRouter from './thumbnailRouter';
import createMainRouter from './mainRouter';
import createGuildRouter from './guildRouter';

/**
 * @name startWebServer()
 * Handles webserver for bot
 * @param botMaster - bot master object
 * @param log - logger object
 * @param config - environment config object
 * @return promise that resolves once web server is ready
 */
export default function startWebServer(botMaster: BotMaster, log: winston.Logger, config: ReturnType<typeof getEnv>): Promise<void> {
	log.profile('(1.0) Start Web Server');

	const app = express();
	app.use(express.static(config.ASSETS_LOC));

	const authPlus = new AuthPlus();
	const oAuth2Client = new authPlus.OAuth2(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);

	app.use('/', createMainRouter(log, config));
	app.use('/admin', createAdminRouter(log, config, oAuth2Client));
	app.use('/thumbnails', createThumbnailRouter(log, config));
	app.use('/guild', createGuildRouter(log, config));

	return new Promise((resolve, reject) => {
		try {
			app.listen(config.PORT, () => {
				log.info(`Webserver listening on {port:${config.PORT}}`);
				log.profile('(1.0) Start Web Server');

				try {
					fs.accessSync(config.GOOGLE_TOKEN_LOC);
					log.debug(`Found Google Drive token data at {location:${config.GOOGLE_TOKEN_LOC}}`);
					resolve();
				}
				catch {
					log.info(`Google Drive token data not found at "${config.GOOGLE_TOKEN_LOC}", head to "${config.GOOGLE_REDIRECT_URI}", to authenticate Google Drive API!`);

					// Keep checking for file until found
					const recheck = async () => {
						try {
							await fs.promises.access(config.GOOGLE_TOKEN_LOC);
							log.info(`Found Google Drive token data at {location:${config.GOOGLE_TOKEN_LOC}}`);
							resolve();
						}
						catch (error) {
							log.error(`{error:${error.message}} failed to read Google Drive token data at {location:${config.GOOGLE_TOKEN_LOC}}`, error);
							setTimeout(() => { recheck(); }, 5_000);
						}
					};
					recheck();
				}
			});
		}
		catch (error) {
			log.error(`{error:${error.message}} while starting webserver`, error);
			log.profile('(1.0) Start Web Server');
			reject();
		}
	});
}