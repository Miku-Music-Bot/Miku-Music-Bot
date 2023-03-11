import winston from 'winston';
import 'winston-daily-rotate-file';
import { LoggerConfig } from '../constants';

/**
 * createWinstonLogger() - Creates a winston logger based on settings in MIKU_CONSTS
 * @param name - name of the logger to create
 * @param config - logger configuration
 */
export default function createWinstonLogger(name: string, config: LoggerConfig) {
  const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };

  // Create winston logger
  const transports: Array<winston.transport> = [];
  const logger = winston.createLogger({
    level: 'debug',
    levels: logLevels,
    exitOnError: false,
  });

  const format = winston.format.combine(winston.format.errors({ stack: true }), winston.format.timestamp(), winston.format.json());

  // add file logging transports if logging to file is enabled
  if (config.log_file) {
    const debug_transport = new winston.transports.DailyRotateFile({
      level: 'debug',
      dirname: config.file_directory,
      filename: `${name}-Debug-${config.file_name}`,
      datePattern: config.date_pattern,
      zippedArchive: config.zip_logs,
      maxSize: config.max_size,
      maxFiles: config.max_files,
      format,
    });
    const info_transport = new winston.transports.DailyRotateFile({
      level: 'info',
      dirname: config.file_directory,
      filename: `${name}-Info-${config.file_name}`,
      datePattern: config.date_pattern,
      zippedArchive: config.zip_logs,
      maxSize: config.max_size,
      maxFiles: config.max_files,
      format,
    });
    transports.push(debug_transport);
    transports.push(info_transport);

    logger.add(debug_transport);
    logger.add(info_transport);
  }

  // Done here if logging to console is not needed
  if (!config.log_console) return { logger, transports };

  // Add some colors to console output
  winston.addColors({
    debug: 'blue',
    info: 'green',
    warn: 'yellow',
    error: 'red',
  });
  const console_transport = new winston.transports.Console({ format });
  transports.push(console_transport);
  logger.add(console_transport);

  return { logger, transports };
}
