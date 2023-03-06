import MIKU_CONSTS from "../constants";
import Logger from "../logger/logger";
import SQLiteInterface from "../sqlite_interface/sqlite_interface";

export enum SongDBFunctions { addSong }

const db_tables = [
  {
    name: "songs",
    cols: "(song_uid STRING NOT NULL, cache_location STRING NOT NULL, link STRING, start_chunk INT, end_chunk INT, size_bytes INT, playbacks INT, thumbnail_url STRING, title STRING, artist STRING, duration INT)"
  },
  {
    name: "locks",
    cols: "(song_uid STRING, lock_count INT)"
  }
];

/**
 * SongDB() - SQLite interface for saving song information
 */
export default class SongDB extends SQLiteInterface {
  constructor(logger: Logger) {
    super(MIKU_CONSTS.song_db.db_location, db_tables, logger);
  }

  /**
   * addSong() - Adds a song to database
   * @param song_uid - song uid of song to add
   * @param cache_location - cache location of song to add
   * @param link - url of song to add
   */
  async addSong(song_uid: string, cache_location: string, link: string): Promise<void> {
    const profile = this.log_.profile("Add Song", { debug: 0, warn: 1000, error: 5000 });
    try {
      await this.dbRun(
        `INSERT INTO songs VALUES ($song_uid, $cache_location, $link, -1, -1, 0, 0, ${MIKU_CONSTS.web.default_thumbnail}, Unknown, Unknown, -1);`,
        {
          $song_uid: song_uid,
          $cache_location: cache_location,
          $link: link
        });
      profile.stop();
    } catch (error) {
      this.log_.error(`Error inserting song with {song_uid:${song_uid}} into database`, error);
      profile.stop({ success: false, level: "error" });
      throw error;
    }
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
    const profile = this.log_.profile("Delete Song", { debug: 0, warn: 1000, error: 5000 });
    try {
      await this.dbRun("DELETE FROM songs WHERE song_uid=$song_uid", {
        $song_uid: song_uid
      });
      profile.stop();
    } catch (error) {
      this.log_.error(`Error deleting song with {song_uid:${song_uid}} from database`, error);
      profile.stop({ success: false, level: "error" });
      throw error;
    }
  }

  /**
   * updateSong() - Updates a song in the database
   * @param song_uid - song uid of song to update
   * @param cmd - sql command to run
   * @param params - parameters to run sql command with
   */
  private async updateSong(song_uid: string, cmd: string, params: object) {
    const profile = this.log_.profile("Update Song Data", { debug: 0, warn: 1000, error: 5000 });
    try {
      await this.dbRun(cmd, params);
      profile.stop();
    } catch (error) {
      this.log_.error(`Error updating song with {song_uid:${song_uid}} from database using {cmd: ${cmd}}`, error);
      profile.stop({ success: false, level: "error" });
      throw error;
    }
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
