import { assert } from 'chai';
import fs from 'fs-extra';
import path from 'path';

export const LOG_FILE_DIRECTORY = path.join(__dirname, 'test_logs');

/**
 * format_date() - Formats UNIX timestamp in YYYY-MM-DD format
 * @param date - unix timestamp in ms
 * @returns - date string
 */
export function format_date(date: number) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return `${year}-${month}-${day}`;
}

type LogProperties = {
  level: string;
  message: string;
  timestamp?: string;
  stack?: string;
};

type ExpectedLogProperties = {
  level: string;
  message: string;
  stack?: string;
};

/**
 * fetch_log() - Fetches logs with given logger name
 * @param logger_name - name passed to logger on creation
 */
export function fetch_log(logger_name: string): { debug: Array<LogProperties>; info: Array<LogProperties> } {
  const date_string = format_date(Date.now());
  const debug_logs = fs
    .readFileSync(path.join(LOG_FILE_DIRECTORY, `${logger_name}-Debug-${date_string}.log`), 'utf-8')
    .split('\r');

  const info_logs = fs
    .readFileSync(path.join(LOG_FILE_DIRECTORY, `${logger_name}-Info-${date_string}.log`), 'utf-8')
    .split('\r');

  const debug: Array<LogProperties> = [];
  const info: Array<LogProperties> = [];

  for (let i = 0; i < debug_logs.length; i++) {
    // ignore empty strings (\n counts as 1)
    if (debug_logs[i].length < 2) continue;
    debug.push(JSON.parse(debug_logs[i]));
  }

  for (let i = 0; i < info_logs.length; i++) {
    // ignore empty strings (\n counts as 1)
    if (info_logs[i].length < 2) continue;
    info.push(JSON.parse(info_logs[i]));
  }

  return { debug, info };
}

/**
 * compare_logs() - compares parsed log file with expected output
 * @param log_file - array of parsed log properties in the order to expect them to appear
 * @param expected - array of expected log properties in the order to expect them to appear
 * @param min_time - minimum timestamp
 * @param max_time - maximum timestamp
 */
export function compare_logs(
  log_file: Array<LogProperties>,
  expected: Array<ExpectedLogProperties>,
  min_time: number,
  max_time: number
) {
  for (let i = 0; i < expected.length; i++) {
    assert(log_file[i].level === expected[i].level, `Log levels match for: ${JSON.stringify(log_file[i])}`);

    assert(log_file[i].message.startsWith(expected[i].message), `Log messages match for: ${JSON.stringify(log_file[i])}`);

    assert(
      new Date(log_file[i].timestamp).getTime() >= min_time,
      `Log timestamp is not too early for: ${JSON.stringify(log_file[i])}`
    );
    assert(
      new Date(log_file[i].timestamp).getTime() <= max_time,
      `Log timestamp is not too late for: ${JSON.stringify(log_file[i])}`
    );

    if (expected[i].stack) {
      assert(log_file[i].stack, `Log error message exists for: ${JSON.stringify(log_file[i])}`);

      assert(
        log_file[i].stack.startsWith('Error: ' + expected[i].stack),
        `Log error message matches for: ${JSON.stringify(log_file[i])}`
      );
    }
  }

  assert(log_file.length === expected.length, 'Log file and expected had same length');
}

/**
 * filter_debug() - creates a new array of expected output without debug logs
 * @param expected - array of log properties to remove debug messages from
 * @returns - array of log properties with debug messages removed
 */
export function filter_debug(expected: Array<ExpectedLogProperties>): Array<ExpectedLogProperties> {
  const new_array: Array<LogProperties> = [];
  for (let i = 0; i < expected.length; i++) {
    if (expected[i].level !== 'debug') {
      new_array.push(expected[i]);
    }
  }

  return new_array;
}
