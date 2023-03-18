import { assert } from 'chai';
import sinon from 'sinon';
import ipc from 'node-ipc';

import stubDummyLogger from '../test_utils/stub_logger.test';

import { CreateTestIPCServer, TestIPCInterface } from './ipc_interface_test_utils.test';

/**
 * SetupConnection() - Sets up server and interface
 * @returns - NodeIPC server and TestInterface
 */
function SetupConnection(): Promise<{ test_server: typeof ipc; test_interface: TestIPCInterface }> {
  return new Promise((resolve) => {
    const test_server = CreateTestIPCServer(Promise.resolve());
    process.send = (msg: string) => {
      assert.equal(msg, 'ready', 'Sends ready once promise resolves');

      const test_interface = new TestIPCInterface();

      resolve({ test_server, test_interface });
      return true;
    };
  });
}

describe('IPC Interface', () => {
  before(() => {
    stubDummyLogger();
  });

  after(() => {
    sinon.restore();
  });

  it('sends and returns boolean argument', async () => {
    const { test_server, test_interface } = await SetupConnection();

    const result = await test_interface.boolArg(false);

    assert.equal(result, true, 'Return opposite of argument');

    test_interface.disconnect();
    test_server.server.stop();
  });

  it('sends and returns integer argument', async () => {
    const { test_server, test_interface } = await SetupConnection();

    const result0 = await test_interface.numArg(1);
    const result1 = await test_interface.numArg(0);
    const result2 = await test_interface.numArg(-1);

    assert.equal(result0, 2, 'Return double of argument');
    assert.equal(result1, 0, 'Return double of argument');
    assert.equal(result2, -2, 'Return double of argument');

    test_interface.disconnect();
    test_server.server.stop();
  });

  it('sends and returns float argument', async () => {
    const { test_server, test_interface } = await SetupConnection();

    const result0 = await test_interface.numArg(1.111);
    const result1 = await test_interface.numArg(-1.111);

    assert.equal(result0, 2.222, 'Return double of argument');
    assert.equal(result1, -2.222, 'Return double of argument');

    test_interface.disconnect();
    test_server.server.stop();
  });

  it('send and returns string argument', async () => {
    const { test_server, test_interface } = await SetupConnection();

    const result0 = await test_interface.strArg('');
    const result1 = await test_interface.strArg('hi');

    assert.equal(result0, '', 'Return doubled argument');
    assert.equal(result1, 'hihi', 'Return doubled argument');

    test_interface.disconnect();
    test_server.server.stop();
  });

  it('send and returns object argument', async () => {
    const { test_server, test_interface } = await SetupConnection();

    const result0 = await test_interface.objArg({
      bool: false,
      num: 12,
      str: 'hi',
    });

    assert.equal(result0.bool, true, 'Return opposite of argument');
    assert.equal(result0.num, 24, 'Return double of argument');
    assert.equal(result0.str, 'hihi', 'Return doubled argument');

    test_interface.disconnect();
    test_server.server.stop();
  });

  it('returns resolved promise', async () => {
    const { test_server, test_interface } = await SetupConnection();

    const result = await test_interface.promiseResolve();

    assert.equal(result, 'resolved', 'Returns correct promise');

    test_interface.disconnect();
    test_server.server.stop();
  });

  it('throws error on rejected promise', async () => {
    const { test_server, test_interface } = await SetupConnection();

    try {
      await test_interface.promiseReject();
      assert.fail('Rejected promise is rejected');
    } catch (error) {
      assert.throws(() => {
        throw error;
      }, 'rejected');
    }

    test_interface.disconnect();
    test_server.server.stop();
  });

  it('does not emit ready on failed start', (done) => {
    let fail = false;
    process.send = (msg: string) => {
      if (msg === 'ready') fail = true;
      return true;
    };

    const test_server = CreateTestIPCServer(Promise.reject());
    setTimeout(() => {
      test_server.server.stop();

      assert.equal(fail, false, 'Does not send ready');
      done();
    }, 100);
  });
});
