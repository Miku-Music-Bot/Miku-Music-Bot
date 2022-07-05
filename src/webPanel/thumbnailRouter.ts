import path from 'path';
import fs from 'fs';
import express from 'express';
import winston from 'winston';

import getEnv from '../config';

/**
 * @name createThumbnailRouter()
 * @param log - logger object
 * @param config - environment config object
 * @returns express router for admin pages
*/
export default function createThumbnailRouter(log: winston.Logger, config: ReturnType<typeof getEnv>): express.Router {

	const thumbnailRouter = express.Router();

	thumbnailRouter.get('/:id', async (req, res) => {
		try {
			await fs.promises.access(path.join(config.ASSETS_LOC, 'thumbnails', req.params.id));
			res.send(path.join(config.ASSETS_LOC, 'thumbnails', req.params.id));
		}
		catch {
			res.sendFile(path.join(config.ASSETS_LOC, 'thumbnails', 'defaultThumbnail.jpg'));
		}
	});
	return thumbnailRouter;
}