import ipc from 'node-ipc';
import EventEmitter from 'events';

import { ipc_config } from '../constants';
import Logger from '../logger/logger';

import { FunctionResponse, FunctionRequest } from './ipc_types';

/**
 * IPCInterface - Template code for IPC Interfacess
 */
export default class IPCInterface<FunctionNames> {
  private events_ = new EventEmitter();

  private ipc_ = new ipc.IPC();
  private ipc_id_: string;
  private queue_: Array<FunctionRequest<FunctionNames>> = [];

  private counter_ = Date.now() * 1000;
  private ready_ = false;
  private running_ = false;

  private log_: Logger;

  /**
   * @param ipc_id - ipc_id of IPC process to interface with
   * @param logger - logger
   */
  constructor(ipc_id: string, logger: Logger) {
    if (logger) this.log_ = logger;

    this.ipc_id_ = ipc_id;

    this.ipc_.config.retry = ipc_config.retry;
    this.ipc_.config.silent = ipc_config.silent;
    this.ipc_.config.rawBuffer = ipc_config.rawBuffer;
    this.ipc_.config.appspace = ipc_config.app_namespace;
    this.ipc_.config.id = ipc_id + '-Interface-' + Date.now().toString();

    this.log_.debug(`Attempting ipc connection to {id:${ipc_id}} in {namespace:${ipc_config.app_namespace}}`);
    this.ipc_.connectTo(ipc_id, () => {
      // Establish listeners
      const connection = this.ipc_.of[ipc_id];
      connection.on('connect', () => {
        this.ready_ = true;
        this.RunQueue();
        this.log_.debug(`ipc connection to {id:${ipc_id}} in {namespace:${ipc_config.app_namespace}} established`);
      });

      connection.on('disconnect', () => {
        this.ready_ = false;
        this.running_ = false;
        this.log_.warn(`ipc connection to {id:${ipc_id}} in {namespace:${ipc_config.app_namespace}} disconnected`);
      });

      connection.on('message', (response: FunctionResponse) => {
        this.events_.emit(response.uid, response);
      });
    });
  }

  /**
   * RunQueue() - Runs queued commands in function queue
   */
  private RunQueue() {
    if (this.running_) return;
    if (this.queue_.length === 0) {
      this.running_ = false;
      return;
    }
    if (!this.ready_) {
      setTimeout(() => this.RunQueue(), 10);
      return;
    }

    this.running_ = true;
    const function_req = this.queue_[0];

    this.events_.once(function_req.uid, () => {
      this.running_ = false;
      this.queue_.shift();
      this.RunQueue();
    });

    try {
      this.ipc_.of[this.ipc_id_].emit('message', function_req);
    } catch (error) {
      this.log_.error('Error sending function request', error);
      this.running_ = false;
      this.RunQueue();
    }
  }

  /**
   * RequestFunction() - Runs a specific function and returns the result
   * @param function_type - type of function to run
   * @param args - arguments of function
   * @returns Promise resolving to function's response or rejects if there is an error
   */
  protected async RequestFunction(function_type: FunctionNames, args: Array<string>): Promise<string> {
    const function_req: FunctionRequest<FunctionNames> = {
      uid: this.GenerateUID(),
      function_type,
      args,
    };

    this.queue_.push(function_req);
    this.RunQueue();

    return new Promise((resolve, reject) => {
      this.events_.once(function_req.uid, (response: FunctionResponse) => {
        if (response.success) {
          resolve(response.result);
          return;
        }
        reject(new Error(response.error));
      });
    });
  }

  /**
   * GenerateUID() - Generates a unique identifier every call
   * @returns uid
   */
  private GenerateUID(): string {
    this.counter_++;
    return this.counter_.toString();
  }

  /**
   * disconnect() - Disconnects IPC connection
   */
  disconnect() {
    this.ipc_.disconnect(this.ipc_id_);
  }
}
