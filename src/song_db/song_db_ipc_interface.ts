import { ipc_config } from '../constants/constants';
import Logger from '../logger/logger';

import IPCInterface from '../ipc_template/ipc_interface';
import { CacheInfo, SongDBFunctions, SongInfo } from './song_db';

/**
 * SongDBInterface - Connects to a SongDB component running as a seperate thread
 */
export default class SongDBInterface extends IPCInterface<SongDBFunctions> {
  constructor(logger: Logger) {
    super(ipc_config.song_db_ipc_id, logger);
  }

  /**
   * getCacheInfo() - Gets cache information about a song
   * @param song_uid - song uid of song to get info of
   * @returns - object containing cache information about the song
   */
  async getCacheInfo(song_uid: string): Promise<CacheInfo> {
    return await this.RequestFunction(SongDBFunctions.getCacheInfo, [song_uid]);
  }

  /**
   * getSongInfo() - Gets link, thumbnail, title, artist, and duration of a song
   * @param song_uid - song uid of song to get info of
   * @returns - object containing link, thumbnail, title, artist, and duration of song
   */
  async getSongInfo(song_uid: string): Promise<SongInfo> {
    return this.RequestFunction(SongDBFunctions.getSongInfo, [song_uid]);
  }

  /**
   * addSong() - Adds a song to database (ignores if song is already in database)
   * @param song_uid - song uid of song to add
   * @param cache_location - cache location of song to add
   */
  async addSong(song_uid: string, cache_location: string): Promise<void> {
    return await this.RequestFunction(SongDBFunctions.addSong, [song_uid, cache_location]);
  }

  /**
   * cacheSong() - Update database so that song is cached
   * @param song_uid - song uid of song to uncache
   * @param cache_location - cache location of song to add
   */
  async cacheSong(song_uid: string): Promise<void> {
    await this.RequestFunction(SongDBFunctions.cacheSong, [song_uid]);
  }

  /**
   * uncacheSong() - Update database so that song is no longer cached
   * @param song_uid - song uid of song to uncache
   */
  async uncacheSong(song_uid: string): Promise<void> {
    await this.RequestFunction(SongDBFunctions.uncacheSong, [song_uid]);
  }

  /**
   * setStartChunk() - Sets the start_chunk of song
   * @param song_uid - song uid of song to update
   * @param start_chunk
   */
  async setStartChunk(song_uid: string, start_chunk: number): Promise<void> {
    await this.RequestFunction(SongDBFunctions.setStartChunk, [song_uid, start_chunk]);
  }

  /**
   * setEndChunk() - Sets the end_chunk of song
   * @param song_uid - song uid of song to update
   * @param end_chunk
   */
  async setEndChunk(song_uid: string, end_chunk: number): Promise<void> {
    await this.RequestFunction(SongDBFunctions.setEndChunk, [song_uid, end_chunk]);
  }

  /**
   * setSizeBytes() - Sets the size_bytes of song
   * @param song_uid - song uid of song to update
   * @param size_bytes
   */
  async setSizeBytes(song_uid: string, size_bytes: number): Promise<void> {
    await this.RequestFunction(SongDBFunctions.setSizeBytes, [song_uid, size_bytes]);
  }

  /**
   * incrementPlaybacks() - Increments the playbacks of song by 1
   * @param song_uid - song uid of song to update
   */
  async incrementPlaybacks(song_uid: string): Promise<void> {
    await this.RequestFunction(SongDBFunctions.incrementPlaybacks, [song_uid]);
  }

  /**
   * setLink() - Sets the song's link
   * @param song_uid - song uid of song to update
   * @param link - link to update song with
   */
  async setLink(song_uid: string, link: string): Promise<void> {
    await this.RequestFunction(SongDBFunctions.setLink, [song_uid, link]);
  }

  /**
   * setThumbnailUrl() - Sets the thumbnail_url of song
   * @param song_uid - song uid of song to update
   * @param thumbnail_url
   */
  async setThumbnailUrl(song_uid: string, thumbnail_url: string): Promise<void> {
    await this.RequestFunction(SongDBFunctions.setThumbnailUrl, [song_uid, thumbnail_url]);
  }

  /**
   * setTitle() - Sets the title of song
   * @param song_uid - song uid of song to update
   * @param title
   */
  async setTitle(song_uid: string, title: string): Promise<void> {
    await this.RequestFunction(SongDBFunctions.setTitle, [song_uid, title]);
  }

  /**
   * setArtist() - Sets the artist of song
   * @param song_uid - song uid of song to update
   * @param artist
   */
  async setArtist(song_uid: string, artist: string): Promise<void> {
    await this.RequestFunction(SongDBFunctions.setArtist, [song_uid, artist]);
  }

  /**
   * setDuration() - Sets the duration of song
   * @param song_uid - song uid of song to update
   * @param duration
   */
  async setDuration(song_uid: string, duration: number): Promise<void> {
    await this.RequestFunction(SongDBFunctions.setDuration, [song_uid, duration]);
  }

  /**
   * addLock() - Adds a delete lock to song
   * @param song_uid - song uid of song to lock
   * @returns - unique lock_id
   */
  async addLock(song_uid: string): Promise<string> {
    return await this.RequestFunction(SongDBFunctions.addLock, [song_uid]);
  }

  /**
   * removeLock() - Removes a delete lock to song
   * @param lock_id - song uid of song to remove lock from
   */
  async removeLock(lock_id: string): Promise<void> {
    await this.RequestFunction(SongDBFunctions.removeLock, [lock_id]);
  }

  /**
   * isLocked() - Checks if a given song_uid is locked or not
   * @param song_uid - song uid of song to check status of
   * @returns - if song is locked or not
   */
  async isLocked(song_uid: string): Promise<boolean> {
    return await this.RequestFunction(SongDBFunctions.isLocked, [song_uid]);
  }

  /**
   * bestToRemove() - Returns the cache info of the song that is best to be removed based on what song has the maximum (size in cache / # of playbacks)
   * @returns - song that is best to be removed in cache or void if no songs are unlocked
   */
  async bestToRemove(): Promise<CacheInfo | {}> {
    return await this.RequestFunction(SongDBFunctions.bestToRemove, []);
  }

  /**
   * close() - releases lock on database after finishing all queued operations
   * @returns Promise resolving to nothing (rejected if an error occurs)
   */
  async close(): Promise<void> {
    await this.RequestFunction(SongDBFunctions.close, []);
    this.disconnect();
  }
}
