import * as winston from 'winston';
import 'winston-daily-rotate-file';

const LOG_FILE_NAME = process.env.LOG_FILE_NAME;
const LOG_DATE_PATTERN = process.env.LOG_DATE_PATTERN;
const ZIP_LOGS = process.env.ZIP_LOGS == 'true';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE;
const LOG_MAX_FILES = process.env.LOG_MAX_FILES;

/**
 * logger.js
 *
 * @param logDir - directory to save logs
 * @return winston logger object
 */
export default function newLogger(logDir: string): winston.Logger {
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
				filename: LOG_FILE_NAME,
				datePattern: LOG_DATE_PATTERN,
				zippedArchive: ZIP_LOGS,
				maxSize: LOG_MAX_SIZE,
				maxFiles: LOG_MAX_FILES,
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
