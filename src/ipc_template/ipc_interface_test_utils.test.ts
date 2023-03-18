import ipc from 'node-ipc';

import Logger from '../logger/logger';
import StartIPCServer from './ipc_server';
import { FunctionRequest } from './ipc_types';

import '../test_utils/stub_logger.test';
import IPCInterface from './ipc_interface';

export enum TestFunctions {
  boolArg,
  numArg,
  strArg,
  objArg,
  promiseResolve,
  promiseReject,
}

async function boolArg(bool: boolean) {
  return !bool;
}

async function numArg(num: number) {
  return num + num;
}

async function strArg(str: string) {
  return str + str;
}

async function objArg(obj: { bool: boolean; num: number; str: string }) {
  obj.bool = !obj.bool;
  obj.num = obj.num + obj.num;
  obj.str = obj.str + obj.str;
  return obj;
}

async function promiseResolve(): Promise<string> {
  return Promise.resolve('resolved');
}

async function promiseReject(): Promise<string> {
  return Promise.reject(new Error('rejected'));
}

// Start the IPC server
export function CreateTestIPCServer(ready: Promise<void>): typeof ipc {
  const logger = new Logger('IPC-Server-Test');

  return StartIPCServer('IPC-Server-Test', logger, ready, async (data: FunctionRequest<TestFunctions>) => {
    switch (data.function_type) {
      case TestFunctions.boolArg: {
        return JSON.stringify(await boolArg(JSON.parse(data.args[0])));
      }
      case TestFunctions.numArg: {
        return JSON.stringify(await numArg(JSON.parse(data.args[0])));
      }
      case TestFunctions.strArg: {
        return strArg(data.args[0]);
      }
      case TestFunctions.objArg: {
        return JSON.stringify(await objArg(JSON.parse(data.args[0])));
      }
      case TestFunctions.promiseResolve: {
        return promiseResolve();
      }
      case TestFunctions.promiseReject: {
        return promiseReject();
      }
    }
  });
}

/**
 * TestIPCInterface() - A simple IPCInterface to test IPCInterface functions
 */
export class TestIPCInterface extends IPCInterface<TestFunctions> {
  constructor() {
    const logger = new Logger('IPC-Server-Test');
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
