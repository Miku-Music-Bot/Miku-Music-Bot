import { assert, expect } from 'chai';
import path from 'path';

import uniqueID from '../test_utils/unique_id.test';

import SongDB from './song_db';
import SongDBInterface from './song_db_ipc_interface';

// Fully cached song
export const default0 = Object.freeze({
  cache_info: {
    song_uid: 'yt$M1vsdF4VfUo',
    cached: true,
    cache_location: 'cache/location0',
    start_chunk: 0,
    end_chunk: 212,
    size_bytes: 128,
    playbacks: 4,
    size_over_plays: 32,
  },
  song_info: {
    song_uid: 'yt$M1vsdF4VfUo',
    link: 'https://www.youtube.com/watch?v=M1vsdF4VfUo',
    thumbnail_url:
      'https://i.ytimg.com/vi/OSz516-6IR4/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLDSbi0rVlwaHd-iNfSxF5ZAqSypVQ',
    title: 'A New Era Begins',
    artist: 'Evan Call - Topic',
    duration: 132,
  },
});
// Newly created song with default values
export const default1 = Object.freeze({
  cache_info: {
    song_uid: 'yt$IK-IlYIQvcU',
    cached: false,
    cache_location: 'cache/location1',
    start_chunk: -1,
    end_chunk: -1,
    size_bytes: 0,
    playbacks: 0,
    size_over_plays: 0,
  },
  song_info: {
    song_uid: 'yt$IK-IlYIQvcU',
    link: '',
    thumbnail_url: '',
    title: 'Unknown',
    artist: 'Unknown',
    duration: -1,
  },
});

/**
 * populateDB() - Creates populates database with defaults from above
 */
export async function populateDB(song_db: SongDB | SongDBInterface) {
  const defaults = [default0, default1];
  for (let i = 0; i < defaults.length; i++) {
    await song_db.addSong(defaults[i].cache_info.song_uid, defaults[i].cache_info.cache_location);
    if (defaults[i].cache_info.cached) await song_db.cacheSong(defaults[i].cache_info.song_uid);
    await song_db.setStartChunk(defaults[i].cache_info.song_uid, defaults[i].cache_info.start_chunk);
    await song_db.setEndChunk(defaults[i].cache_info.song_uid, defaults[i].cache_info.end_chunk);
    await song_db.setSizeBytes(defaults[i].cache_info.song_uid, defaults[i].cache_info.size_bytes);
    for (let j = 0; j < defaults[i].cache_info.playbacks; j++)
      await song_db.incrementPlaybacks(defaults[i].cache_info.song_uid);

    await song_db.setLink(defaults[i].song_info.song_uid, defaults[i].song_info.link);
    await song_db.setThumbnailUrl(defaults[i].song_info.song_uid, defaults[i].song_info.thumbnail_url);
    await song_db.setTitle(defaults[i].song_info.song_uid, defaults[i].song_info.title);
    await song_db.setArtist(defaults[i].song_info.song_uid, defaults[i].song_info.artist);
    await song_db.setDuration(defaults[i].song_info.song_uid, defaults[i].song_info.duration);

    assert.deepEqual(
      await song_db.getCacheInfo(defaults[i].cache_info.song_uid),
      defaults[i].cache_info,
      'Populates database correctly'
    );
    assert.deepEqual(
      await song_db.getSongInfo(defaults[i].cache_info.song_uid),
      defaults[i].song_info,
      'Populates database correctly'
    );
  }
}

/**
 * TestSongDB() - Runs tests on a given SongDB or SongDBInterface
 * @param db_directory - directory test databases should be stored in
 * @param name - name of interface to test (SongDB vs SongDBInterface)
 * @param createDB - function to create a SongDB/SongDBInterface at given directory
 * @param finish - called after each test is finished
 */
