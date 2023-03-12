import ipc from 'node-ipc';

import { ipc_config, SongDBConfig, songdb_config } from '../constants/constants';
import StartIPCServer from '../ipc_template/ipc_server';
import { FunctionRequest } from '../ipc_template/ipc_types';
import Logger from '../logger/logger';
import SongDB, { SongDBFunctions } from './song_db';

/**
 * StartSongDBComponent() - Creates song_db and starts ipc server
 * @param config - Config object for song db
 */
export default function StartSongDBComponent(logger: Logger, config: SongDBConfig): typeof ipc {
  const song_db = new SongDB(logger, config);

  return StartIPCServer(ipc_config.song_db_ipc_id, logger, song_db.ready, async (data: FunctionRequest<SongDBFunctions>) => {
    switch (data.function_type) {
      case SongDBFunctions.getCacheInfo: {
        return JSON.stringify(await song_db.getCacheInfo(data.args[0]));
      }
      case SongDBFunctions.getSongInfo: {
        return JSON.stringify(await song_db.getSongInfo(data.args[0]));
      }
      case SongDBFunctions.cacheSong: {
        await song_db.cacheSong(data.args[0], data.args[1]);
        return '';
      }
      case SongDBFunctions.uncacheSong: {
        await song_db.uncacheSong(data.args[0]);
        return '';
      }
      case SongDBFunctions.setStartChunk: {
        await song_db.setStartChunk(data.args[0], parseInt(data.args[1]));
        return '';
      }
      case SongDBFunctions.setEndChunk: {
        await song_db.setEndChunk(data.args[0], parseInt(data.args[1]));
        return '';
      }
      case SongDBFunctions.setSizeBytes: {
        await song_db.setSizeBytes(data.args[0], parseInt(data.args[1]));
        return '';
      }
      case SongDBFunctions.incrementPlaybacks: {
        await song_db.incrementPlaybacks(data.args[0]);
        return '';
      }
      case SongDBFunctions.setLink: {
        await song_db.setLink(data.args[0], data.args[1]);
        return '';
      }
      case SongDBFunctions.setThumbnailUrl: {
        await song_db.setThumbnailUrl(data.args[0], data.args[1]);
        return '';
      }
      case SongDBFunctions.setTitle: {
        await song_db.setTitle(data.args[0], data.args[1]);
        return '';
      }
      case SongDBFunctions.setArtist: {
        await song_db.setArtist(data.args[0], data.args[1]);
        return '';
      }
      case SongDBFunctions.setDuration: {
        await song_db.setDuration(data.args[0], parseInt(data.args[1]));
        return '';
      }
      case SongDBFunctions.addLock: {
        return (await song_db.addLock(data.args[0])).toString();
      }
      case SongDBFunctions.removeLock: {
        await song_db.removeLock(parseInt(data.args[0]));
        return '';
      }
      case SongDBFunctions.isLocked: {
        return JSON.stringify(await song_db.isLocked(data.args[0]));
      }
      case SongDBFunctions.close: {
        await song_db.close();
        return '';
      }
    }
  });
}

// only start component if 'start-component' argument is passed in
process.argv.forEach((arg) => {
  if (arg === 'start-component') StartSongDBComponent(new Logger(ipc_config.song_db_ipc_id), songdb_config);
});
