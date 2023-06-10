import { assert } from 'chai';
import sinon from 'sinon';
import stubConfig from '../test_utils/stub_config.test';

import { createLoggerStub } from '../test_utils/stub_logger.test';
import uniqueID from '../test_utils/unique_id.test';

import StartIPCServer from './ipc_server';

// Time to wait before checking IPCServer promises messages
const WAIT_TIME = 100;

describe('Start IPC Server', () => {
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

  it('sends ready when ready resolves', (done) => {
    const process_send_stub = sinon.stub(process, 'send');

    const ready = Promise.resolve();
    const ipc = StartIPCServer(uniqueID(), createLoggerStub(), ready, sinon.fake());

    setTimeout(() => {
      assert(process_send_stub.getCall(0).calledWith('ready'), 'Send ready message to parent');

      ipc.server.stop();
      done();
    }, WAIT_TIME);
  });

  it('calls fatal when ready rejects', (done) => {
    const logger = createLoggerStub();
    const fatal_stub = sinon.stub(logger, 'fatal').callsFake(sinon.fake());
    const process_send_stub = sinon.stub(process, 'send');

    const ready = Promise.reject();
    const ipc = StartIPCServer(uniqueID(), logger, ready, sinon.fake());

    setTimeout(() => {
      assert.equal(process_send_stub.callCount, 0, 'Does not send ready message to parent');
      assert.equal(fatal_stub.callCount, 1, 'Logs fatal error');

      ipc.server.stop();
      done();
    }, WAIT_TIME);
  });

  it('calls fatal when server encounters error', (done) => {
    const logger = createLoggerStub();
    const fatal_stub = sinon.stub(logger, 'fatal').callsFake(sinon.fake());
    sinon.stub(process, 'send').callsFake(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ipc.server.publish('error', new Error('Some IPC Error'));
      return true;
    });

    const ready = Promise.resolve();
    const ipc = StartIPCServer(uniqueID(), logger, ready, sinon.fake());

    setTimeout(() => {
      assert.equal(fatal_stub.callCount, 1, 'Logs fatal error');
      assert.throws(() => {
        throw fatal_stub.firstCall.args[1];
      }, 'Some IPC Error');

      ipc.server.stop();
      done();
    }, WAIT_TIME);
  });
});
