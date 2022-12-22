import ipc from "node-ipc";

import Logger from "../logger";
import MIKU_CONSTS from "../constants";
import { FunctionType, FunctionRequest, FunctionResponse } from "./database_handler";
import { DatabaseEntry } from "./default_entry";

/**
 * DatabaseHandlerInterface - Class for interfacing with database handler from seperate process
 */
export default class DatabaseHandlerInterface {
  private ipc_ = new ipc.IPC();

  private counter_ = 0;
  private ready_ = false;

  private log_: Logger;

  /**
   * @param logger - logger
   */
  constructor(logger: Logger) {
    this.log_ = logger;

    this.ipc_.config.retry = 5000;
    this.ipc_.config.silent = true;
    this.ipc_.config.rawBuffer = false;
    this.ipc_.config.appspace = MIKU_CONSTS.APP_NAMESPACE;
    this.ipc_.config.id = MIKU_CONSTS.DATABASE_HANDLER_IPC_ID + "-Interface-" + Date.now().toString();

    this.log_.debug(`Attempting ipc connection to {id:${MIKU_CONSTS.DATABASE_HANDLER_IPC_ID}} in {namespace:${MIKU_CONSTS.APP_NAMESPACE}}`);
    this.ipc_.connectTo(MIKU_CONSTS.DATABASE_HANDLER_IPC_ID, () => {
      // Establish listeners
      const connection = this.ipc_.of[MIKU_CONSTS.DATABASE_HANDLER_IPC_ID];
      connection.on("connect", () => {
        this.ready_ = true;
        this.log_.debug(`ipc connection to {id:${MIKU_CONSTS.DATABASE_HANDLER_IPC_ID}} in {namespace:${MIKU_CONSTS.APP_NAMESPACE}} established`);
      });

      connection.on("disconnect", () => {
        this.log_.warn(`ipc connection to {id:${MIKU_CONSTS.DATABASE_HANDLER_IPC_ID}} in {namespace:${MIKU_CONSTS.APP_NAMESPACE}} disconnected`);
      });
    })
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
   * RequestFunction() - Runs a specific function and returns the result
   * @param function_type - type of function to run
   * @param args - arguments of function
   * @returns Promise resolving to function's response or rejects if there is an error
   */
  private RequestFunction(function_type: FunctionType, args: Array<any>): Promise<any> {
    if (!this.ready_) return Promise.reject("Database Not Ready, Try Again In A Moment");
    return new Promise((resolve, reject) => {
      const function_req: FunctionRequest = {
        uid: this.GenerateUID(),
        function_type,
        args
      }

      this.ipc_.of[MIKU_CONSTS.DATABASE_HANDLER_IPC_ID].emit("message", function_req);

      this.ipc_.of[MIKU_CONSTS.DATABASE_HANDLER_IPC_ID].on(function_req.uid, (response: FunctionResponse) => {
        if (response.success) {
          resolve(response.result);
          return;
        }
        reject(response.error);
      });
    });
  }

  /**
   * NewGuild() - Creates a new guild database entry (assumes guild entry does not yet exist)
   * @param guild_id - guild_id of new guild to create
   */
  async NewGuild(guild_id: string): Promise<void> {
    return this.RequestFunction(FunctionType.NewGuild, [guild_id]);
  }

  /**
   * DeleteGuild() - Deletes guild database entry
   * @param guild_id - guild_id of guild to delete
   */
  async DeleteGuild(guild_id: string): Promise<void> {
    return this.RequestFunction(FunctionType.DeleteGuild, [guild_id]);
  }


  /**
   * FetchGuildConfig() - Fetches guild config of given guild_id
   * @param guild_id - guild_id of guild config to fetch
   */
  async FetchGuildConfig(guild_id: string): Promise<DatabaseEntry["guild_config"]> {
    return this.RequestFunction(FunctionType.FetchGuildConfig, [guild_id]);
  }

  /**
   * UpdateGuildConfig() - Updates guild config of given guild_id with given new data
   * @param guild_id - guild_id of guild config to update
   * @param new_config - guild config data to update database entry with
   */
  async UpdateGuildConfig(guild_id: string, new_config: DatabaseEntry["guild_config"]): Promise<void> {
    return this.RequestFunction(FunctionType.UpdateGuildConfig, [guild_id, new_config]);
  }


  /**
   * FetchAudioProcessingConfig() - Fetches audio processing config of given guild_id
   * @param guild_id - guild_id of audio processing config to fetch
   */
  async FetchAudioProcessingConfig(guild_id: string): Promise<DatabaseEntry["audio_processing_config"]> {
    return this.RequestFunction(FunctionType.FetchAudioProcessingConfig, [guild_id]);
  }

  /**
   * UpdateAudioProcessingConfig() - Updates audio processing config of given guild_id with given new data
   * @param guild_id - guild_id of audio processing config to update
   * @param new_config - audio processing config data to update database entry with
   */
  async UpdateAudioProcessingConfig(guild_id: string, new_config: DatabaseEntry["audio_processing_config"]): Promise<void> {
    return this.RequestFunction(FunctionType.UpdateAudioProcessingConfig, [guild_id, new_config]);
  }

  /**
   * FetchPermissionsConfig() - Fetches permissions config of given guild_id
   * @param guild_id - guild_id of guild config to fetch
   */
  async FetchPermissionsConfig(guild_id: string): Promise<DatabaseEntry["permissions_config"]> {
    return this.RequestFunction(FunctionType.FetchPermissionsConfig, [guild_id]);
  }

  /**
   * UpdatePermissionsConfig() - Updates permissions config of given guild_id with given new data
   * @param guild_id - guild_id of permissions config to update
   * @param new_config - permissions config data to update database entry with
   */
  async UpdatePermissionsConfig(guild_id: string, new_config: DatabaseEntry["permissions_config"]): Promise<void> {
    return this.RequestFunction(FunctionType.UpdatePermissionsConfig, [guild_id, new_config]);
  }
}