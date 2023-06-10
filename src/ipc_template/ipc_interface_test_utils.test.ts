import { JSONAble } from './ipc_types';
import IPCInterface from './ipc_interface';

export class IPCInterfaceTester<T> extends IPCInterface<T> {
  RequestFunction(function_type: T, args: JSONAble[]): Promise<any> {
    return super.RequestFunction(function_type, args);
  }
}
