import winston from "winston";
import "winston-daily-rotate-file";

import MIKU_CONSTS from "../constants";

/**
 * createWinstonLogger() - Creates a winston logger based on settings in MIKU_CONSTS
 * @param name - name of the logger to create
 * @returns winston logger
 */
export default function createWinstonLogger(name: string) {
  const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  // Create winston logger
  const logger = winston.createLogger({
    level: "debug",
    levels: logLevels,
    exitOnError: false,
  });

  // add file logging transports if logging to file is enabled
  if (MIKU_CONSTS.logger.log_file) {
    // create one transport for everything
    logger.add(
      new winston.transports.DailyRotateFile({
        level: "debug",
        dirname: MIKU_CONSTS.logger.file_directory,
        filename: `${name}-Debug-${MIKU_CONSTS.logger.file_name}`,
        datePattern: MIKU_CONSTS.logger.date_pattern,
        zippedArchive: MIKU_CONSTS.logger.zip_logs,
        maxSize: MIKU_CONSTS.logger.max_size,
        maxFiles: MIKU_CONSTS.logger.max_files,
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );

    // create another for without debug messages
    logger.add(
      new winston.transports.DailyRotateFile({
        level: "info",
        dirname: MIKU_CONSTS.logger.file_directory,
        filename: `${name}-Info-${MIKU_CONSTS.logger.file_name}`,
        datePattern: MIKU_CONSTS.logger.date_pattern,
        zippedArchive: MIKU_CONSTS.logger.zip_logs,
        maxSize: MIKU_CONSTS.logger.max_size,
        maxFiles: MIKU_CONSTS.logger.max_files,
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  }

  // Done here if logging to console is not needed
  if (!MIKU_CONSTS.logger.log_console) return logger;

  // Add some colors to console output
  winston.addColors({
    debug: "blue",
    info: "green",
    warn: "yellow",
    error: "red",
  });
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );

  return logger;
}