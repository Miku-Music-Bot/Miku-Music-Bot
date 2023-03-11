import { SongDBConfig } from '../constants';
import Logger from '../logger/logger';
import SQLiteInterface from '../sqlite_interface/sqlite_interface';

export enum SongDBFunctions {
  getCacheInfo,
  getSongInfo,
  cacheSong,
  uncacheSong,
  setStartChunk,
  setEndChunk,
  setSizeBytes,
  incrementPlaybacks,
  setThumbnailUrl,
  setTitle,
  setArtist,
  setDuration,
  addLock,
  removeLock,
}

const db_tables = [
  {
    name: 'song_cache',
    cols: '(song_uid STRING, cached BOOLEAN, cache_location STRING, start_chunk INT, end_chunk INT, size_bytes INT, playbacks INT)',
  },
  {
    name: 'song_info',
    cols: '(song_uid STRING, link STRING, thumbnail_url STRING, title STRING, artist STRING, duration INT)',
  },
  {
    name: 'locks',
    cols: '(song_uid STRING, lock_id INT)',
  },
];

/**
 * SongDB() - SQLite interface for saving song information
 */
export default class SongDB extends SQLiteInterface {
  constructor(logger: Logger, songdb_config: SongDBConfig) {
    super(songdb_config.db_location, db_tables, logger);
  }

  /**
   * addSong() - Adds a song to database
   * @param song_uid - song uid of song to add
   * @param cache_location - cache location of song to add
   * @param link - url of song to add
   */
  private async addSong(song_uid: string, cache_location: string, link: string): Promise<void> {
    //
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
    return new Promise((resolve, reject) => {
      //
    });
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
    return new Promise((resolve, reject) => {
      //
    });
  }

  /**
   * cacheSong() - Update database so that song is cached
   * @param song_uid - song uid of song to uncache
   * @param cache_location - cache location of song to add
   * @param link - url of song to add
   */
  async cacheSong(song_uid: string, cache_location: string, link: string): Promise<void> {
    //
  }

  /**
   * uncacheSong() - Update database so that song is no longer cached
   * @param song_uid - song uid of song to uncache
   */
  async uncacheSong(song_uid: string): Promise<void> {
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
   * @returns - unique lock_id
   */
  async addLock(song_uid: string): Promise<number> {
    return 1;
  }

  /**
   * removeLock() - Removes a delete lock to song
   * @param lock_id - song uid of song to remove lock from
   */
  async removeLock(lock_id: number): Promise<void> {
    //
  }
}
