import sinon from 'sinon';
import ipc from 'node-ipc';
import path from 'path';

import TestSongDB from './song_db_test_utils.test';
import { SongDBConfig } from '../constants/constants';
import SongDB from './song_db';
import SongDBInterface from './song_db_ipc_interface';
import StartSongDBComponent from './song_db_ipc_server';

import { createDirectory, removeDirectory } from '../test_utils/test_directory.test';
import stubDummyLogger, { dummy_logger } from '../test_utils/stub_logger.test';

const SONG_DB_DIRECTORY = path.join(__dirname, 'test_songdb');

// Test SongDatabase Class itself
describe('SongDatabase', () => {
  before(() => {
    createDirectory(SONG_DB_DIRECTORY);
    stubDummyLogger();
  });

  after(() => {
    removeDirectory(SONG_DB_DIRECTORY);
  });

  TestSongDB(
    SONG_DB_DIRECTORY,
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
});

// Test SongDatabaseInterface
describe('SongDatabaseInterface', () => {
  before(() => {
    createDirectory(SONG_DB_DIRECTORY);
    stubDummyLogger();
  });

  after(() => {
    removeDirectory(SONG_DB_DIRECTORY);
  });

  let component: typeof ipc;
  TestSongDB(
    SONG_DB_DIRECTORY,
    (db_location: string) => {
      const config: SongDBConfig = {
        db_location,
      };

      component = StartSongDBComponent(dummy_logger, config);

      return new SongDBInterface(dummy_logger);
    },
    () => {
      component.server.stop();
    }
  );
});
