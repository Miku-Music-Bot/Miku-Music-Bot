import MIKU_CONSTS from "../constants";
import Logger from "../logger/logger";

import StartIPCServer from "../ipc_template/ipc_server";
import { FunctionRequest } from "../ipc_template/ipc_types";
import MusicCache, { MusicCacheFunctions } from "./music_cache";

const logger = new Logger(MIKU_CONSTS.ipc_config.music_ipc_id);
const music_cache = new MusicCache(logger);

StartIPCServer(
  MIKU_CONSTS.ipc_config.music_ipc_id,
  async (data: FunctionRequest<MusicCacheFunctions>) => {
    switch (data.function_type) {
      case (MusicCacheFunctions.cache): {
        music_cache.cache(data.args[0]);
        return "";
      }
      case (MusicCacheFunctions.cacheLocation): {
        return JSON.stringify(music_cache.cacheLocation(data.args[0]));
      }
    }
  },
  logger
);
