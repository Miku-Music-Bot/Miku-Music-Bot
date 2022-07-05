import winston from 'winston';
import 'winston-daily-rotate-file';
import getEnv from './config';

/**
 * @name newLogger()
 * Creates a new logger for the given directory and config
 * @param logDir - directory to save logs
 * @param config - environment config object
 * @returns logger object
 */
export default function newLogger(logDir: string, config: ReturnType<typeof getEnv>): winston.Logger {
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
			// for debug and up
			new winston.transports.DailyRotateFile({
				level: 'debug',
				dirname: logDir,
				json: true,
				filename: `Debug_${config.LOG_FILE_NAME}`,
				datePattern: config.LOG_DATE_PATTERN,
				zippedArchive: config.ZIP_LOGS,
				maxSize: config.LOG_MAX_SIZE,
				maxFiles: config.LOG_MAX_FILES,
				format: winston.format.combine(
					winston.format.errors({ stack: true }),
					winston.format.timestamp(),
					winston.format.json(),
					winston.format.prettyPrint()
				),
			}),
			// for info and up
			new winston.transports.DailyRotateFile({
				level: 'info',
				dirname: logDir,
				json: true,
				filename: `Main_${config.LOG_FILE_NAME}`,
				datePattern: config.LOG_DATE_PATTERN,
				zippedArchive: config.ZIP_LOGS,
				maxSize: config.LOG_MAX_SIZE,
				maxFiles: config.LOG_MAX_FILES,
				format: winston.format.combine(
					winston.format.errors({ stack: true }),
					winston.format.timestamp(),
					winston.format.json(),
					winston.format.prettyPrint()
				),
			}),
		],
		exceptionHandlers: [
			new winston.transports.DailyRotateFile({
				dirname: logDir,
				json: true,
				filename: `Exceptions_${config.LOG_FILE_NAME}`,
				datePattern: config.LOG_DATE_PATTERN,
				maxSize: config.LOG_MAX_SIZE,
				maxFiles: config.LOG_MAX_FILES,
				format: winston.format.combine(
					winston.format.errors({ stack: true }),
					winston.format.timestamp(),
					winston.format.json(),
					winston.format.prettyPrint()
				)
			}),
			new winston.transports.Console()
		],
		exitOnError: true,
	});

	winston.addColors({
		debug: 'blue',
		info: 'green',
		warn: 'yellow',
		error: 'red',
	});

	// output to console. If not in production, also output debug to console
	const consoleFormatter = winston.format.printf(({ level, stack, message, durationMs }) => {
		return `${level}: ${message} ${durationMs ? `{durationMs:${durationMs}}` : ''} ${stack ? `\n${stack}` : ''}`;
	});
	if (this.config.NODE_ENV !== 'PRODUCTION') {
		logger.add(new winston.transports.Console({
			format: winston.format.combine(
				winston.format.errors({ stack: true }),
				winston.format.colorize(),
				winston.format.simple(),
				consoleFormatter
			),
		}));
	}
	else {
		logger.add(new winston.transports.Console({
			format: winston.format.combine(
				winston.format.errors({ stack: true }),
				winston.format.colorize(),
				winston.format.simple(),
				consoleFormatter
			),
			level: 'info'
		}));
	}

	return logger;
}