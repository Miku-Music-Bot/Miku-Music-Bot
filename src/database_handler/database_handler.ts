import ipc from "node-ipc";
import { MongoClient, Collection } from "mongodb";

import MIKU_CONSTS from "../constants";
import Logger from "../logger";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE_NAME = process.env.MONGODB_DATABASE_NAME;
const MONGODB_COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME;
class DatabaseHandler {
  private ready_ = false;
  private client_: MongoClient;
  private collection_: Collection;

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
      return;
    }

    const db = this.client_.db(MONGODB_DATABASE_NAME);
    this.collection_ = db.collection(MONGODB_COLLECTION_NAME);
    this.ready_ = true;
    this.log_.debug(`Connected to mongodb with {database_name:${MONGODB_DATABASE_NAME}} and {collection_name:${MONGODB_COLLECTION_NAME}}`);
    connection_profiler.stop({ conditional_level: { warn: 3000, error: 10000 } });
  }

  /**
   * NewGuild() - Creates a new guild database entry (assumes guild entry does not yet exist)
   * @param guild_id - guild_id of new guild to create
   */
  async NewGuild(guild_id: string): Promise<void> {
    //
  }


}

export enum FunctionType { NewGuild }
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

logger.debug(`Starting ipc server for audio downloader in {namespace:${MIKU_CONSTS.APP_NAMESPACE}} and {id:${MIKU_CONSTS.DATABASE_HANDLER_IPC_ID}}`);
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
          result = database_handler.NewGuild(data.args[0]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      default: {
        const error = new Error("Audio Downloader Interface Error: function type invalid");
        ipc.server.emit(socket, data.uid, { success: false, error });
      }
    }
  });
});

ipc.server.start();