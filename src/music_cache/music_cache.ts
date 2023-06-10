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
   */
  constructor(logger: Logger) {
    this.log_ = logger;
  }

  /**
   * createCacheDir() - Creates a cache directory for song
   * @param song_uid - song_uid to create cache directory for
   * @returns - path of directory created
   */
  private async createCacheDir(song_uid: string): Promise<string> {
    const cache_loc = path.join(this.cache_dir_, song_uid.split('$')[0], song_uid.split('$')[1]);
    try {
      await fs.promises.mkdir(cache_loc, { recursive: true });
    } catch (error) {
      this.log_.fatal(`Failed to create directory for song with {song_uid:${song_uid}} at {location:${cache_loc}}`, error);
      throw new Error('Failed to create directory in cache location');
    }
    return cache_loc;
  }

  /**
   * downloadSong() - Downloads a given song
   * @param link - link of song to download
   */
  private async downloadSong(link: string) {
    //
  }

  /**
   * cache() - Caches a song in the music cache
   * @param url - url of song to cache
   * @returns - cache lock_id for the song (must be unlocked after song has been played)
   */
  async cache(url: string): Promise<string> {
    const { link, song_uid, type } = this.parseURL_(url);

    if (type === DownloaderTypes.Unknown) {
      this.log_.error(`Unknown downloader type for {url:${url}}`);
      throw new Error('Unsupported URL');
    }

    const cache_loc = await this.createCacheDir(song_uid);
    await this.db_.cacheSong(song_uid);
    await this.db_.setLink(song_uid, link);
    return await this.db_.addLock(song_uid);
  }

  /**
   * cacheLocation() - Fetches the cache location information of a song and increments playbacks
   * @param url - url of song to fetch cache location of
   * @returns - object containing cache location information
   */
  async cacheLocation(
    url: string
  ): Promise<{ song_uid: string; cache_location: string; start_chunk: number; end_chunk: number }> {
    const { song_uid } = this.parseURL_(url);

    const { cache_location, start_chunk, end_chunk } = await this.db_.getCacheInfo(song_uid);
    await this.db_.incrementPlaybacks(song_uid);

    return { song_uid, cache_location, start_chunk, end_chunk };
  }

  /**
   * releaseLock() - Release the lock on a song
   * @param lock_id - cache lock_id for the song (recieved from cache() function)
   * @returns - Promise that resolves once lock has been successfully released
   */
  async releaseLock(lock_id: string): Promise<void> {
    return await this.db_.removeLock(lock_id);
  }
}
