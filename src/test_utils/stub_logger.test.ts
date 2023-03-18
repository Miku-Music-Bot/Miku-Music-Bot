/* eslint-disable @typescript-eslint/no-unused-vars */
import sinon from 'sinon';
import * as LoggerImport from '../logger/logger';
import Profiler, { LevelThresholds } from '../logger/profiler';

// A fake logger object for use in tests
class DummyLogger {
  constructor(name: string) {
    return;
  }

  debug(msg: string) {
    return;
  }

  info(msg: string) {
    return;
  }

  warn(msg: string, error?: Error) {
    return;
  }

  error(msg: string, error?: Error) {
    return;
  }

  fatal(msg: string, error?: Error) {
    return;
  }

  profile(name: string, level_thresholds?: LevelThresholds) {
    const profiler = {
      stop: (options: object) => {
        return 0;
      },
    } as unknown as Profiler;
    return profiler;
  }
}

/**
 * stubDummyLogger() - Replaces imported logger with a dummy logger for tests
 * IMPORTANT: Call sinon.restore() after test to clean up sandbox
 */
export default function stubDummyLogger() {
  sinon.stub(LoggerImport, 'default').callsFake((name) => {
    return new DummyLogger(name);
  });
}

export const dummy_logger = new DummyLogger('DummyLogger') as unknown as LoggerImport.default;
