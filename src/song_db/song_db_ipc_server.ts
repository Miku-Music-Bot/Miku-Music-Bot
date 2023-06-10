import ipc from 'node-ipc';

import { ipc_config } from '../constants/constants';
import StartIPCServer from '../ipc_template/ipc_server';

import Logger from '../logger/logger';
import SongDB, { SongDBFunctions } from './song_db';

/**
 * StartSongDBComponent() - Creates song_db and starts ipc server
 */
export function StartSongDBComponent(): typeof ipc {
  const logger = new Logger(ipc_config.song_db_ipc_id);
  const song_db = new SongDB(logger);

  return StartIPCServer<SongDBFunctions>(ipc_config.song_db_ipc_id, logger, song_db.ready, async (function_name, args) => {
    switch (function_name) {
      case SongDBFunctions.getCacheInfo: {
        return song_db.getCacheInfo(args[0]);
      }
      case SongDBFunctions.getSongInfo: {
        return song_db.getSongInfo(args[0]);
      }
      case SongDBFunctions.addSong: {
        await song_db.addSong(args[0], args[1]);
        return '';
      }
      case SongDBFunctions.cacheSong: {
        await song_db.cacheSong(args[0]);
        return '';
      }
      case SongDBFunctions.uncacheSong: {
        await song_db.uncacheSong(args[0]);
        return '';
      }
      case SongDBFunctions.setStartChunk: {
        await song_db.setStartChunk(args[0], args[1]);
        return '';
      }
      case SongDBFunctions.setEndChunk: {
        await song_db.setEndChunk(args[0], args[1]);
        return '';
      }
      case SongDBFunctions.setSizeBytes: {
        await song_db.setSizeBytes(args[0], args[1]);
        return '';
      }
      case SongDBFunctions.incrementPlaybacks: {
        await song_db.incrementPlaybacks(args[0]);
        return '';
      }
      case SongDBFunctions.setLink: {
        await song_db.setLink(args[0], args[1]);
        return '';
      }
      case SongDBFunctions.setThumbnailUrl: {
        await song_db.setThumbnailUrl(args[0], args[1]);
        return '';
      }
      case SongDBFunctions.setTitle: {
        await song_db.setTitle(args[0], args[1]);
        return '';
      }
      case SongDBFunctions.setArtist: {
        await song_db.setArtist(args[0], args[1]);
        return '';
      }
      case SongDBFunctions.setDuration: {
        await song_db.setDuration(args[0], args[1]);
        return '';
      }
      case SongDBFunctions.addLock: {
        return song_db.addLock(args[0]);
      }
      case SongDBFunctions.removeLock: {
        await song_db.removeLock(args[0]);
        return '';
      }
      case SongDBFunctions.isLocked: {
        return song_db.isLocked(args[0]);
      }
      case SongDBFunctions.bestToRemove: {
        return song_db.bestToRemove();
      }
      case SongDBFunctions.close: {
        await song_db.close();
        return '';
      }
    }
  });
}

// only start component if 'start-component' argument is passed in
export function CheckStartComponent() {
  process.argv.forEach((arg) => {
    if (arg === 'start-component') StartSongDBComponent();
  });
}
CheckStartComponent();
