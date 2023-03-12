import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// load environment variables
const LOG_FILE = process.env.LOG_FILE === 'true';
const LOG_CONSOLE = process.env.LOG_CONSOLE === 'true';
const LOG_FILE_DIRECTORY = process.env.LOG_FILE_DIRECTORY;
const LOG_FILE_NAME = process.env.LOG_FILE_NAME;
const LOG_DATE_PATTERN = process.env.LOG_DATE_PATTERN;
const ZIP_LOGS = process.env.ZIP_LOGS === 'true';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE;
const LOG_MAX_FILES = process.env.LOG_MAX_FILES;

const SONG_DB_LOCATION = process.env.SONG_DB_LOCATION;

const MIKU_DOMAIN = process.env.MIKU_DOMAIN;

export const ipc_config = Object.freeze({
  retry: 1000,
  silent: true,
  rawBuffer: false,

  app_namespace: 'Miku-Music-Bot',
  logger_ipc_id: 'Miku-Logger',
  music_ipc_id: 'Miku-Music-Cache',
  song_db_ipc_id: 'Miku-Song-DB',
});
export type IPCConfig = typeof ipc_config;

export const logger_config = Object.freeze({
  log_file: LOG_FILE,
  log_console: LOG_CONSOLE,
  file_directory: LOG_FILE_DIRECTORY,
  file_name: LOG_FILE_NAME,
  date_pattern: LOG_DATE_PATTERN,
  zip_logs: ZIP_LOGS,
  max_size: LOG_MAX_SIZE,
  max_files: LOG_MAX_FILES,
});
export type LoggerConfig = typeof logger_config;

export const songdb_config = Object.freeze({
  db_location: SONG_DB_LOCATION,
});
export type SongDBConfig = typeof songdb_config;

export const web_config = Object.freeze({
  domain: MIKU_DOMAIN,
  default_thumbnail: `${MIKU_DOMAIN}/thumbnails/default`,
});
export type WebConfig = typeof web_config;
