import winston from "winston";
import "winston-daily-rotate-file";

const LOG_CONSOLE = process.env.LOG_CONSOLE === "true";
const LOG_FILE_DIRECTORY = process.env.LOG_FILE_DIRECTORY;
const LOG_FILE_NAME = process.env.LOG_FILE_NAME;
const LOG_DATE_PATTERN = process.env.LOG_DATE_PATTERN;
const ZIP_LOGS = process.env.ZIP_LOGS === "true";
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE;
const LOG_MAX_FILES = process.env.LOG_MAX_FILES;

class Profiler {
  private log_: Logger;
  private name_: string;
  private start_time_: number;
  private duration_: number;

  constructor(logger: Logger, name: string) {
    this.log_ = logger;
    this.name_ = name;
    this.start_time_ = Date.now();
  }

  stop(options?: {
    message?: string,
    level?: "debug" | "info" | "warn" | "error" | "fatal",
    conditional_level?: {
      debug?: number,
      info?: number,
      warn?: number,
      error?: number,
      fatal?: number
    }
  }): number {
    if (this.duration_) return this.duration_;
    this.duration_ = Date.now() - this.start_time_;

    let level = "debug";
    if (options && options.conditional_level) {
      if (this.duration_ >= options.conditional_level.fatal) level = "fatal";
      else if (this.duration_ >= options.conditional_level.error) level = "error";
      else if (this.duration_ >= options.conditional_level.warn) level = "warn";
      else if (this.duration_ >= options.conditional_level.info) level = "info";
      else level = "debug";
    }
    if (options && options.level) level = options.level;


    let message = `Task "${this.name_}" completed after ${this.duration_} milliseconds`
    if (options && options.message) { message = options.message; }

    if (level === "debug") this.log_.debug(message);
    else if (level === "info") this.log_.info(message);
    else if (level === "warn") this.log_.warn(message);
    else if (level === "error") this.log_.error(message);
    else if (level === "fatal") this.log_.fatal(message);

    return this.duration_;
  }
}

/**
 * Logger - logger wrapper for Miku
 */
export default class Logger {
  private logger_: winston.Logger;

  /**
   * @param name - Name of logger
   */
  constructor(name: string) {
    const logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    // Create winston logger for miku
    this.logger_ = winston.createLogger({
      level: "debug",
      levels: logLevels,
      transports: [
        new winston.transports.DailyRotateFile({
          level: "debug",
          dirname: LOG_FILE_DIRECTORY,
          filename: `${name}-Debug-${LOG_FILE_NAME}`,
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
          level: "info",
          dirname: LOG_FILE_DIRECTORY,
          filename: `${name}-Info-${LOG_FILE_NAME}`,
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

    // Add console transport if needed
    if (!LOG_CONSOLE) return;

    // Add some colors
    winston.addColors({
      debug: "blue",
      info: "green",
      warn: "yellow",
      error: "red",
    });

    // Add conosle transport
    this.logger_.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }));
  }

  // For messages about irrecoverable errors (stops program)
  fatal(msg: string, error?: Error) {
    if (!error) error = new Error(msg);
    msg = "[FATAL] " + msg;
    this.logger_.error(msg, error);
    setTimeout(() => {
      process.exit();
    }, 1000);
  }

  // For messages about recoverable errors
  error(msg: string, error?: Error) {
    if (!error) error = new Error(msg);
    this.logger_.error(msg, error);
  }

  // For messages about something that doesn't impact operation but may indicate a problem if it continues
  warn(msg: string, error?: Error) {
    if (error) {
      this.logger_.warn(msg, error);
    } else {
      this.logger_.warn(msg);
    }
  }

  // For general messages that tell what the program is doing
  info(msg: string) {
    this.logger_.info(msg);
  }

  // For detailed messages that tell what the program is doing
  debug(msg: string) {
    this.logger_.debug(msg);
  }

  // Starts a profiler with given name
  profile(name: string): Profiler {
    return new Profiler(this, name);
  }
}