export default function TestSongDB(
  db_directory: string,
  createDB: (db_location: string) => SongDB | SongDBInterface,
  finish: () => void
) {
  describe('Open existing database and fetch information', () => {
    it('finds existing cache information', async () => {
      const db_location = path.join(__dirname, '..', '..', 'src', 'song_db', 'song_db.test.db');
      const song_db = createDB(db_location);

      const song_uid0 = 'yt$M1vsdF4VfUo';
      const song_uid1 = 'yt$IK-IlYIQvcU';

      const expected_info0 = {
        song_uid: song_uid0,
        cached: true,
        cache_location: 'cache/location0',
        start_chunk: 0,
        end_chunk: 212,
        size_bytes: 128,
        playbacks: 4,
        size_over_plays: 32,
      };
      const expected_info1 = {
        song_uid: song_uid1,
        cached: false,
        cache_location: 'cache/location1',
        start_chunk: -1,
        end_chunk: -1,
        size_bytes: 0,
        playbacks: 1,
        size_over_plays: 0,
      };
      const actual0 = await song_db.getCacheInfo(song_uid0);
      const actual1 = await song_db.getCacheInfo(song_uid1);
      assert.deepEqual(actual0, expected_info0, 'Fetches cache info correctly');
      assert.deepEqual(actual1, expected_info1, 'Fetches cache info correctly');

      await song_db.close();
      finish();
    });

    it('finds existing song information', async () => {
      const db_location = path.join(__dirname, '..', '..', 'src', 'song_db', 'song_db.test.db');
      const song_db = createDB(db_location);

      const song_uid0 = 'yt$M1vsdF4VfUo';
      const song_uid1 = 'yt$IK-IlYIQvcU';

      const expected_info0 = {
        song_uid: song_uid0,
        link: 'https://www.youtube.com/watch?v=M1vsdF4VfUo',
        thumbnail_url:
          'https://i.ytimg.com/vi/OSz516-6IR4/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLDSbi0rVlwaHd-iNfSxF5ZAqSypVQ',
        title: 'A New Era Begins',
        artist: 'Evan Call - Topic',
        duration: 132,
      };
      const expected_info1 = {
        song_uid: song_uid1,
        link: 'https://www.youtube.com/watch?v=IK-IlYIQvcU',
        thumbnail_url:
          'https://i.ytimg.com/vi/OSz516-6IR4/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLDSbi0rVlwaHd-iNfSxF5ZAqSypVQ',
        title: "Violet's Final Letter",
        artist: 'Evan Call - Topic',
        duration: 137,
      };
      const actual0 = await song_db.getSongInfo(song_uid0);
      const actual1 = await song_db.getSongInfo(song_uid1);
      assert.deepEqual(actual0, expected_info0, 'Fetches song info correctly');
      assert.deepEqual(actual1, expected_info1, 'Fetches song info correctly');

      await song_db.close();
      finish();
    });

    it('finds existing locks', async () => {
      const db_location = path.join(__dirname, '..', '..', 'src', 'song_db', 'song_db.test.db');
      const song_db = createDB(db_location);

      const song_uid0 = 'yt$M1vsdF4VfUo';
      const song_uid1 = 'yt$IK-IlYIQvcU';

      const actual0 = await song_db.isLocked(song_uid0);
      const actual1 = await song_db.isLocked(song_uid1);
      assert.equal(actual0, false, 'Fetches non existing lock correctly');
      assert.equal(actual1, true, 'Fetches existing lock correctly');

      await song_db.close();
      finish();
    });
  });

  describe('Get song info and cache info', () => {
    it('throws error if getting cache info of unknown song_uid', async () => {
      const db_location = path.join(__dirname, '..', '..', 'src', 'song_db', 'song_db.test.db');
      const song_db = createDB(db_location);

      await assert.isRejected(song_db.getCacheInfo('yt$M1vsdF4VfU'), 'Song does not exist in song database');

      await song_db.close();
      finish();
    });

    it('throws error if getting song info of unknown song_uid', async () => {
      const db_location = path.join(__dirname, '..', '..', 'src', 'song_db', 'song_db.test.db');
      const song_db = createDB(db_location);

      await assert.isRejected(song_db.getSongInfo('yt$M1vsdF4VfU'), 'Song does not exist in song database');

      await song_db.close();
      finish();
    });
  });

  describe('Add song', () => {
    it('sets default cache info when caching new song', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.cache_info), {});
      const expected1 = Object.assign(Object.assign({}, default1.cache_info), {});
      const expected2 = {
        song_uid: 'yt$CfUIwzDo4HE',
        cached: false,
        cache_location: 'cache/location1',
        start_chunk: -1,
        end_chunk: -1,
        size_bytes: 0,
        playbacks: 0,
        size_over_plays: 0,
      };

      await song_db.addSong(expected2.song_uid, expected2.cache_location);

      const actual0 = await song_db.getCacheInfo(expected0.song_uid);
      const actual1 = await song_db.getCacheInfo(expected1.song_uid);
      const actual2 = await song_db.getCacheInfo(expected2.song_uid);
      assert.deepEqual(actual0, expected0, 'Does not edit other songs');
      assert.deepEqual(actual1, expected1, 'Does not edit other songs');
      assert.deepEqual(actual2, expected2, 'Sets default cache info correctly');

      await song_db.close();
      finish();
    });

    it('sets default song info when caching new song', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.song_info), {});
      const expected1 = Object.assign(Object.assign({}, default1.song_info), {});
      const expected2 = {
        song_uid: 'yt$CfUIwzDo4HE',
        link: '',
        thumbnail_url: '',
        title: 'Unknown',
        artist: 'Unknown',
        duration: -1,
      };

      await song_db.addSong(expected2.song_uid, '');

      const actual0 = await song_db.getSongInfo(expected0.song_uid);
      const actual1 = await song_db.getSongInfo(expected1.song_uid);
      const actual2 = await song_db.getSongInfo(expected2.song_uid);
      assert.deepEqual(actual0, expected0, 'Does not edit other songs');
      assert.deepEqual(actual1, expected1, 'Does not edit other songs');
      assert.deepEqual(actual2, expected2, 'Sets default cache info correctly');

      await song_db.close();
      finish();
    });

    it('does not throw error when adding existing song', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.song_info), {});
      const expected1 = Object.assign(Object.assign({}, default1.song_info), {});

      await song_db.addSong(expected0.song_uid, '');

      const actual0 = await song_db.getSongInfo(expected0.song_uid);
      const actual1 = await song_db.getSongInfo(expected1.song_uid);
      assert.deepEqual(actual0, expected0, 'Does not edit other songs');
      assert.deepEqual(actual1, expected1, 'Does not edit other songs');

      await song_db.close();
      finish();
    });
  });

  describe('Cache/uncache song', () => {
    it('caches a songs', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.cache_info), {});
      const expected1 = Object.assign(Object.assign({}, default1.cache_info), { cached: true });

      await song_db.cacheSong(expected1.song_uid);

      const actual0 = await song_db.getCacheInfo(expected0.song_uid);
      const actual1 = await song_db.getCacheInfo(expected1.song_uid);
      assert.deepEqual(actual0, expected0, 'Does not edit other songs');
      assert.deepEqual(actual1, expected1, 'Sets cached to true');

      await song_db.close();
      finish();
    });

    it('uncaches a song', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.cache_info), {
        cached: false,
        start_chunk: -1,
        end_chunk: -1,
        size_bytes: 0,
        size_over_plays: 0,
      });
      const expected1 = Object.assign(Object.assign({}, default1.cache_info), {});

      await song_db.uncacheSong(expected0.song_uid);

      const actual0 = await song_db.getCacheInfo(expected0.song_uid);
      const actual1 = await song_db.getCacheInfo(expected1.song_uid);
      assert.deepEqual(actual0, expected0, 'Sets cached to false');
      assert.deepEqual(actual1, expected1, 'Does not edit other songs');

      await song_db.close();
      finish();
    });

    it('cacheSong does nothing if song is already cached', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.cache_info), {});
      const expected1 = Object.assign(Object.assign({}, default1.cache_info), {});

      await song_db.cacheSong(expected0.song_uid);

      const actual0 = await song_db.getCacheInfo(expected0.song_uid);
      const actual1 = await song_db.getCacheInfo(expected1.song_uid);
      assert.deepEqual(actual0, expected0, 'Does not change anything');
      assert.deepEqual(actual1, expected1, 'Does not edit other songs');

      await song_db.close();
      finish();
    });

    it('uncacheSong does nothing if song is already uncached', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.cache_info), {});
      const expected1 = Object.assign(Object.assign({}, default1.cache_info), {});

      await song_db.uncacheSong(expected1.song_uid);

      const actual0 = await song_db.getCacheInfo(expected0.song_uid);
      const actual1 = await song_db.getCacheInfo(expected1.song_uid);
      assert.deepEqual(actual0, expected0, 'Does not edit other songs');
      assert.deepEqual(actual1, expected1, 'Does not change anything');

      await song_db.close();
      finish();
    });
  });

  describe('Get/set cache info', () => {
    it('sets new cache info correctly', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.cache_info), {});
      const expected1 = Object.assign(Object.assign({}, default1.cache_info), {
        start_chunk: 234,
        end_chunk: 345,
        size_bytes: 64,
        playbacks: 16,
        size_over_plays: 4,
      });

      await song_db.setStartChunk(expected1.song_uid, expected1.start_chunk);
      await song_db.setEndChunk(expected1.song_uid, expected1.end_chunk);
      await song_db.setSizeBytes(expected1.song_uid, expected1.size_bytes);
      for (let i = 0; i < expected1.playbacks; i++) await song_db.incrementPlaybacks(expected1.song_uid);

      const actual0 = await song_db.getCacheInfo(expected0.song_uid);
      const actual1 = await song_db.getCacheInfo(expected1.song_uid);
      assert.deepEqual(actual0, expected0, 'Does not edit other songs');
      assert.deepEqual(actual1, expected1, 'Sets cache info correctly');

      await song_db.close();
      finish();
    });

    it('throws error if setting cache info of unknown song', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.cache_info), {});
      const expected1 = Object.assign(Object.assign({}, default1.cache_info), {});

      const unknown_song = 'yt$CfUIwzDo4HE';
      const start_chunk = 0;
      const end_chunk = 123;
      const size_bytes = 128;
      await assert.isRejected(song_db.cacheSong(unknown_song), 'Song does not exist in song database');
      await assert.isRejected(song_db.uncacheSong(unknown_song), 'Song does not exist in song database');
      await assert.isRejected(song_db.setStartChunk(unknown_song, start_chunk), 'Song does not exist in song database');
      await assert.isRejected(song_db.setEndChunk(unknown_song, end_chunk), 'Song does not exist in song database');
      await assert.isRejected(song_db.setSizeBytes(unknown_song, size_bytes), 'Song does not exist in song database');
      await assert.isRejected(song_db.incrementPlaybacks(unknown_song), 'Song does not exist in song database');

      const actual0 = await song_db.getCacheInfo(expected0.song_uid);
      const actual1 = await song_db.getCacheInfo(expected1.song_uid);
      assert.deepEqual(actual0, expected0, 'Does not edit other songs');
      assert.deepEqual(actual1, expected1, 'Does not edit other songs');

      await song_db.close();
      finish();
    });
  });

  describe('Get/set song info', () => {
    it('sets new song info correctly', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.song_info), {
        link: 'https://somelink.com',
        thumbnail_url: 'https://somelink.com/image.jpg',
        title: 'A Title',
        artist: 'An Artist',
        duration: 101,
      });
      const expected1 = Object.assign(Object.assign({}, default1.song_info), {});

      await song_db.setLink(expected0.song_uid, expected0.link);
      await song_db.setThumbnailUrl(expected0.song_uid, expected0.thumbnail_url);
      await song_db.setTitle(expected0.song_uid, expected0.title);
      await song_db.setArtist(expected0.song_uid, expected0.artist);
      await song_db.setDuration(expected0.song_uid, expected0.duration);

      const actual0 = await song_db.getSongInfo(expected0.song_uid);
      const actual1 = await song_db.getSongInfo(expected1.song_uid);
      assert.deepEqual(actual0, expected0, 'Sets song info correctly');
      assert.deepEqual(actual1, expected1, 'Does not edit other songs');

      await song_db.close();
      finish();
    });

    it('sets throws error when setting song info of unknown song', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const expected0 = Object.assign(Object.assign({}, default0.song_info), {});
      const expected1 = Object.assign(Object.assign({}, default1.song_info), {});

      const unknown_song = 'yt$CfUIwzDo4HE';
      const link = 'https://www.youtube.com/watch?v=M1vsdF4VfUo';
      const thumbnail_url =
        'https://i.ytimg.com/vi/OSz516-6IR4/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG&rs=AOn4CLDSbi0rVlwaHd-iNfSxF5ZAqSypVQ';
      const title = 'A New Era Begins';
      const artist = 'Evan Call - Topic';
      const duration = 132;
      await assert.isRejected(song_db.setLink(unknown_song, link), 'Song does not exist in song database');
      await assert.isRejected(song_db.setThumbnailUrl(unknown_song, thumbnail_url), 'Song does not exist in song database');
      await assert.isRejected(song_db.setTitle(unknown_song, title), 'Song does not exist in song database');
      await assert.isRejected(song_db.setArtist(unknown_song, artist), 'Song does not exist in song database');
      await assert.isRejected(song_db.setDuration(unknown_song, duration), 'Song does not exist in song database');

      const actual0 = await song_db.getSongInfo(expected0.song_uid);
      const actual1 = await song_db.getSongInfo(expected1.song_uid);
      assert.deepEqual(actual0, expected0, 'Does not edit other songs');
      assert.deepEqual(actual1, expected1, 'Does not edit other songs');

      await song_db.close();
      finish();
    });
  });

  describe('Add/remove locks', () => {
    it('locks song then unlocks after locks are removed', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const { song_uid } = default0.cache_info;

      const actual0 = await song_db.isLocked(song_uid);
      assert.equal(actual0, false, 'Song is not locked when first created');

      const lock_id0 = await song_db.addLock(song_uid);
      const actual1 = await song_db.isLocked(song_uid);
      assert.equal(actual1, true, 'Song is locked when lock is added');

      const lock_id1 = await song_db.addLock(song_uid);
      const actual2 = await song_db.isLocked(song_uid);
      assert.equal(actual2, true, 'Song is locked when lock is added');

      await song_db.removeLock(lock_id0);
      const actual3 = await song_db.isLocked(song_uid);
      assert.equal(actual3, true, 'Song is locked when one but not all locks are remove`d');

      await song_db.removeLock(lock_id1);
      const actual4 = await song_db.isLocked(song_uid);
      assert.equal(actual4, false, 'Song is unlocked when all locks are removed');

      await song_db.close();
      finish();
    });

    it('throws error when adding locks for unknown song', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);
      await populateDB(song_db);

      const song_uid0 = default0.cache_info.song_uid;
      const song_uid1 = default1.cache_info.song_uid;

      const unknown_song = 'yt$CfUIwzDo4HE';
      await assert.isRejected(song_db.addLock(unknown_song), 'Song does not exist in song database');

      const actual0 = await song_db.isLocked(song_uid0);
      const actual1 = await song_db.isLocked(song_uid1);
      assert.equal(actual0, false, 'Does not edit other locks');
      assert.equal(actual1, false, 'Does not edit other locks');

      await song_db.close();
      finish();
    });
  });

  describe('finds best song to remove', () => {
    it('returns empty object if no songs are in that database', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);

      const result0 = await song_db.bestToRemove();

      assert.deepEqual(result0, {}, 'Returns empty object');

      await song_db.close();
      finish();
    });

    it('returns empty object if all songs in database are locked', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);

      const song_uid0 = 'yt$M1vsdF4VfUo';
      const cache_location0 = 'cache/location0';
      await song_db.addSong(song_uid0, cache_location0);
      await song_db.cacheSong(song_uid0);
      await song_db.setSizeBytes(song_uid0, 100);
      await song_db.incrementPlaybacks(song_uid0);
      await song_db.addLock(song_uid0);

      const song_uid1 = 'yt$IK-IlYIQvcU';
      const cache_location1 = 'cache/location1';
      await song_db.addSong(song_uid1, cache_location1);
      await song_db.cacheSong(song_uid1);
      await song_db.setSizeBytes(song_uid1, 100);
      await song_db.incrementPlaybacks(song_uid1);
      await song_db.addLock(song_uid1);

      const result0 = await song_db.bestToRemove();

      assert.deepEqual(result0, {}, 'Returns empty object');

      await song_db.close();
      finish();
    });

    it('returns empty object is size_over_plays is 0 for all songs', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);

      const song_uid0 = 'yt$M1vsdF4VfUo';
      const cache_location0 = 'cache/location0';
      await song_db.addSong(song_uid0, cache_location0);
      await song_db.cacheSong(song_uid0);

      const song_uid1 = 'yt$IK-IlYIQvcU';
      const cache_location1 = 'cache/location1';
      await song_db.addSong(song_uid1, cache_location1);
      await song_db.cacheSong(song_uid1);

      const result0 = await song_db.bestToRemove();

      assert.deepEqual(result0, {}, 'Returns empty object');

      await song_db.close();
      finish();
    });

    it('returns correct best song to delete', async () => {
      const db_location = path.join(db_directory, uniqueID());
      const song_db = createDB(db_location);

      const song_uid0 = 'yt$M1vsdF4VfUo';
      const cache_location0 = 'cache/location0';
      await song_db.addSong(song_uid0, cache_location0);
      await song_db.cacheSong(song_uid0);
      await song_db.setSizeBytes(song_uid0, 100);
      await song_db.incrementPlaybacks(song_uid0);

      const song_uid1 = 'yt$IK-IlYIQvcU';
      const cache_location1 = 'cache/location1';
      await song_db.addSong(song_uid1, cache_location1);
      await song_db.cacheSong(song_uid1);
      await song_db.setSizeBytes(song_uid1, 101);
      await song_db.incrementPlaybacks(song_uid1);

      const result0 = await song_db.bestToRemove();
      const expected0 = {
        song_uid: song_uid1,
        cached: true,
        cache_location: cache_location1,
        start_chunk: -1,
        end_chunk: -1,
        size_bytes: 101,
        playbacks: 1,
        size_over_plays: 101,
      };
      assert.deepEqual(result0, expected0, 'Returns correct song');

      await song_db.addLock(song_uid1);

      const result1 = await song_db.bestToRemove();
      const expected1 = {
        song_uid: song_uid0,
        cached: true,
        cache_location: cache_location0,
        start_chunk: -1,
        end_chunk: -1,
        size_bytes: 100,
        playbacks: 1,
        size_over_plays: 100,
      };
      assert.deepEqual(result1, expected1, 'Returns correct song after lock is added');

      await song_db.close();
      finish();
    });
  });
}
