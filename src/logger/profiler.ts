import Logger from './logger';

export type LevelThresholds = {
  debug?: number;
  info?: number;
  warn?: number;
  error?: number;
  fatal?: number;
};

/**
 * Profiler()
 * Tracks running time of a task starting from creation to when stop() is called
 * Logs a message once stop() is called
 */
export default class Profiler {
  private logger_: Logger;
  private name_: string;
  private start_time_: number;
  private duration_ = -1;
  private level_thresholds_: LevelThresholds = { debug: 0 };

  /**
   * @param logger - logger to log message to
   * @param name - name of task to profile
   * @param level_thresholds - optional thresholds for severity of logs (in milliseconds)
   */
  constructor(logger: Logger, name: string, level_thresholds?: LevelThresholds) {
    this.logger_ = logger;
    this.name_ = name;
    this.start_time_ = Date.now();
    this.level_thresholds_ = level_thresholds;
  }

  /**
   * stop() - Stops profiling task and logs a message
   * @param options - optional options for how to log message
   * @param options.message - custom message to log (overrides auto generated message)
   * @param options.success - if task was successful or not (default is true)
   * @param options.level - log level of message (overrides auto generated log level from level_thresholds)
   * @returns duration of task (in milliseconds)
   */
  stop(options?: { message?: string; success?: boolean; level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal' }): number {
    // don't log another message if stop called multiple times, just return original duration of task
    if (this.duration_ !== -1) return this.duration_;
    this.duration_ = Date.now() - this.start_time_;

    // determine level based on thresholds
    let level = 'debug';
    if (this.level_thresholds_) {
      if (this.duration_ >= this.level_thresholds_.fatal) level = 'fatal';
      else if (this.duration_ >= this.level_thresholds_.error) level = 'error';
      else if (this.duration_ >= this.level_thresholds_.warn) level = 'warn';
      else if (this.duration_ >= this.level_thresholds_.info) level = 'info';
      else level = 'debug';
    }
    // override level if level is given explicitly
    if (options && options.level) level = options.level;

    let success = true;
    if (options && typeof options.success !== 'undefined') {
      success = options.success;
    }

    let message =
      `Task "${this.name_}" completed ` +
      `${success ? 'successfully ' : 'unsuccessfully '}` +
      `after ${this.duration_} milliseconds`;
    if (options && options.message) {
      message = options.message;
    }

    if (level === 'debug') this.logger_.debug(message);
    if (level === 'info') this.logger_.info(message);
    if (level === 'warn') this.logger_.warn(message);
    if (level === 'error') this.logger_.error(message);
    if (level === 'fatal') this.logger_.fatal(message);

    return this.duration_;
  }
}
