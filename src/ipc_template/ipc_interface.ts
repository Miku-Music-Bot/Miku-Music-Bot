import ipc from "node-ipc";
import EventEmitter from "events";

import MIKU_CONSTS from "../constants";
import Logger from "../logger/logger";

import { FunctionResponse, FunctionRequest } from "./ipc_types";

class Deferred {
  promise: Promise<void>;
  private resolve_: () => void;
  private reject_: () => void;

  private resolved_ = false;
  get resolved() { return this.resolved_; }

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve_ = resolve;
      this.reject_ = reject;
    });
  }

  resolve() {
    this.resolve_();
    this.resolved_ = true;
  }

  reject() {
    this.reject_();
    this.resolved_ = true;
  }
}

/**
 * IPCInterface - Template code for IPC Interfacess
 */
export default class IPCInterface<FunctionNames> {
  private events_ = new EventEmitter;

  private ipc_ = new ipc.IPC();
  private ipc_id_: string;

  private counter_ = 0;
  private ready_: Deferred;

  private log_: Logger;

  /**
   * @param ipc_id - ipc_id of IPC process to interface with
   * @param logger - logger
   */
  constructor(ipc_id: string, logger: Logger) {
    if (logger) this.log_ = logger;

    this.ready_ = new Deferred();

    this.ipc_id_ = ipc_id;

    this.ipc_.config.retry = MIKU_CONSTS.ipc_config.retry;
    this.ipc_.config.silent = MIKU_CONSTS.ipc_config.silent;
    this.ipc_.config.rawBuffer = MIKU_CONSTS.ipc_config.rawBuffer;
    this.ipc_.config.appspace = MIKU_CONSTS.ipc_config.APP_NAMESPACE;
    this.ipc_.config.id = ipc_id + "-Interface-" + Date.now().toString();

    this.log_.debug(`Attempting ipc connection to {id:${ipc_id}} in {namespace:${MIKU_CONSTS.ipc_config.APP_NAMESPACE}}`);
    this.ipc_.connectTo(ipc_id, () => {
      // Establish listeners
      const connection = this.ipc_.of[ipc_id];
      connection.on("connect", () => {
        this.ready_.resolve();
        this.log_.debug(`ipc connection to {id:${ipc_id}} in {namespace:${MIKU_CONSTS.ipc_config.APP_NAMESPACE}} established`);
      });

      connection.on("disconnect", () => {
        if (!this.ready_.resolved) { this.ready_.reject(); }
        this.ready_ = new Deferred();
        this.log_.warn(`ipc connection to {id:${ipc_id}} in {namespace:${MIKU_CONSTS.ipc_config.APP_NAMESPACE}} disconnected`);
      });

      connection.on("message", (response: FunctionResponse) => {
        this.events_.emit(response.uid, response);
      });
    });
  }

  /**
   * RequestFunction() - Runs a specific function and returns the result
   * @param function_type - type of function to run
   * @param args - arguments of function
   * @returns Promise resolving to function's response or rejects if there is an error
   */
  protected async RequestFunction(function_type: FunctionNames, args: Array<any>): Promise<any> {
    await this.ready_.promise;
    return new Promise((resolve, reject) => {
      const function_req: FunctionRequest<FunctionNames> = {
        uid: this.GenerateUID(),
        function_type,
        args
      };
      this.ipc_.of[this.ipc_id_].emit("message", function_req);

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
}