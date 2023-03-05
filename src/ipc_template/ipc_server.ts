import ipc from "node-ipc";

import MIKU_CONSTS from "../constants";
import Logger from "../logger/logger";
import { FunctionRequest } from "./ipc_types";

export default function StartIPCServer<FunctionNames>(
  ipc_id: string,
  run_function: (data: FunctionRequest<FunctionNames>) => Promise<string>,
  logger: Logger
) {
  ipc.config.silent = MIKU_CONSTS.ipc_config.silent;
  ipc.config.rawBuffer = MIKU_CONSTS.ipc_config.rawBuffer;
  ipc.config.appspace = MIKU_CONSTS.ipc_config.app_namespace;
  ipc.config.id = ipc_id;

  logger.debug(`Starting ipc server in {namespace:${MIKU_CONSTS.ipc_config.app_namespace}} and {id:${ipc_id}}`);
  ipc.serve(() => {
    ipc.server.on("error", (error) => {
      logger.error("Error on ipc server", error);
    });

    ipc.server.on("socket.disconnected", (socket, destroyed_socket_id) => {
      logger.warn(`IPC socket with {id:${destroyed_socket_id}} disconnected`);
    });

    ipc.server.on("message", async (data: FunctionRequest<FunctionNames>, socket) => {
      try {
        const result = await run_function(data);
        ipc.server.emit(socket, "message", { uid: data.uid, success: true, result });
      } catch (error) {
        ipc.server.emit(socket, "message", { uid: data.uid, success: false, error: error.message });
      }
    });

    process.send("ready");
  });

  ipc.server.start();
}