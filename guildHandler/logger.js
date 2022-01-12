const winston = require('winston');
require('winston-daily-rotate-file');

/**
 * logger.js
 * 
 * @param {string} logDir - directory to save logs
 * @returns {object} - winston logger object
 */
module.exports = function (logDir) {
	const logLevels = {
		fatal: 0,
		error: 1,
		warn: 2,
		info: 3,
		debug: 4
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
			})
		],
		exitOnError: false,
	});

	// if not in production, also output to console
	if (process.env.NODE_ENV !== 'production') {
		logger.add(new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
			)
		}));
		winston.addColors({
			debug: 'blue',
			info: 'green',
			warn: 'yellow',
			error: 'magenta',
			fatal: 'red'
		});
	}

	return logger;
};