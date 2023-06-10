/* eslint-disable @typescript-eslint/no-unused-vars */
import { assert } from 'chai';
import sinon from 'sinon';
import * as LoggerImport from '../logger/logger';

// Keeps track of all stubbed loggers, cleared when stubLogger() is called
let stubbed_loggers: Array<{ spies: Array<sinon.SinonSpiedInstance<{ name: string; stop: () => void }>> }> = [];

/**
 * createLoggerStub() - Creates a stubbed logger for use in tests
 * @returns - object containing stubbed logger and profiler
 */
export function createLoggerStub(): LoggerImport.default {
  const logger = {
    spies: [] as Array<sinon.SinonSpiedInstance<{ name: string; stop: () => void }>>,
    debug: () => {
      return;
    },
    info: () => {
      return;
    },
    warn: () => {
      return;
    },
    error: () => {
      return;
    },
    fatal: () => {
      return;
    },
    profile: function (name: string) {
      const profiler = {
        name,
        stop: () => {
          return;
        },
      };

      this.spies.push(sinon.spy(profiler));

      return profiler;
    },
  };

  stubbed_loggers.push(logger);

  return logger as unknown as LoggerImport.default;
}

/**
 * stubLogger() - Replaces imported logger with a dummy logger for tests and clears saved stubbed_loggers
 * IMPORTANT: Should be called in beforeEach hooks for tests that need a dummy logger
 */
export function stubLogger() {
  stubbed_loggers = [];
  const logger = createLoggerStub();
  sinon.stub(LoggerImport, 'default').callsFake((name) => {
    return logger;
  });
}

/**
 * verifyProfilersStopped() - Verifies that all profilers were stopped
 * IMPORTANT: Should be called in global afterEach hook and nowhere else. Also use sinon sandbox if restore is needed
 */
export function verifyProfilersStopped() {
  stubbed_loggers.forEach((logger) => {
    logger.spies.forEach((spy) => {
      assert(spy.stop.callCount > 0, `Stop called at least once on profiler with name: "${spy.name}"`);
    });
  });
  stubbed_loggers = [];
}
