import { assert } from 'chai';

import Logger from './logger';

import { config, unique_logger_name, filter_debug, fetch_log, compare_logs } from './logger_test_helper.test';

// number of milliseconds to wait after logging message before reading log file
const WRITE_WAIT = 100;

/**
 * createProfilers() - Creates a number of profilers
 * @param count - number of profilers to create;
 * @returns - start_time of profilers, name of logger, logger itself, and array of profilers
 */
function createProfilers(count: number) {
  const start_time = Date.now();
  const name = unique_logger_name();
  const logger = new Logger(name, config);

  const profilers = [];
  for (let i = 0; i < count; i++) {
    profilers.push(logger.profile(`profile${i}`));
  }

  return { start_time, name, logger, profilers };
}

/**
 * compare_profiler_logs() - Checks the results of profiler logs
 * @param name - name of logger
 * @param start_time - start time of logger
 * @param expected_debug - expected debug messages of logger
 * @returns - Promise that resovles once done checking logs
 */
function compare_profiler_logs(
  name: string,
  start_time: number,
  expected_debug: Array<{ level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'; message: string }>
): Promise<void> {
  return new Promise((resolve) => {
    const expected_info = filter_debug(expected_debug);

    setTimeout(() => {
      const { debug, info } = fetch_log(name);
      compare_logs(debug, expected_debug, start_time, Date.now());
      compare_logs(info, expected_info, start_time, Date.now());

      resolve();
    }, WRITE_WAIT);
  });
}

describe('Profiler', () => {
  it('returns accurate time and writes default log message', (done) => {
    const { start_time, name, logger, profilers } = createProfilers(1);

    const timeout_dur = 100;
    setTimeout(async () => {
      const time = profilers[0].stop();

      assert(time >= timeout_dur, 'Profiler 0 duration is not shorter than expected');
      assert(time <= timeout_dur + 10, 'Profiler 0 duration is not longer than expected');
      assert(time === profilers[0].stop(), 'Calling stop again returns same duration');

      await compare_profiler_logs(name, start_time, [
        {
          level: 'debug',
          message: 'Task "profile0" completed successfully after ',
        },
      ]);

      logger.releaseFiles();
      done();
    }, timeout_dur);
  });

  it('writes custom log message and success', (done) => {
    const { start_time, name, logger, profilers } = createProfilers(3);

    const timeout_dur = 100;
    setTimeout(async () => {
      profilers[0].stop({ message: 'with message' });
      profilers[1].stop({ success: false });
      profilers[2].stop({ message: 'not successful with message', success: false });

      await compare_profiler_logs(name, start_time, [
        {
          level: 'debug',
          message: 'with message',
        },
        {
          level: 'debug',
          message: 'Task "profile1" completed unsuccessfully after ',
        },
        {
          level: 'debug',
          message: 'not successful with message',
        },
      ]);

      logger.releaseFiles();
      done();
    }, timeout_dur);
  });

  it('writes message with custom log level', (done) => {
    const { start_time, name, logger, profilers } = createProfilers(4);

    const timeout_dur = 100;
    setTimeout(async () => {
      profilers[0].stop({ level: 'debug' });
      profilers[1].stop({ level: 'info' });
      profilers[2].stop({ level: 'warn' });
      profilers[3].stop({ level: 'error' });

      await compare_profiler_logs(name, start_time, [
        {
          level: 'debug',
          message: 'Task "profile0" completed successfully after ',
        },
        {
          level: 'info',
          message: 'Task "profile1" completed successfully after ',
        },
        {
          level: 'warn',
          message: 'Task "profile2" completed successfully after ',
        },
        {
          level: 'error',
          message: 'Task "profile3" completed successfully after ',
        },
      ]);

      logger.releaseFiles();
      done();
    }, timeout_dur);
  });

  it('write message with automatically determined log levels', (done) => {
    const { start_time, name, logger, profilers } = createProfilers(5);

    profilers[0] = logger.profile('profile0', { debug: 100, info: 100, warn: 100, error: 100, fatal: 100 });
    profilers[1] = logger.profile('profile1', { debug: 100, info: 100, warn: 100, error: 100, fatal: 10000 });
    profilers[2] = logger.profile('profile2', { debug: 100, info: 100, warn: 100, error: 10000, fatal: 10000 });
    profilers[3] = logger.profile('profile3', { debug: 100, info: 100, warn: 10000, error: 10000, fatal: 10000 });
    profilers[4] = logger.profile('profile4', { debug: 100, info: 10000, warn: 10000, error: 10000, fatal: 10000 });
    profilers[5] = logger.profile('profile5', { debug: 10000, info: 10000, warn: 10000, error: 10000, fatal: 10000 });

    const timeout_dur = 100;
    setTimeout(async () => {
      profilers[0].stop();
      profilers[1].stop();
      profilers[2].stop();
      profilers[3].stop();
      profilers[4].stop();
      profilers[5].stop();

      await compare_profiler_logs(name, start_time, [
        {
          level: 'error',
          message: '[FATAL] Task "profile0" completed successfully after ',
        },
        {
          level: 'error',
          message: 'Task "profile1" completed successfully after ',
        },
        {
          level: 'warn',
          message: 'Task "profile2" completed successfully after ',
        },
        {
          level: 'info',
          message: 'Task "profile3" completed successfully after ',
        },
        {
          level: 'debug',
          message: 'Task "profile4" completed successfully after ',
        },
        {
          level: 'debug',
          message: 'Task "profile5" completed successfully after ',
        },
      ]);

      logger.releaseFiles();
      done();
    }, timeout_dur);
  });

  it('writes message with complex settings', (done) => {
    const { start_time, name, logger, profilers } = createProfilers(3);

    profilers[0] = logger.profile('profile0', { debug: 100, info: 100, warn: 100, error: 100, fatal: 10000 });

    const timeout_dur = 100;
    setTimeout(async () => {
      profilers[0].stop({ message: 'with message', level: 'info', success: false });
      profilers[1].stop({ level: 'fatal', success: false });
      profilers[2].stop({ message: 'with message', level: 'error', success: true });

      await compare_profiler_logs(name, start_time, [
        {
          level: 'info',
          message: 'with message',
        },
        {
          level: 'error',
          message: '[FATAL] Task "profile1" completed unsuccessfully after ',
        },
        {
          level: 'error',
          message: 'with message',
        },
      ]);

      logger.releaseFiles();
      done();
    }, timeout_dur);
  });
});
