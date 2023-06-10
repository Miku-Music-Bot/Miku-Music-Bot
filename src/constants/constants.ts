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

const CACHE_DIRECTORY = process.env.CACHE_DIRECTORY;
const MAX_CACHESIZE_MiB = parseInt(process.env.MAX_CACHESIZE_MiB);

const MIKU_DOMAIN = process.env.MIKU_DOMAIN;

export type IPCConfig = {
  retry: number;
  silent: boolean;
  rawBuffer: boolean;

  app_namespace: string;
  logger_ipc_id: string;
  music_ipc_id: string;
  song_db_ipc_id: string;
};
export const ipc_config: IPCConfig = Object.freeze({
  retry: 100,
  silent: true,
  rawBuffer: false,

  app_namespace: 'Miku-Music-Bot',
  logger_ipc_id: 'Miku-Logger',
  music_ipc_id: 'Miku-Music-Cache',
  song_db_ipc_id: 'Miku-Song-DB',
});

export type LoggerConfig = {
  log_file: boolean;
  log_console: boolean;
  file_directory: string;
  file_name: string;
  date_pattern: string;
  zip_logs: boolean;
  max_size: string;
  max_files: string;
};
export const logger_config: LoggerConfig = Object.freeze({
  log_file: LOG_FILE,
  log_console: LOG_CONSOLE,
  file_directory: LOG_FILE_DIRECTORY,
  file_name: LOG_FILE_NAME,
  date_pattern: LOG_DATE_PATTERN,
  zip_logs: ZIP_LOGS,
  max_size: LOG_MAX_SIZE,
  max_files: LOG_MAX_FILES,
});

export type SongDBConfig = {
  db_location: string;
};
export const songdb_config: SongDBConfig = Object.freeze({
  db_location: SONG_DB_LOCATION,
});

export type MusicCacheConfig = {
  cache_dir: string;
  cache_size_bytes: number;
};
export const music_cache_config: MusicCacheConfig = Object.freeze({
  cache_dir: CACHE_DIRECTORY,
  cache_size_bytes: MAX_CACHESIZE_MiB * (1 << 20),
});

export type WebConfig = {
  domain: string;
  default_thumbnail_url: string;
};
export const web_config: WebConfig = Object.freeze({
  domain: MIKU_DOMAIN,
  default_thumbnail_url: `${MIKU_DOMAIN}/thumbnails/default`,
});
