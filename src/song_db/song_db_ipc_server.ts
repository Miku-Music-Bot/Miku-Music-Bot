import MIKU_CONSTS from "../constants";
import StartIPCServer from "../ipc_template/ipc_server";
import { FunctionRequest } from "../ipc_template/ipc_types";
import Logger from "../logger/logger";
import SongDB, { SongDBFunctions } from "./song_db";

const logger = new Logger(MIKU_CONSTS.ipc_config.song_db_ipc_id);
const song_db = new SongDB(logger);

StartIPCServer(
  MIKU_CONSTS.ipc_config.song_db_ipc_id,
  async (data: FunctionRequest<SongDBFunctions>) => {
    switch (data.function_type) {
      case (SongDBFunctions.addSong): {
        await song_db.addSong(data.args[0], data.args[1], data.args[2]);
        return "";
      }
    }
  },
  logger,
  song_db.ready
);
