import MIKU_CONSTS from "../constants";
import Logger from "../logger/logger";

import IPCInterface from "../ipc_template/ipc_interface";
import { SongDBFunctions } from "./song_db";

export default class SongDBInterface extends IPCInterface<SongDBFunctions> {
  constructor(logger: Logger) { super(MIKU_CONSTS.ipc_config.music_ipc_id, logger); }

  /**
   * addSong() - Adds a song to database
   * @param song_uid - song uid of song to add
   * @param cache_location - cache location of song to add
   * @param link - url of song to add
   */
  async addSong(song_uid: string, cache_location: string, link: string): Promise<void> {
    //
  }

  /**
   * getSongInfo() - Gets all information about a song
   * @param song_uid - song uid of song to add
   * @returns - object containing song information
   */
  async getSongInfo(song_uid: string): Promise<{
    cache_location: string,
    link: string,
    start_chunk: number,
    end_chunk: number,
    size_bytes: number,
    playbacks: number,
    thumbnail_url: string,
    title: string,
    artist: string,
    duration: number
  }> {
    return new Promise((resolve, reject) => {
      //
    });
  }

  /**
   * deleteSong() - Deletes a song in the database
   * @param song_uid - song uid of song to delete
   */
  async deleteSong(song_uid: string): Promise<void> {
    //
  }

  /**
   * setStartChunk() - Sets the start_chunk of song
   * @param song_uid - song uid of song to update
   * @param start_chunk
   */
  async setStartChunk(song_uid: string, start_chunk: number): Promise<void> {
    //
  }

  /**
   * setEndChunk() - Sets the end_chunk of song
   * @param song_uid - song uid of song to update
   * @param end_chunk 
   */
  async setEndChunk(song_uid: string, end_chunk: number): Promise<void> {
    //
  }

  /**
   * setSizeBytes() - Sets the size_bytes of song
   * @param song_uid - song uid of song to update
   * @param size_bytes 
   */
  async setSizeBytes(song_uid: string, size_bytes: number): Promise<void> {
    //
  }

  /**
   * incrementPlaybacks() - Increments the playbacks of song by 1
   * @param song_uid - song uid of song to update
   */
  async incrementPlaybacks(song_uid: string): Promise<void> {
    //
  }

  /**
   * setThumbnailUrl() - Sets the thumbnail_url of song
   * @param song_uid - song uid of song to update
   * @param thumbnail_url 
   */
  async setThumbnailUrl(song_uid: string, thumbnail_url: string): Promise<void> {
    //
  }

  /**
   * setTitle() - Sets the title of song
   * @param song_uid - song uid of song to update
   * @param title 
   */
  async setTitle(song_uid: string, title: string): Promise<void> {
    //
  }

  /**
   * setArtist() - Sets the artist of song
   * @param song_uid - song uid of song to update
   * @param artist 
   */
  async setArtist(song_uid: string, artist: string): Promise<void> {
    //
  }

  /**
   * setDuration() - Sets the duration of song
   * @param song_uid - song uid of song to update
   * @param duration 
   */
  async setDuration(song_uid: string, duration: number): Promise<void> {
    //
  }

  /**
   * addLock() - Adds a delete lock to song
   * @param song_uid - song uid of song to lock
   * @returns 
   */
  async addLock(song_uid: string): Promise<void> {
    //
  }

  /**
   * removeLock() - Removes a delete lock to song
   * @param song_uid - song uid of song to remove lock from
   */
  async removeLock(song_uid: string): Promise<void> {
    //
  }
}