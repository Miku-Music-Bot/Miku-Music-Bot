import express from 'express';
import winston from 'winston';

import getEnv from '../config';

/**
 * @name createMainRouter()
 * @param log - logger object
 * @param config - environment config object
 * @returns express router for admin pages
*/
export default function createMainRouter(log: winston.Logger, config: ReturnType<typeof getEnv>): express.Router {
	const mainRouter = express.Router();

	mainRouter.get('/', (req, res) => {
		res.send('Hello World!');
	});

	return mainRouter;
}