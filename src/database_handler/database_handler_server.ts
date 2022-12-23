import ipc from "node-ipc";
import MIKU_CONSTS from "../constants";

import Logger from "../logger";
import DatabaseHandler, { FunctionRequest, FunctionType } from "./database_handler";
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
          ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
        } catch (error) {
          ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
        }
        break;
      }
      case (FunctionType.DeleteGuild): {
        let result;
        try {
          result = await database_handler.DeleteGuild(data.args[0]);
          ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
        } catch (error) {
          ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
        }
        break;
      }
      case (FunctionType.FetchGuildConfig): {
        let result;
        try {
          result = await database_handler.FetchGuildConfig(data.args[0]);
          ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
        } catch (error) {
          ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
        }
        break;
      }
      case (FunctionType.UpdateGuildConfig): {
        let result;
        try {
          result = await database_handler.UpdateGuildConfig(data.args[0], data.args[1]);
          ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
        } catch (error) {
          ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
        }
        break;
      }
      case (FunctionType.FetchAudioProcessingConfig): {
        let result;
        try {
          result = await database_handler.FetchAudioProcessingConfig(data.args[0]);
          ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
        } catch (error) {
          ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
        }
        break;
      }
      case (FunctionType.UpdateAudioProcessingConfig): {
        let result;
        try {
          result = await database_handler.UpdateAudioProcessingConfig(data.args[0], data.args[1]);
          ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
        } catch (error) {
          ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
        }
        break;
      }
      case (FunctionType.FetchPermissionsConfig): {
        let result;
        try {
          result = await database_handler.FetchPermissionsConfig(data.args[0]);
          ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
        } catch (error) {
          ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
        }
        break;
      }
      case (FunctionType.UpdatePermissionsConfig): {
        let result;
        try {
          result = await database_handler.UpdatePermissionsConfig(data.args[0], data.args[1]);
          ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
        } catch (error) {
          ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
        }
        break;
      }
      default: {
        const error = new Error("Database Handler Interface Error: function type invalid");
        ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
      }
    }
  });

  process.send("ready");
});

database_handler.events.once("ready", () => {
  ipc.server.start();
});
