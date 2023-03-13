import { ipc_config } from '../constants/constants';
import Logger from '../logger/logger';

import IPCInterface from '../ipc_template/ipc_interface';
import { MusicCacheFunctions } from './music_cache';

/**
 * MusicCacheInterface - Connects to a MusicCacheInterface component running as a seperate thread
 */
export default class MusicCacheInterface extends IPCInterface<MusicCacheFunctions> {
  constructor(logger: Logger) {
    super(ipc_config.music_ipc_id, logger);
  }

  /**
   * cache() - Caches a song in the music cache
   * @param url - url of song to cache
   * @returns - cache lock_id for the song (must be unlocked after song has been played)
   */
  async cache(url: string): Promise<number> {
    return parseInt(await this.RequestFunction(MusicCacheFunctions.cache, [url]));
  }

  /**
   * cacheLocation() - Fetches the cache location information of a song
   * @param url - url of song to fetch cache location of
   * @returns - object containing cache location information
   */
  async cacheLocation(url: string): Promise<{ cache_location: string; start_chunk: number; end_chunk: number }> {
    return JSON.parse(await this.RequestFunction(MusicCacheFunctions.cacheLocation, [url]));
  }

  /**
   * releaseLock() - Release the lock on a song
   * @param lock_id - cache lock_id for the song (recieved from cache() function)
   * @returns - Promise that resolves once lock has been successfully released
   */
  async releaseLock(lock_id: number): Promise<void> {
    await this.RequestFunction(MusicCacheFunctions.releaseLock, [lock_id.toString()]);
  }
}
