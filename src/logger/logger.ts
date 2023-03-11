import winston from 'winston';

import Profiler, { LevelThresholds } from './profiler';
import createWinstonLogger from './create_winston_logger';
import { LoggerConfig, logger_config } from '../constants/constants';

/**
 * Logger()
 * A winston logger wrapper
 */
export default class Logger {
  private transports_: Array<winston.transport> = [];
  private logger_: winston.Logger;

  /**
   * @param name - Name of logger
   */
  constructor(name: string, config?: LoggerConfig) {
    if (!config) config = logger_config;

    const { transports, logger } = createWinstonLogger(name, config);

    this.transports_ = transports;
    this.logger_ = logger;
  }

  private async sendErrorNotification(level: 'fatal' | 'error' | 'warn', msg: string, error?: Error) {
    /**
     * @todo send error email
     */
  }

  /**
   * releaseFiles() - Releases the log files and stops writting logs
   */
  releaseFiles() {
    for (let i = 0; i < this.transports_.length; i++) {
      this.logger_.remove(this.transports_[i]);
    }
  }

  /**
   * fatal() - For messages about irrecoverable errors
   * @param msg - message to log
   * @param error - optional error message
   */
  fatal(msg: string, error?: Error) {
    if (!error) error = new Error(msg);

    msg = '[FATAL] ' + msg;
    this.logger_.error(`${msg} -`, error);

    this.sendErrorNotification('fatal', msg, error);
  }

  /**
   * error() - For messages about recoverable errors
   * @param msg - message to log
   * @param error - optional error message
   */
  error(msg: string, error?: Error) {
    if (!error) error = new Error(msg);

    this.logger_.error(`${msg} -`, error);

    this.sendErrorNotification('error', msg, error);
  }

  /**
   * warn() - For messages about something that doesn't impact operation but may indicate a problem if it continues
   * @param msg - message to log
   * @param error - optional error message
   */
  warn(msg: string, error?: Error) {
    if (error) {
      this.logger_.warn(`${msg} -`, error);
    } else {
      this.logger_.warn(msg);
    }

    this.sendErrorNotification('warn', msg, error);
  }

  /**
   * info() - For general messages that tell what the program is doing
   * @param msg - message to log
   */
  info(msg: string) {
    this.logger_.info(msg);
  }

  /**
   * debug() - For detailed messages that tell what the program is doing
   * @param msg - message to log
   */
  debug(msg: string) {
    this.logger_.debug(msg);
  }

  /**
   * profile() - Starts a profiler with given name
   * @param name - name of task to profile
   * @param level_thresholds - optional thresholds for severity of logs (in milliseconds)
   */
  profile(name: string, level_thresholds?: LevelThresholds): Profiler {
    return new Profiler(this, name, level_thresholds);
  }
}
