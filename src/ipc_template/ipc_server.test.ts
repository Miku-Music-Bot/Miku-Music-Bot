import Logger from '../logger/logger';
import StartIPCServer from './ipc_server';
import { FunctionRequest } from './ipc_types';

let StartServer = false;
let SILENT = false;
process.argv.forEach((val) => {
  if (val === '-silent') SILENT = true;
  if (val === '-start-server') StartServer = true;
});

// Create a fake logger
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
if (StartServer) {
  StartIPCServer(
    'IPC-Server-Test',
    async (data: FunctionRequest<TestFunctions>) => {
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
    },
    logger,
    Promise.resolve()
  );
}
