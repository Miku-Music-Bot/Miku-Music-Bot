import ipc from 'node-ipc';
import fs from 'fs-extra';
import path from 'path';

import TestSongDB from './song_db.test';
import { dummy_logger } from '../logger/dummy_logger.test';
import { SongDBConfig } from '../constants/constants';
import SongDB from './song_db';
import SongDBInterface from './song_db_ipc_interface';
import StartSongDBComponent from './song_db_ipc_server';

const SONG_DB_DIRECTORY = path.join(__dirname, 'test_songdb');

// ensure empty temporary log directory exists before running tests
before(async () => {
  fs.mkdirSync(SONG_DB_DIRECTORY, { recursive: true });
  fs.emptyDirSync(SONG_DB_DIRECTORY);
});

// delete temporary log directory after running tests
after(async () => {
  fs.rmSync(SONG_DB_DIRECTORY, { recursive: true, force: true });
});

// Test SongDatabase Class itself
TestSongDB(
  SONG_DB_DIRECTORY,
  'Song Database',
  (db_location: string) => {
    const config: SongDBConfig = {
      db_location,
    };

    return new SongDB(dummy_logger, config);
  },
  () => {
    return;
  }
);

// // Test SongDatabaseInterface
// let component: typeof ipc;
// TestSongDB(
//   SONG_DB_DIRECTORY,
//   'Song Database Interface',
//   (db_location: string) => {
//     const config: SongDBConfig = {
//       db_location,
//     };

//     component = StartSongDBComponent(dummy_logger, config);

//     return new SongDBInterface(dummy_logger);
//   },
//   () => {
//     component.server.stop();
//   }
// );
