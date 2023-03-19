import crypto from 'crypto';

import { songdb_config } from '../constants/constants';
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
  setLink,
  setThumbnailUrl,
  setTitle,
  setArtist,
  setDuration,
  addLock,
  removeLock,
  isLocked,
  bestToRemove,
  close,
}

export type CacheInfo = {
  song_uid: string;
  cached: boolean;
  cache_location: string;
  start_chunk: number;
  end_chunk: number;
  size_bytes: number;
  playbacks: number;
  size_over_plays: number;
};
export type SongInfo = {
  song_uid: string;
  link: string;
  thumbnail_url: string;
  title: string;
  artist: string;
  duration: number;
};

// Info about the tables needed for SongDB
const db_tables = [
  {
    name: 'song_cache',
    cols: '(song_uid STRING UNIQUE NOT NULL, cached NUMBER(1), cache_location STRING, start_chunk INT, end_chunk INT, size_bytes INT, playbacks INT, size_over_plays DOUBLE)',
  },
  {
    name: 'song_info',
    cols: '(song_uid STRING UNIQUE NOT NULL, link STRING, thumbnail_url STRING, title STRING, artist STRING, duration INT)',
  },
  {
    name: 'locks',
    cols: '(song_uid STRING NOT NULL, lock_id INT UNIQUE NOT NULL)',
  },
];

/**
 * SongDB() - An SQLite interface for saving song cache, info, and lock information for MusicCache
 */
export default class SongDB extends SQLiteInterface {
  constructor(logger: Logger) {
    super(songdb_config.db_location, db_tables, logger);
  }

  /**
   * containsSong() - Checks if a song is in the database or not
   * @param song_uid - song uid of song to check existence of
   * @returns - true if in database, false if not
   */
  private async containsSong(song_uid: string): Promise<boolean> {
    const rows: Array<{ 'COUNT(1)': number }> = await this.dbAll(
      'SELECT COUNT(1) FROM song_cache WHERE song_uid = $song_uid;',
      {
        $song_uid: song_uid,
      }
    );
    return rows[0]['COUNT(1)'] === 1;
  }

  /**
   * addSong() - Adds a song to database
   * @param song_uid - song uid of song to add
   * @param cache_location - cache location of song to add
   */
  private async addSong(song_uid: string, cache_location: string): Promise<void> {
    await this.dbRun(
      'INSERT INTO song_cache VALUES ($song_uid, $cached, $cache_location, $start_chunk, $end_chunk, $size_bytes, $playbacks, $size_over_plays)',
      {
        $song_uid: song_uid,
        $cached: 1,
        $cache_location: cache_location,
        $start_chunk: -1,
        $end_chunk: -1,
        $size_bytes: 0,
        $playbacks: 0,
        $size_over_plays: 0,
      }
    );

    await this.dbRun('INSERT INTO song_info VALUES ($song_uid, $link, $thumbnail_url, $title, $artist, $duration)', {
      $song_uid: song_uid,
      $link: '',
      $thumbnail_url: '',
      $title: 'Unknown',
      $artist: 'Unknown',
      $duration: -1,
    });
  }

  /**
   * getCacheInfo() - Gets cache information about a song
   * @param song_uid - song uid of song to get info of
   * @returns - object containing cache information about the song
   */
  async getCacheInfo(song_uid: string): Promise<CacheInfo> {
    const results: Array<Omit<CacheInfo, 'cached'> & { cached: number }> = await this.dbAll(
      'SELECT * FROM song_cache WHERE song_uid = $song_uid',
      { $song_uid: song_uid }
    );

    if (results.length === 0) throw new Error('Song does not exist in song database');

    return {
      song_uid: results[0].song_uid,
      cached: results[0].cached === 1,
      cache_location: results[0].cache_location,
      start_chunk: results[0].start_chunk,
      end_chunk: results[0].end_chunk,
      size_bytes: results[0].size_bytes,
      playbacks: results[0].playbacks,
      size_over_plays: results[0].size_over_plays,
    };
  }

