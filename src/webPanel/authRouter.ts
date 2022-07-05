import fs from 'fs';
import express from 'express';
import winston from 'winston';
import { OAuth2Client } from 'googleapis-common';

import getEnv from '../config';

/**
 * @name createAdminRouter()
 * @param log - logger object
 * @param config - environment config object
 * @param oAuth2Client - google drive auth client
 * @returns express router for admin pages
 */
export default function createAdminRouter(log: winston.Logger, config: ReturnType<typeof getEnv>, oAuth2Client: OAuth2Client): express.Router {
	const adminRouter = express.Router();

	adminRouter.get('/', (req, res) => {
		// <<<<<<<<<<<<<<<< Should authenticate first
		res.send('admin');
	});

	adminRouter.get('/driveAuth/', (req, res) => {
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

	return adminRouter;
}