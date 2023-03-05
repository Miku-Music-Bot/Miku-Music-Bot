import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// load environment variables
const LOG_FILE = process.env.LOG_FILE === "true";
const LOG_CONSOLE = process.env.LOG_CONSOLE === "true";
const LOG_FILE_DIRECTORY = process.env.LOG_FILE_DIRECTORY;
const LOG_FILE_NAME = process.env.LOG_FILE_NAME;
const LOG_DATE_PATTERN = process.env.LOG_DATE_PATTERN;
const ZIP_LOGS = process.env.ZIP_LOGS === "true";
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE;
const LOG_MAX_FILES = process.env.LOG_MAX_FILES;

const MIKU_CONSTS = {
  ipc_config: {
    retry: 5000,
    silent: true,
    rawBuffer: false,

    APP_NAMESPACE: "Miku-Music-Bot",
    LOGGER_IPC_ID: "Miku-Logger",
    LOG_ANALYTICS: "Miku-Log-Analytics",
  },
  logger: {
    log_file: LOG_FILE,
    log_console: LOG_CONSOLE,
    file_directory: LOG_FILE_DIRECTORY,
    file_name: LOG_FILE_NAME,
    date_pattern: LOG_DATE_PATTERN,
    zip_logs: ZIP_LOGS,
    max_size: LOG_MAX_SIZE,
    max_files: LOG_MAX_FILES,
    debug_history_len: 100,
    info_history_len: 100,
    log_count_history_len: 1000,
    count_interval: (1000 * 60) * 10,
  }
};

export default MIKU_CONSTS;