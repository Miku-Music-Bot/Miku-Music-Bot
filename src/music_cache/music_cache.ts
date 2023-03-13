import Logger from '../logger/logger';

export enum MusicCacheFunctions {
  cache,
  cacheLocation,
  releaseLock,
}

/**
 * MusicCache - Manages the downloaded music in a cache on the disk limited to a given size
 * Lifecycle of a song:
 * - Call cache() to begin download of song to cache (or keep song in cache if already cached)
 * - Call cacheLocation() to get the location of the cached song
 * - Call releaseLock() to release the playback lock on the song so that it may be deleted if space is needed
 */
export default class MusicCache {
  constructor(logger: Logger) {
    //
  }

  /**
   * cache() - Caches a song in the music cache
   * @param url - url of song to cache
   * @returns - cache lock_id for the song (must be unlocked after song has been played)
   */
  cache(url: string): Promise<number> {
    return;
  }

  /**
   * cacheLocation() - Fetches the cache location information of a song
   * @param url - url of song to fetch cache location of
   * @returns - object containing cache location information
   */
  cacheLocation(url: string): { uid: string; loc: string; end_chunk: number } {
    return { uid: '', loc: '', end_chunk: 0 };
  }

  /**
   * releaseLock() - Release the lock on a song
   * @param lock_id - cache lock_id for the song (recieved from cache() function)
   * @returns - Promise that resolves once lock has been successfully released
   */
  releaseLock(lock_id: number): Promise<void> {
    return;
  }
}
