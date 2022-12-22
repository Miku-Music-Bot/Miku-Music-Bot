import ipc from "node-ipc";
import { MongoClient, Collection } from "mongodb";

import MIKU_CONSTS from "../constants";
import Logger from "../logger";
import { DatabaseEntry, DEFAULT_DATABSE_ENTRY } from "./default_entry";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE_NAME = process.env.MONGODB_DATABASE_NAME;
const MONGODB_COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME;

let ipc_ready = false;
let db_ready = false;
class DatabaseHandler {
  private client_: MongoClient;
  private collection_: Collection<DatabaseEntry>;

  private log_: Logger;

  constructor(logger: Logger) {
    this.log_ = logger;

    this.client_ = new MongoClient(MONGODB_URI);
    this.ConnectDB();
  }

  /**
   * ConnectDB() - Connects to mongodb database
   */
  private async ConnectDB() {
    const connection_profiler = this.log_.profile("Connect to Mongodb Database");
    this.log_.debug(`Attempting to connect to mongodb with {database_name:${MONGODB_DATABASE_NAME}} and {collection_name:${MONGODB_COLLECTION_NAME}}`);

    try {
      await this.client_.connect();
    } catch (error) {
      connection_profiler.stop({ level: "error" });
      this.log_.fatal("Failed to connect to mongodb database", error);
      connection_profiler.stop({ success: false, level: "error" });
      return;
    }

    const db = this.client_.db(MONGODB_DATABASE_NAME);
    this.collection_ = db.collection(MONGODB_COLLECTION_NAME);
    this.log_.debug(`Connected to mongodb with {database_name:${MONGODB_DATABASE_NAME}} and {collection_name:${MONGODB_COLLECTION_NAME}}`);
    connection_profiler.stop({ conditional_level: { warn: 3000, error: 10000 } });
    db_ready = true;
    if (ipc_ready) process.send("ready");
  }

  /**
   * NewGuild() - Creates a new guild database entry (assumes guild entry does not yet exist)
   * @param guild_id - guild_id of new guild to create
   */
  async NewGuild(guild_id: string): Promise<void> {
    const new_guild_entry_profiler = this.log_.profile(`Insert new guild entry for {guild_id:${guild_id}}`);
    this.log_.debug(`Adding new entry to database for {guild_id:${guild_id}}`);

    const new_guild_entry = Object.assign({}, DEFAULT_DATABSE_ENTRY);
    new_guild_entry.guild_id = guild_id;
    try {
      await this.collection_.insertOne(new_guild_entry);
    } catch (error) {
      this.log_.error(`Failed to add new entry to database for {guild_id:${guild_id}}`, error);
      new_guild_entry_profiler.stop({ success: false, level: "error" });
      return Promise.reject();
    }

    this.log_.debug(`Successfully added new entry to database for {guild_id:${guild_id}}`);
    new_guild_entry_profiler.stop({ conditional_level: { warn: 1000, error: 5000 } });
    return Promise.resolve();
  }

  /**
   * DeleteGuild() - Deletes guild database entry
   * @param guild_id - guild_id of guild to delete
   */
  async DeleteGuild(guild_id: string): Promise<void> {
    const delete_guild_entry_profiler = this.log_.profile(`Delete entry for {guild_id:${guild_id}}`);
    this.log_.debug(`Deleting entry in database for {guild_id:${guild_id}}`);

    try {
      await this.collection_.deleteOne({ guild_id });
    } catch (error) {
      this.log_.error(`Failed to delete entry in database for {guild_id:${guild_id}}`, error);
      delete_guild_entry_profiler.stop({ success: false, level: "error" });
      return Promise.reject();
    }

    this.log_.debug(`Successfully deleted entry entry in database for {guild_id:${guild_id}}`);
    delete_guild_entry_profiler.stop({ conditional_level: { warn: 1000, error: 5000 } });
    return Promise.resolve();
  }

  /**
   * FetchGuildConfig() - Fetches guild config of given guild_id
   * @param guild_id - guild_id of guild config to fetch
   */
  async FetchGuildConfig(guild_id: string): Promise<DatabaseEntry["guild_config"]> {
    const fetch_guild_config_profiler = this.log_.profile(`Fetch guild config for {guild_id:${guild_id}}`);
    this.log_.debug(`Fetching guild config for {guild_id:${guild_id}}`);

    let response;
    try {
      const query = { guild_id };
      const options = { projection: { _id: 0, guild_config: 1 } };
      response = await this.collection_.findOne(query, options);
    } catch (error) {
      this.log_.error(`Failed to fetch guild config for {guild_id:${guild_id}}`, error);
      fetch_guild_config_profiler.stop({ success: false, level: "error" });
      return Promise.reject();
    }

    this.log_.debug(`Successfully fetched guild config for {guild_id:${guild_id}}`);
    fetch_guild_config_profiler.stop();
    return Promise.resolve(response.guild_config);
  }

