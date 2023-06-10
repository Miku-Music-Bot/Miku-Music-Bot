import { assert } from 'chai';
import fs from 'fs-extra';

import uniqueID from '../test_utils/unique_id.test';
import { createDirectory, removeDirectory } from '../test_utils/test_directory.test';

import Logger from './logger';
import { LOG_FILE_DIRECTORY, format_date, filter_debug, fetch_log, compare_logs } from './logger_test_utils.test';
import stubConfig from '../test_utils/stub_config.test';
import sinon from 'sinon';

// number of milliseconds to wait after logging message before reading log file
const WRITE_WAIT = 100;

describe('Logger', () => {
  before(() => {
    createDirectory(LOG_FILE_DIRECTORY);
  });

  beforeEach(() => {
    stubConfig({
      logger_config: {
        log_file: true,
        log_console: false,
        file_directory: LOG_FILE_DIRECTORY,
        file_name: '%DATE%.log',
        date_pattern: 'YYYY-MM-DD',
        zip_logs: false,
        max_size: '20m',
        max_files: '5',
      },
    });
  });

  after(() => {
    removeDirectory(LOG_FILE_DIRECTORY);
  });

  describe('Logger constructor', () => {
    it('creates an info and debug log file at the correct location', (done) => {
      const name = uniqueID();
      const logger = new Logger(name);

      const date_string = format_date(Date.now());
      const expected_files = [`${name}-Info-${date_string}.log`, `${name}-Debug-${date_string}.log`];
      // wait a bit for files to be written
      setTimeout(() => {
        const files = fs.readdirSync(LOG_FILE_DIRECTORY);

        // check that all expected files exist
        for (const expected of expected_files) {
          let found = false;

          for (const file of files) {
            if (file === expected) {
              found = true;
            }
          }

          assert(found, `Expected file found for: ${expected}`);
        }

        logger.releaseFiles();
        done();
      }, WRITE_WAIT);
    });

    it('does not create new file if log_file is false', (done) => {
      const name = uniqueID();
      stubConfig({ logger_config: { log_file: false } });
      const logger = new Logger(name);

      const date_string = format_date(Date.now());
      const unexpected_files = [`${name}-Info-${date_string}.log`, `${name}-Debug-${date_string}.log`];
      // wait a bit for files to be written
      setTimeout(() => {
        const files = fs.readdirSync(LOG_FILE_DIRECTORY);

        // check that all expected files exist
        for (const expected of unexpected_files) {
          let not_found = true;

          for (const file of files) {
            if (file === expected) {
              not_found = false;
            }
          }

          assert(not_found, `Expected file not to be found for: ${expected}`);
        }

        logger.releaseFiles();
        done();
      }, WRITE_WAIT);
    });
  });

  describe('Logging Messages', () => {
    it('writes logs to file in correct format', (done) => {
      const start_time = Date.now();

      const process_exit_stub = sinon.stub(process, 'exit');

      const name = uniqueID();
      const logger = new Logger(name);

      logger.debug('debug0');
      logger.info('info0');
      logger.warn('warn0');
      logger.warn('warn1', new Error('Some small error'));
      logger.error('error0');
      logger.error('error1', new Error('Some error'));
      logger.fatal('fatal0');
      logger.fatal('fatal1', new Error('Some fatal error'));

      const expected_debug = [
        { level: 'debug', message: 'debug0' },
        { level: 'info', message: 'info0' },
        { level: 'warn', message: 'warn0' },
        {
          level: 'warn',
          message: 'warn1 - Some small error',
          stack: 'Some small error',
        },
        {
          level: 'error',
          message: 'error0 - error0',
          stack: 'error0',
        },
        {
          level: 'error',
          message: 'error1 - Some error',
          stack: 'Some error',
        },
        {
          level: 'error',
          message: '[FATAL] fatal0 - fatal0',
          stack: 'fatal0',
        },
        {
          level: 'error',
          message: '[FATAL] fatal1 - Some fatal error',
          stack: 'Some fatal error',
        },
      ];
      const expected_info = filter_debug(expected_debug);

      setTimeout(() => {
        const { debug, info } = fetch_log(name);

        compare_logs(debug, expected_debug, start_time, Date.now());
        compare_logs(info, expected_info, start_time, Date.now());

        assert.equal(process_exit_stub.callCount, 2, 'process.exit() called twice because of fatal error');

        logger.releaseFiles();
        done();
      }, 100);
    });
  });
});
