import { assert } from 'chai';
import path from 'path';
import { fork } from 'child_process';

import IPCInterface from './ipc_interface';
import { TestFunctions } from './ipc_server.test';
import Logger from '../logger/logger';

// Create a fake logger
let SILENT = false;
process.argv.forEach((val) => {
  if (val === 'silent') {
    SILENT = true;
  }
});
function log(msg: string, error?: Error) {
  if (error) console.error(error);
  if (SILENT) console.log(msg);
}
const logger = {
  debug: log,
  info: log,
  warn: log,
  error: log,
  fatal: log,
} as Logger;

class TestIPCInterface extends IPCInterface<TestFunctions> {
  constructor() {
    super('IPC-Server-Test', logger);
  }

  async boolArg(bool: boolean) {
    return JSON.parse(await this.RequestFunction(TestFunctions.boolArg, [JSON.stringify(bool)]));
  }

  async numArg(num: number) {
    return JSON.parse(await this.RequestFunction(TestFunctions.numArg, [JSON.stringify(num)]));
  }

  async strArg(str: string) {
    return this.RequestFunction(TestFunctions.strArg, [str]);
  }

  async objArg(obj: { bool: boolean; num: number; str: string }) {
    return JSON.parse(await this.RequestFunction(TestFunctions.objArg, [JSON.stringify(obj)]));
  }

  async promiseResolve() {
    return this.RequestFunction(TestFunctions.promiseResolve, []);
  }

  async promiseReject() {
    return this.RequestFunction(TestFunctions.promiseReject, []);
  }
}

before(function () {
  this.test_server = fork(path.join(__dirname, 'ipc_server.test.js'), ['-start-server']);
});

after(async function () {
  this.test_server.kill();
});

describe('IPC Interface', () => {
  it('sends and returns boolean argument', async () => {
    const test_interface = new TestIPCInterface();

    const result = await test_interface.boolArg(false);

    assert.equal(result, true, 'Return opposite of argument');
    test_interface.disconnect();
  });

  it('sends and returns integer argument', async () => {
    const test_interface = new TestIPCInterface();

    const result0 = await test_interface.numArg(1);
    const result1 = await test_interface.numArg(0);
    const result2 = await test_interface.numArg(-1);

    assert.equal(result0, 2, 'Return double of argument');
    assert.equal(result1, 0, 'Return double of argument');
    assert.equal(result2, -2, 'Return double of argument');
    test_interface.disconnect();
  });

  it('sends and returns float argument', async () => {
    const test_interface = new TestIPCInterface();

    const result0 = await test_interface.numArg(1.111);
    const result1 = await test_interface.numArg(-1.111);

    assert.equal(result0, 2.222, 'Return double of argument');
    assert.equal(result1, -2.222, 'Return double of argument');
    test_interface.disconnect();
  });
});