  /**
   * UpdateGuildConfig() - Updates guild config of given guild_id with given new data
   * @param guild_id - guild_id of guild config to update
   * @param new_config - guild config data to update database entry with
   */
  async UpdateGuildConfig(guild_id: string, new_config: DatabaseEntry["guild_config"]): Promise<void> {
    const fetch_guild_config_profiler = this.log_.profile(`Update guild config for {guild_id:${guild_id}}`);
    this.log_.debug(`Updating guild config for {guild_id:${guild_id}}`);

    try {
      const query = { guild_id };
      const options = {
        $set: {
          guild_config: new_config
        }
      };
      await this.collection_.updateOne(query, options);
    } catch (error) {
      this.log_.error(`Failed to update guild config for {guild_id:${guild_id}}`, error);
      fetch_guild_config_profiler.stop({ success: false, level: "error" });
      return Promise.reject();
    }

    this.log_.debug(`Successfully updated guild config for {guild_id:${guild_id}}`);
    fetch_guild_config_profiler.stop();
    return Promise.resolve();
  }

  /**
   * FetchAudioProcessingConfig() - Fetches audio processing config of given guild_id
   * @param guild_id - guild_id of audio processing config to fetch
   */
  async FetchAudioProcessingConfig(guild_id: string): Promise<DatabaseEntry["audio_processing_config"]> {
    const fetch_audio_processing_config_profiler = this.log_.profile(`Fetch audio processing config for {guild_id:${guild_id}}`);
    this.log_.debug(`Fetching audio processing config for {guild_id:${guild_id}}`);

    let response;
    try {
      const query = { guild_id };
      const options = { projection: { _id: 0, audio_processing_config: 1 } };
      response = await this.collection_.findOne(query, options);
    } catch (error) {
      this.log_.error(`Failed fetching audio processing config for {guild_id:${guild_id}}`, error);
      fetch_audio_processing_config_profiler.stop({ success: false, level: "error" });
      return Promise.reject();
    }

    this.log_.debug(`Successfully fetched audio processing config for {guild_id:${guild_id}}`);
    fetch_audio_processing_config_profiler.stop();
    return Promise.resolve(response.audio_processing_config);
  }

  /**
   * UpdateAudioProcessingConfig() - Updates audio processing config of given guild_id with given new data
   * @param guild_id - guild_id of audio processing config to update
   * @param new_config - audio processing config data to update database entry with
   */
  async UpdateAudioProcessingConfig(guild_id: string, new_config: DatabaseEntry["audio_processing_config"]): Promise<void> {
    const fetch_guild_config_profiler = this.log_.profile(`Update audio processing config for {guild_id:${guild_id}}`);
    this.log_.debug(`Updating audio processing config for {guild_id:${guild_id}}`);

    try {
      const query = { guild_id };
      const options = {
        $set: {
          audio_processing_config: new_config
        }
      };
      await this.collection_.updateOne(query, options);
    } catch (error) {
      this.log_.error(`Failed to update audio processing config for {guild_id:${guild_id}}`, error);
      fetch_guild_config_profiler.stop({ success: false, level: "error" });
      return Promise.reject();
    }

    this.log_.debug(`Successfully updated audio processing config for {guild_id:${guild_id}}`);
    fetch_guild_config_profiler.stop();
    return Promise.resolve();
  }

  /**
   * FetchPermissionsConfig() - Fetches permissions config of given guild_id
   * @param guild_id - guild_id of guild config to fetch
   */
  async FetchPermissionsConfig(guild_id: string): Promise<DatabaseEntry["permissions_config"]> {
    const fetch_permissions_config_profiler = this.log_.profile(`Fetch permissions config for {guild_id:${guild_id}}`);
    this.log_.debug(`Fetching permissions config for {guild_id:${guild_id}}`);

    let response;
    try {
      const query = { guild_id };
      const options = { projection: { _id: 0, permissions_config: 1 } };
      response = await this.collection_.findOne(query, options);
    } catch (error) {
      this.log_.error(`Failed fetching permissions config for {guild_id:${guild_id}}`, error);
      fetch_permissions_config_profiler.stop({ success: false, level: "error" });
      return Promise.reject();
    }

    this.log_.debug(`Successfully fetched permissions config for {guild_id:${guild_id}}`);
    fetch_permissions_config_profiler.stop();
    return Promise.resolve(response.permissions_config);
  }

