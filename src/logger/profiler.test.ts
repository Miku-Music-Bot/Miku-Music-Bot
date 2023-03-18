import { assert } from 'chai';
import sinon from 'sinon';

import Logger from './logger';
import stubConfig from '../test_utils/stub_config.test';

describe('Profiler', () => {
  beforeEach(() => {
    stubConfig({ logger_config: { log_file: false, log_console: false } });
  });

  it('returns accurate time and writes default log message', () => {
    const clock = sinon.useFakeTimers();

    const logger = new Logger('TestLogger');
    const debug_spy = sinon.spy(logger, 'debug');

    const profile0 = logger.profile('profile0');

    clock.tick(100);
    const time = profile0.stop();
    clock.restore();

    assert(
      debug_spy.getCall(0).calledWith('Task "profile0" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(time === 100, 'Returns correct duration');
    assert(time === profile0.stop(), 'Calling stop again returns same duration');
  });

  it('writes custom log message and success', async () => {
    const clock = sinon.useFakeTimers();

    const logger = new Logger('TestLogger');
    const debug_spy = sinon.spy(logger, 'debug');

    const profile0 = logger.profile('profile0');
    const profile1 = logger.profile('profile1');
    const profile2 = logger.profile('profile2');

    clock.tick(100);
    profile0.stop({ message: 'with message' });
    profile1.stop({ success: false });
    profile2.stop({ message: 'not successful with message', success: false });
    clock.restore();

    assert(debug_spy.getCall(0).calledWith('with message'), 'Logs correct message');
    assert(
      debug_spy.getCall(1).calledWith('Task "profile1" completed unsuccessfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(debug_spy.getCall(2).calledWith('not successful with message'), 'Logs correct message');
  });

  it('writes message with custom log level', () => {
    const clock = sinon.useFakeTimers();
    sinon.stub(process, 'exit');

    const logger = new Logger('TestLogger');
    const debug_spy = sinon.spy(logger, 'debug');
    const info_spy = sinon.spy(logger, 'info');
    const warn_spy = sinon.spy(logger, 'warn');
    const error_spy = sinon.spy(logger, 'error');
    const fatal_spy = sinon.spy(logger, 'fatal');

    const profile0 = logger.profile('profile0');
    const profile1 = logger.profile('profile1');
    const profile2 = logger.profile('profile2');
    const profile3 = logger.profile('profile3');
    const profile4 = logger.profile('profile4');

    clock.tick(100);
    profile0.stop({ level: 'debug' });
    profile1.stop({ level: 'info' });
    profile2.stop({ level: 'warn' });
    profile3.stop({ level: 'error' });
    profile4.stop({ level: 'fatal' });
    clock.restore();

    assert(
      debug_spy.getCall(0).calledWith('Task "profile0" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(
      info_spy.getCall(0).calledWith('Task "profile1" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(
      warn_spy.getCall(0).calledWith('Task "profile2" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(
      error_spy.getCall(0).calledWith('Task "profile3" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(
      fatal_spy.getCall(0).calledWith('Task "profile4" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
  });

  it('write message with automatically determined log levels', () => {
    const clock = sinon.useFakeTimers();
    sinon.stub(process, 'exit');

    const logger = new Logger('TestLogger');
    const debug_spy = sinon.spy(logger, 'debug');
    const info_spy = sinon.spy(logger, 'info');
    const warn_spy = sinon.spy(logger, 'warn');
    const error_spy = sinon.spy(logger, 'error');
    const fatal_spy = sinon.spy(logger, 'fatal');

    const profile0 = logger.profile('profile0', { debug: 100, info: 100, warn: 100, error: 100, fatal: 100 });
    const profile1 = logger.profile('profile1', { debug: 100, info: 100, warn: 100, error: 100, fatal: 101 });
    const profile2 = logger.profile('profile2', { debug: 100, info: 100, warn: 100, error: 101, fatal: 101 });
    const profile3 = logger.profile('profile3', { debug: 100, info: 100, warn: 101, error: 101, fatal: 101 });
    const profile4 = logger.profile('profile4', { debug: 100, info: 101, warn: 101, error: 101, fatal: 101 });
    const profile5 = logger.profile('profile5', { debug: 101, info: 101, warn: 101, error: 101, fatal: 101 });

    clock.tick(100);
    profile0.stop();
    profile1.stop();
    profile2.stop();
    profile3.stop();
    profile4.stop();
    profile5.stop();
    clock.restore();

    assert(
      fatal_spy.getCall(0).calledWith('Task "profile0" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(
      error_spy.getCall(0).calledWith('Task "profile1" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(
      warn_spy.getCall(0).calledWith('Task "profile2" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(
      info_spy.getCall(0).calledWith('Task "profile3" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(
      debug_spy.getCall(0).calledWith('Task "profile4" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(
      debug_spy.getCall(1).calledWith('Task "profile5" completed successfully after 100 milliseconds'),
      'Logs correct message'
    );
  });

  it('writes message with complex settings', () => {
    const clock = sinon.useFakeTimers();
    sinon.stub(process, 'exit');

    const logger = new Logger('TestLogger');
    const info_spy = sinon.spy(logger, 'info');
    const error_spy = sinon.spy(logger, 'error');
    const fatal_spy = sinon.spy(logger, 'fatal');

    const profile0 = logger.profile('profile0', { debug: 100, info: 100, warn: 100, error: 100, fatal: 101 });
    const profile1 = logger.profile('profile1');
    const profile2 = logger.profile('profile2');

    clock.tick(100);
    profile0.stop({ message: 'with message', level: 'info', success: false });
    profile1.stop({ level: 'fatal', success: false });
    profile2.stop({ message: 'with message', level: 'error', success: true });
    clock.restore();

    assert(info_spy.getCall(0).calledWith('with message'), 'Logs correct message');
    assert(
      fatal_spy.getCall(0).calledWith('Task "profile1" completed unsuccessfully after 100 milliseconds'),
      'Logs correct message'
    );
    assert(error_spy.getCall(0).calledWith('with message'), 'Logs correct message');
  });
});
