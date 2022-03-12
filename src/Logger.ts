import winston from 'winston';
import 'winston-daily-rotate-file';

const NODE_ENV = process.env.NODE_ENV;
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
				filename: `Debug${LOG_FILE_NAME}`,
				datePattern: LOG_DATE_PATTERN,
				zippedArchive: ZIP_LOGS,
				maxSize: LOG_MAX_SIZE,
				maxFiles: LOG_MAX_FILES,
				format: winston.format.combine(
					winston.format.timestamp(),
					winston.format.json(),
				),
			}),
			new winston.transports.DailyRotateFile({
				level: 'info',
				dirname: logDir,
				filename: `Main${LOG_FILE_NAME}`,
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

	// colors because fun
	winston.addColors({
		debug: 'blue',
		info: 'green',
		warn: 'yellow',
		error: 'red',
	});

	// if not in production, also output to console
	if (NODE_ENV !== 'PRODUCTION') {
		logger.add(new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
			),
		}));
	}
	else {
		logger.add(new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
			),
			level: 'info'
		}));
	}

	return logger;
}
