import { ipc_config } from '../constants/constants';
import Logger from '../logger/logger';

import IPCInterface from '../ipc_template/ipc_interface';
import { SongDBFunctions } from './song_db';

export default class SongDBInterface extends IPCInterface<SongDBFunctions> {
  constructor(logger: Logger) {
    super(ipc_config.song_db_ipc_id, logger);
  }

  /**
   * getCacheInfo() - Gets cache information about a song
   * @param song_uid - song uid of song to get info of
   * @returns - object containing cache information about the song
   */
  async getCacheInfo(song_uid: string): Promise<{
    cached: boolean;
    cache_location: string;
    start_chunk: number;
    end_chunk: number;
    size_bytes: number;
    playbacks: number;
  }> {
    return JSON.parse(await this.RequestFunction(SongDBFunctions.getCacheInfo, [song_uid]));
  }

  /**
   * getSongInfo() - Gets link, thumbnail, title, artist, and duration of a song
   * @param song_uid - song uid of song to get info of
   * @returns - object containing link, thumbnail, title, artist, and duration of song
   */
  async getSongInfo(song_uid: string): Promise<{
    link: string;
    thumbnail_url: string;
    title: string;
    artist: string;
    duration: number;
  }> {
    return JSON.parse(await this.RequestFunction(SongDBFunctions.getSongInfo, [song_uid]));
  }

  /**
   * cacheSong() - Update database so that song is cached
   * @param song_uid - song uid of song to uncache
   * @param cache_location - cache location of song to add
   */
  async cacheSong(song_uid: string, cache_location: string): Promise<void> {
    await this.RequestFunction(SongDBFunctions.cacheSong, [song_uid, cache_location]);
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
    await this.RequestFunction(SongDBFunctions.setStartChunk, [song_uid, start_chunk.toString()]);
  }

  /**
   * setEndChunk() - Sets the end_chunk of song
   * @param song_uid - song uid of song to update
   * @param end_chunk
   */
  async setEndChunk(song_uid: string, end_chunk: number): Promise<void> {
    await this.RequestFunction(SongDBFunctions.setEndChunk, [song_uid, end_chunk.toString()]);
  }

  /**
   * setSizeBytes() - Sets the size_bytes of song
   * @param song_uid - song uid of song to update
   * @param size_bytes
   */
  async setSizeBytes(song_uid: string, size_bytes: number): Promise<void> {
    await this.RequestFunction(SongDBFunctions.setSizeBytes, [song_uid, size_bytes.toString()]);
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
    await this.RequestFunction(SongDBFunctions.setDuration, [song_uid, duration.toString()]);
  }

  /**
   * addLock() - Adds a delete lock to song
   * @param song_uid - song uid of song to lock
   * @returns - unique lock_id
   */
  async addLock(song_uid: string): Promise<number> {
    return parseInt(await this.RequestFunction(SongDBFunctions.addLock, [song_uid]));
  }

  /**
   * removeLock() - Removes a delete lock to song
   * @param lock_id - song uid of song to remove lock from
   */
  async removeLock(lock_id: number): Promise<void> {
    await this.RequestFunction(SongDBFunctions.removeLock, [lock_id.toString()]);
  }

  /**
   * isLocked() - Checks if a given song_uid is locked or not
   * @param song_uid - song uid of song to check status of
   * @returns - if song is locked or not
   */
  async isLocked(song_uid: string): Promise<boolean> {
    return JSON.parse(await this.RequestFunction(SongDBFunctions.isLocked, [song_uid]));
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
