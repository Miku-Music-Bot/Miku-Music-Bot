import * as winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * logger.js
 *
 * @param {string} logDir - directory to save logs
 * @return {object} - winston logger object
 */
export function newLogger(logDir: string): winston.Logger {
	const logLevels = {
		error: 0,
		warn: 1,
		info: 2,
		debug: 3,
	};

	const logger = winston.createLogger({
		level: 'debug',
		levels: logLevels,
		transports: [
			new winston.transports.DailyRotateFile({
				level: 'debug',
				dirname: logDir,
				filename: '%DATE%.log',
				datePattern: 'YYYY-MM-DD',
				zippedArchive: true,
				maxSize: '20m',
				maxFiles: '14d',
				format: winston.format.combine(
					winston.format.timestamp(),
					winston.format.json(),
				),
			}),
		],
		exitOnError: false,
	});

	// if not in production, also output to console
	if (process.env.NODE_ENV !== 'production') {
		logger.add(new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
			),
		}));
		winston.addColors({
			debug: 'blue',
			info: 'green',
			warn: 'yellow',
			error: 'red',
		});
	}

	return logger;
}
