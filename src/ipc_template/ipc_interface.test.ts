import { assert } from 'chai';
import sinon from 'sinon';

import { dummy_logger } from '../test_utils/stub_logger.test';
import stubConfig from '../test_utils/stub_config.test';

import StartIPCServer from './ipc_server';
import { IPCInterfaceTester } from './ipc_interface_test_utils.test';
import uniqueID from '../test_utils/unique_id.test';

describe('IPCInterface', () => {
  before(() => {
    process.send = () => {
      return true;
    };
  });

  beforeEach(() => {
    stubConfig({
      ipc_config: {
        retry: 0,
        silent: true,
        app_namespace: 'Test-IPC-Interface',
      },
    });
  });

  after(() => {
    process.send = undefined;
  });

  it('should connect to IPC Server and send function arguments', async () => {
    enum TestFunctionNames {
      foo,
      bar,
    }

    const ipc_id = uniqueID();
    const ready = Promise.resolve();
    const run_function_fake = sinon.fake.resolves('');
    const ipc = StartIPCServer<TestFunctionNames>(ipc_id, dummy_logger, ready, run_function_fake);

    const ipc_interface = new IPCInterfaceTester<TestFunctionNames>(ipc_id, dummy_logger);

    const args0: Array<undefined> = [];
    await ipc_interface.RequestFunction(TestFunctionNames.foo, args0);
    const args1 = [0, -1, 1, 0.0, 1.11, -1.11];
    await ipc_interface.RequestFunction(TestFunctionNames.foo, args1);
    const args2 = ['', 'foo', '123', '`~!@#$%^&*()_+-={}|[];:"<>?,./', "\\\n\t'", ' '];
    await ipc_interface.RequestFunction(TestFunctionNames.foo, args2);
    const args3 = [true, false];
    await ipc_interface.RequestFunction(TestFunctionNames.foo, args3);
    const args4: Array<null> = [null];
    await ipc_interface.RequestFunction(TestFunctionNames.bar, args4);
    const args5 = [{}, { a: '' }, { b: { c: 123 } }, { d: ['1', '2'] }];
    await ipc_interface.RequestFunction(TestFunctionNames.bar, args5);
    const args6 = [[], args0, args1, args2, args3, args4, args5];
    await ipc_interface.RequestFunction(TestFunctionNames.bar, args6);
    const args7 = [].concat(args0, args1, args2, args3, args4, args5, args6);
    await ipc_interface.RequestFunction(TestFunctionNames.bar, args7);

    assert(run_function_fake.getCall(0).calledWith(TestFunctionNames.foo, args0), 'Passes empty arguments correctly');
    assert(run_function_fake.getCall(1).calledWith(TestFunctionNames.foo, args1), 'Passes number arguments correctly');
    assert(run_function_fake.getCall(2).calledWith(TestFunctionNames.foo, args2), 'Passes string arguments correctly');
    assert(run_function_fake.getCall(3).calledWith(TestFunctionNames.foo, args3), 'Passes boolean arguments correctly');
    assert(run_function_fake.getCall(4).calledWith(TestFunctionNames.bar, args4), 'Passes null arguments correctly');
    assert(run_function_fake.getCall(5).calledWith(TestFunctionNames.bar, args5), 'Passes object arguments correctly');
    assert(run_function_fake.getCall(6).calledWith(TestFunctionNames.bar, args6), 'Passes array arguments correctly');
    assert(run_function_fake.getCall(7).calledWith(TestFunctionNames.bar, args7), 'Passes mixed arguments correctly');

    ipc_interface.disconnect();
    ipc.server.stop();
  });

  it('should return correct result from IPC Server', async () => {
    const return0: Array<undefined> = [];
    const return1 = [0, -1, 1, 0.0, 1.11, -1.11];
    const return2 = ['', 'foo', '123', '`~!@#$%^&*()_+-={}|[];:"<>?,./', "\\\n\t'", ' '];
    const return3 = [true, false];
    const return4: Array<null> = [null];
    const return5 = [{}, { a: '' }, { b: { c: 123 } }, { d: ['1', '2'] }];
    const return6 = [[], return0, return1, return2, return3, return4, return5];
    const return7 = [].concat(return0, return1, return2, return3, return4, return5, return6);

    const run_function_stub = sinon.stub();
    run_function_stub.onCall(0).resolves(return0);
    run_function_stub.onCall(1).resolves(return1);
    run_function_stub.onCall(2).resolves(return2);
    run_function_stub.onCall(3).resolves(return3);
    run_function_stub.onCall(4).resolves(return4);
    run_function_stub.onCall(5).resolves(return5);
    run_function_stub.onCall(6).resolves(return6);
    run_function_stub.onCall(7).resolves(return7);

    enum TestFunctionNames {
      foo,
      bar,
    }

    const ipc_id = uniqueID();
    const ready = Promise.resolve();
    const ipc = StartIPCServer<TestFunctionNames>(ipc_id, dummy_logger, ready, run_function_stub);

    const ipc_interface = new IPCInterfaceTester<TestFunctionNames>(ipc_id, dummy_logger);

    const result0 = await ipc_interface.RequestFunction(TestFunctionNames.foo, []);
    const result1 = await ipc_interface.RequestFunction(TestFunctionNames.foo, []);
    const result2 = await ipc_interface.RequestFunction(TestFunctionNames.foo, []);
    const result3 = await ipc_interface.RequestFunction(TestFunctionNames.foo, []);
    const result4 = await ipc_interface.RequestFunction(TestFunctionNames.foo, []);
    const result5 = await ipc_interface.RequestFunction(TestFunctionNames.foo, []);
    const result6 = await ipc_interface.RequestFunction(TestFunctionNames.foo, []);
    const result7 = await ipc_interface.RequestFunction(TestFunctionNames.foo, []);

    assert.deepEqual(result0, return0, 'Passes number arguments correctly');
    assert.deepEqual(result1, return1, 'Passes string arguments correctly');
    assert.deepEqual(result2, return2, 'Passes boolean arguments correctly');
    assert.deepEqual(result3, return3, 'Passes null arguments correctly');
    assert.deepEqual(result4, return4, 'Passes object arguments correctly');
    assert.deepEqual(result5, return5, 'Passes array arguments correctly');
    assert.deepEqual(result6, return6, 'Passes mixed arguments correctly');
    assert.deepEqual(result7, return7, 'Passes mixed arguments correctly');

    ipc_interface.disconnect();
    ipc.server.stop();
  });

  it('should throw error if server encounters error', async () => {
    enum TestFunctionNames {
      foo,
      bar,
    }

    const ipc_id = uniqueID();
    const ready = Promise.resolve();
    const run_function_fake = sinon.fake.rejects(new Error('Some Server Error'));
    const ipc = StartIPCServer<TestFunctionNames>(ipc_id, dummy_logger, ready, run_function_fake);

    const ipc_interface = new IPCInterfaceTester<TestFunctionNames>(ipc_id, dummy_logger);

    try {
      await ipc_interface.RequestFunction(TestFunctionNames.foo, []);
      assert.fail('Server error did not cause interface to throw error');
    } catch (error) {
      assert.throws(() => {
        throw error;
      }, 'Some Server Error');
    }

    ipc_interface.disconnect();
    ipc.server.stop();
  });

  it('should save function calls if an error occurs sending request', async () => {
    enum TestFunctionNames {
      foo,
      bar,
    }

    const ipc_id = uniqueID();
    const ready = Promise.resolve();
    const run_function_fake = sinon.fake.resolves('');
    const ipc = StartIPCServer<TestFunctionNames>(ipc_id, dummy_logger, ready, run_function_fake);

    const ipc_interface = new IPCInterfaceTester<TestFunctionNames>(ipc_id, dummy_logger);

    await ipc_interface.RequestFunction(TestFunctionNames.bar, []);

    // Run 10 functions with ipc causing errors
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    sinon.stub(ipc_interface.ipc_.of[ipc_id], 'emit').callsFake(sinon.fake.throws(new Error('Some IPC Error')));
    for (let i = 0; i < 10; i++) {
      ipc_interface.RequestFunction(TestFunctionNames.foo, [i]);
    }
    sinon.restore();

    await ipc_interface.RequestFunction(TestFunctionNames.bar, []);

    assert(run_function_fake.getCall(0).calledWith(TestFunctionNames.bar, []), 'First normal function works');
    assert(run_function_fake.getCall(11).calledWith(TestFunctionNames.bar, []), 'Last normal function works');

    for (let i = 0; i < 10; i++) {
      assert(run_function_fake.getCall(i + 1).calledWith(TestFunctionNames.foo, [i]), 'Error functions called in order');
    }

    ipc_interface.disconnect();
    ipc.server.stop();
  });
});
