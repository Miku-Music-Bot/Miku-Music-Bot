import ipc from "node-ipc";

import MIKU_CONSTS from "../constants";
import Logger from "../logger";
import AudioDownloader, { FunctionType, FunctionRequest } from "./audio_downloader";

const logger = new Logger("audio_downloader");
const audio_downloader = new AudioDownloader(logger);

ipc.config.silent = true;
ipc.config.rawBuffer = false;
ipc.config.appspace = MIKU_CONSTS.APP_NAMESPACE;
ipc.config.id = MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID;

logger.debug(`Starting ipc server for audio downloader in {namespace:${MIKU_CONSTS.APP_NAMESPACE}} and {id:${MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID}}`);
ipc.serve(() => {
  ipc.server.on("error", (error) => {
    logger.error("Error on ipc server", error);
  });

  ipc.server.on("socket.disconnected", (socket, destroyed_socket_id) => {
    logger.warn(`IPC socket with {id:${destroyed_socket_id}} disconnected`);
  });

  ipc.server.on("message", async (data: FunctionRequest, socket) => {
    switch (data.function_type) {
      case (FunctionType.QueueSource): {
        let result;
        try {
          result = audio_downloader.QueueSource(data.args[0]);
          ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
        } catch (error) {
          ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
        }
        break;
      }
      case (FunctionType.GetCacheLocation): {
        let result;
        try {
          result = await audio_downloader.GetCacheLocation(data.args[0]);
          ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
        } catch (error) {
          ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
        }
        break;
      }
      default: {
        const error = new Error("Audio Downloader Interface Error: function type invalid");
        ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
      }
    }
  });

  process.send("ready");
});

ipc.server.start();