  /**
   * UpdatePermissionsConfig() - Updates permissions config of given guild_id with given new data
   * @param guild_id - guild_id of permissions config to update
   * @param new_config - permissions config data to update database entry with
   */
  async UpdatePermissionsConfig(guild_id: string, new_config: DatabaseEntry["permissions_config"]): Promise<void> {
    const fetch_guild_config_profiler = this.log_.profile(`Update permissions config for {guild_id:${guild_id}}`);
    this.log_.debug(`Updating permissions config for {guild_id:${guild_id}}`);

    try {
      const query = { guild_id };
      const options = {
        $set: {
          permissions_config: new_config
        }
      };
      await this.collection_.updateOne(query, options);
    } catch (error) {
      this.log_.error(`Failed to update permissions config for {guild_id:${guild_id}}`, error);
      fetch_guild_config_profiler.stop({ success: false, level: "error" });
      return Promise.reject();
    }

    this.log_.debug(`Successfully updated permissions config for {guild_id:${guild_id}}`);
    fetch_guild_config_profiler.stop();
    return Promise.resolve();
  }
}

export enum FunctionType {
  NewGuild,
  DeleteGuild,

  FetchGuildConfig,
  UpdateGuildConfig,

  FetchAudioProcessingConfig,
  UpdateAudioProcessingConfig,

  FetchPermissionsConfig,
  UpdatePermissionsConfig
}

export type FunctionRequest = {
  uid: string;
  function_type: FunctionType;
  args: Array<any>;
};
export type FunctionResponse = {
  success: boolean;
  error?: Error;
  result: any;
}

const logger = new Logger("database_handler");
const database_handler = new DatabaseHandler(logger);

ipc.config.silent = true;
ipc.config.rawBuffer = false;
ipc.config.appspace = MIKU_CONSTS.APP_NAMESPACE;
ipc.config.id = MIKU_CONSTS.DATABASE_HANDLER_IPC_ID;

logger.debug(`Starting ipc server for database handler in {namespace:${MIKU_CONSTS.APP_NAMESPACE}} and {id:${MIKU_CONSTS.DATABASE_HANDLER_IPC_ID}}`);
ipc.serve(() => {
  ipc.server.on("error", (error) => {
    logger.error("Error on ipc server", error);
  });

  ipc.server.on("socket.disconnected", (socket, destroyed_socket_id) => {
    logger.warn(`IPC socket with {id:${destroyed_socket_id}} disconnected`);
  });

  ipc.server.on("message", async (data: FunctionRequest, socket) => {
    switch (data.function_type) {
      case (FunctionType.NewGuild): {
        let result;
        try {
          result = await database_handler.NewGuild(data.args[0]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      case (FunctionType.DeleteGuild): {
        let result;
        try {
          result = await database_handler.DeleteGuild(data.args[0]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      case (FunctionType.FetchGuildConfig): {
        let result;
        try {
          result = await database_handler.FetchGuildConfig(data.args[0]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      case (FunctionType.UpdateGuildConfig): {
        let result;
        try {
          result = await database_handler.UpdateGuildConfig(data.args[0], data.args[1]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      case (FunctionType.FetchAudioProcessingConfig): {
        let result;
        try {
          result = await database_handler.FetchAudioProcessingConfig(data.args[0]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      case (FunctionType.UpdateAudioProcessingConfig): {
        let result;
        try {
          result = await database_handler.UpdateAudioProcessingConfig(data.args[0], data.args[1]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      case (FunctionType.FetchPermissionsConfig): {
        let result;
        try {
          result = await database_handler.FetchPermissionsConfig(data.args[0]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      case (FunctionType.UpdatePermissionsConfig): {
        let result;
        try {
          result = await database_handler.UpdatePermissionsConfig(data.args[0], data.args[1]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      default: {
        const error = new Error("Database Handler Interface Error: function type invalid");
        ipc.server.emit(socket, data.uid, { success: false, error });
      }
    }
  });

  ipc_ready = true;
  if (db_ready) process.send("ready");
});

ipc.server.start();