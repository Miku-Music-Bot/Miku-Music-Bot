import path from 'path';
import fs from 'fs-extra';

import { MusicCacheConfig } from '../constants/constants';
import Logger from '../logger/logger';
import { DownloaderTypes } from './downloaders/parse_url';
import DownloaderInterface from './downloaders/downloader_interface';
import SongDBInterface from '../song_db/song_db_ipc_interface';
import SongDB from '../song_db/song_db';

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
  private log_: Logger;
  private max_size_bytes_: number;
  private cache_dir_: string;

  private db_: SongDBInterface | SongDB;

  private parseURL_: (url: string) => { link: string; song_uid: string; type: DownloaderTypes };
  private createDownloader_: (type: DownloaderTypes) => DownloaderInterface;

  /**
   * @param logger - logger
   * @param config - MusicCache configuration
   * @param parseURL - function to parse a given url to determine its song_uid and downloader type
   * @param createDownloader - creates the correct downloader given downloader type
   */
  constructor(logger: Logger) {
    this.log_ = logger;
  }

  /**
   * cache() - Caches a song in the music cache
   * @param url - url of song to cache
   * @returns - cache lock_id for the song (must be unlocked after song has been played)
   */
  async cache(url: string): Promise<number> {
    const { link, song_uid } = this.parseURL_(url);

    const cache_loc = path.join(this.cache_dir_, song_uid.split('$')[0], song_uid.split('$')[1]);

    try {
      await fs.promises.mkdir(cache_loc, { recursive: true });
    } catch (error) {
      this.log_.fatal(`Failed to create directory for song with {url:${url}} at {location:${cache_loc}}`, error);
      throw new Error('Failed to create directory in cache location');
    }
    await this.db_.cacheSong(song_uid, cache_loc);
    await this.db_.setLink(song_uid, link);
    return await this.db_.addLock(song_uid);
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
    return Promise.resolve();
  }
}
