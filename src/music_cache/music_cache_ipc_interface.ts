import { ipc_config } from '../constants/constants';
import Logger from '../logger/logger';

import IPCInterface from '../ipc_template/ipc_interface';
import { MusicCacheFunctions } from './music_cache';

export default class MusicCacheInterface extends IPCInterface<MusicCacheFunctions> {
  constructor(logger: Logger) {
    super(ipc_config.music_ipc_id, logger);
  }

  async cache(url: string): Promise<void> {
    await this.RequestFunction(MusicCacheFunctions.cache, [url]);
  }

  async cacheLocation(url: string): Promise<{ uid: string; loc: string; end_chunk: number }> {
    return JSON.parse(await this.RequestFunction(MusicCacheFunctions.cacheLocation, [url]));
  }
}
