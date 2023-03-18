import { ipc_config } from '../constants/constants';
import Logger from '../logger/logger';

import StartIPCServer from '../ipc_template/ipc_server';
import MusicCache, { MusicCacheFunctions } from './music_cache';

const logger = new Logger(ipc_config.music_ipc_id);
const music_cache = new MusicCache(logger);

StartIPCServer<MusicCacheFunctions>(ipc_config.music_ipc_id, logger, Promise.resolve(), async (function_name, args) => {
  switch (function_name) {
    case MusicCacheFunctions.cache: {
      music_cache.cache(args[0]);
      return '';
    }
    case MusicCacheFunctions.cacheLocation: {
      return music_cache.cacheLocation(args[0]);
    }
    case MusicCacheFunctions.releaseLock: {
      await music_cache.releaseLock(args[0]);
      return '';
    }
  }
});