  /**
   * getSongInfo() - Gets link, thumbnail, title, artist, and duration of a song
   * @param song_uid - song uid of song to get info of
   * @returns - object containing link, thumbnail, title, artist, and duration of song
   */
  async getSongInfo(song_uid: string): Promise<SongInfo> {
    const results: Array<SongInfo> = await this.dbAll('SELECT * FROM song_info WHERE song_uid = $song_uid', {
      $song_uid: song_uid,
    });

    if (results.length === 0) throw new Error('Song does not exist in song database');

    return {
      song_uid: results[0].song_uid,
      link: results[0].link,
      thumbnail_url: results[0].thumbnail_url,
      title: results[0].title,
      artist: results[0].artist,
      duration: results[0].duration,
    };
  }

  /**
   * cacheSong() - Update database so that song is cached
   * @param song_uid - song uid of song to uncache
   * @param cache_location - cache location of song to add
   */
  async cacheSong(song_uid: string, cache_location: string): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      await this.addSong(song_uid, cache_location);
    } else {
      await this.dbRun(
        'UPDATE song_cache SET cached = $cached, cache_location = $cache_location WHERE song_uid = $song_uid',
        {
          $cached: 1,
          $song_uid: song_uid,
          $cache_location: cache_location,
        }
      );
    }
  }

  /**
   * uncacheSong() - Update database so that song is no longer cached by setting cached to false and size_bytes to 0 and updating size_over_plays
   * @param song_uid - song uid of song to uncache
   */
  async uncacheSong(song_uid: string): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun(
        'UPDATE song_cache SET cached = $cached, size_bytes = $size_bytes, size_over_plays = $size_over_plays WHERE song_uid = $song_uid',
        {
          $size_bytes: 0,
          $size_over_plays: 0,
          $cached: 0,
          $song_uid: song_uid,
        }
      );
    }
  }

  /**
   * setStartChunk() - Sets the start_chunk of song
   * @param song_uid - song uid of song to update
   * @param start_chunk
   */
  async setStartChunk(song_uid: string, start_chunk: number): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun('UPDATE song_cache SET start_chunk = $start_chunk WHERE song_uid = $song_uid', {
        $start_chunk: start_chunk,
        $song_uid: song_uid,
      });
    }
  }

  /**
   * setEndChunk() - Sets the end_chunk of song
   * @param song_uid - song uid of song to update
   * @param end_chunk
   */
  async setEndChunk(song_uid: string, end_chunk: number): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun('UPDATE song_cache SET end_chunk = $end_chunk WHERE song_uid = $song_uid', {
        $end_chunk: end_chunk,
        $song_uid: song_uid,
      });
    }
  }

  /**
   * setSizeBytes() - Sets the size_bytes of song
   * @param song_uid - song uid of song to update
   * @param size_bytes
   */
  async setSizeBytes(song_uid: string, size_bytes: number): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun(
        'UPDATE song_cache SET size_bytes = $size_bytes, size_over_plays = IFNULL(($size_bytes / playbacks), 0) WHERE song_uid = $song_uid',
        {
          $size_bytes: size_bytes,
          $song_uid: song_uid,
        }
      );
    }
  }

  /**
   * incrementPlaybacks() - Increments the playbacks of song by 1
   * @param song_uid - song uid of song to update
   */
  async incrementPlaybacks(song_uid: string): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun(
        'UPDATE song_cache SET playbacks = playbacks + 1, size_over_plays = IFNULL((size_bytes / (playbacks + 1)), 0) WHERE song_uid = $song_uid',
        {
          $song_uid: song_uid,
        }
      );
    }
  }

  /**
   * setLink() - Sets the song's link
   * @param song_uid - song uid of song to update
   * @param link - link to update song with
   */
  async setLink(song_uid: string, link: string): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun('UPDATE song_info SET link = $link WHERE song_uid = $song_uid', {
        $link: link,
        $song_uid: song_uid,
      });
    }
  }

  /**
   * setThumbnailUrl() - Sets the thumbnail_url of song
   * @param song_uid - song uid of song to update
   * @param thumbnail_url
   */
  async setThumbnailUrl(song_uid: string, thumbnail_url: string): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun('UPDATE song_info SET thumbnail_url = $thumbnail_url WHERE song_uid = $song_uid', {
        $thumbnail_url: thumbnail_url,
        $song_uid: song_uid,
      });
    }
  }

  /**
   * setTitle() - Sets the title of song
   * @param song_uid - song uid of song to update
   * @param title
   */
  async setTitle(song_uid: string, title: string): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun('UPDATE song_info SET title = $title WHERE song_uid = $song_uid', {
        $title: title,
        $song_uid: song_uid,
      });
    }
  }

  /**
   * setArtist() - Sets the artist of song
   * @param song_uid - song uid of song to update
   * @param artist
   */
  async setArtist(song_uid: string, artist: string): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun('UPDATE song_info SET artist = $artist WHERE song_uid = $song_uid', {
        $artist: artist,
        $song_uid: song_uid,
      });
    }
  }

  /**
   * setDuration() - Sets the duration of song
   * @param song_uid - song uid of song to update
   * @param duration
   */
  async setDuration(song_uid: string, duration: number): Promise<void> {
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun('UPDATE song_info SET duration = $duration WHERE song_uid = $song_uid', {
        $duration: duration,
        $song_uid: song_uid,
      });
    }
  }

  /**
   * addLock() - Adds a delete lock to song
   * @param song_uid - song uid of song to lock
   * @returns - unique lock_id
   */
  async addLock(song_uid: string): Promise<string> {
    const lock_id = crypto.randomUUID();
    if (!(await this.containsSong(song_uid))) {
      throw new Error('Song does not exist in song database');
    } else {
      await this.dbRun('INSERT INTO locks VALUES ($song_uid, $lock_id)', {
        $lock_id: lock_id,
        $song_uid: song_uid,
      });
    }
    return lock_id;
  }

  /**
   * removeLock() - Removes a delete lock to song
   * @param lock_id - song uid of song to remove lock from
   */
  async removeLock(lock_id: string): Promise<void> {
    await this.dbRun('DELETE FROM locks WHERE lock_id = $lock_id', { $lock_id: lock_id });
  }

  /**
   * isLocked() - Checks if a given song_uid is locked or not
   * @param song_uid - song uid of song to check status of
   * @returns - if song is locked or not
   */
  async isLocked(song_uid: string): Promise<boolean> {
    const rows: Array<{ 'COUNT(1)': number }> = await this.dbAll('SELECT COUNT(1) FROM locks WHERE song_uid = $song_uid;', {
      $song_uid: song_uid,
    });
    return rows[0]['COUNT(1)'] > 0;
  }

  /**
   * bestToRemove() - Returns the cache info of the song that is best to be removed based on what song has the maximum (size in cache / # of playbacks)
   * @returns - song that is best to be removed in cache. Returns empty object if no songs are unlocked or if size_over_plays is 0
   */
  async bestToRemove(): Promise<CacheInfo | {}> {
    const results: Array<Omit<CacheInfo, 'cached'> & { cached: number; 'MAX(size_over_plays)': number }> = await this.dbAll(
      'SELECT *, MAX(size_over_plays) FROM song_cache WHERE NOT EXISTS (SELECT song_uid FROM locks WHERE song_cache.song_uid = locks.song_uid)',
      {}
    );

    if (results[0]['MAX(size_over_plays)'] === null) return {};
    if (results[0]['MAX(size_over_plays)'] === 0) return {};

    return {
      song_uid: results[0].song_uid,
      cached: results[0].cached === 1,
      cache_location: results[0].cache_location,
      start_chunk: results[0].start_chunk,
      end_chunk: results[0].end_chunk,
      size_bytes: results[0].size_bytes,
      playbacks: results[0].playbacks,
      size_over_plays: results[0].size_over_plays,
    };
  }
}
