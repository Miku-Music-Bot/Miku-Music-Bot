import express from 'express';
import winston from 'winston';

import getEnv from '../config';

/**
 * @name createGuildRouter()
 * @param log - logger object
 * @param config - environment config object
 * @returns express router for admin pages
*/
export default function createGuildRouter(log: winston.Logger, config: ReturnType<typeof getEnv>): express.Router {
	const guildRouter = express.Router();

	guildRouter.get('/', (req, res) => {
		res.send('Guild!');
	});

	return guildRouter;
}