import { assert } from 'chai';
import sinon from 'sinon';
import ipc from 'node-ipc';
import path from 'path';

import { createDirectory, removeDirectory } from '../test_utils/test_directory.test';
import { createLoggerStub, stubLogger } from '../test_utils/stub_logger.test';
import stubConfig from '../test_utils/stub_config.test';

import TestSongDB from './song_db_test_utils.test';
import * as SongDB from './song_db';
import SongDBInterface from './song_db_ipc_interface';
import * as SongDBServer from './song_db_ipc_server';
import * as StartIPCServer from '../ipc_template/ipc_server';

const SONG_DB_DIRECTORY = path.join(__dirname, 'test_songdb');

// Test SongDatabase Class itself
describe('SongDatabase', () => {
  before(() => {
    createDirectory(SONG_DB_DIRECTORY);
  });

  beforeEach(() => {
    stubLogger();
  });

  after(() => {
    removeDirectory(SONG_DB_DIRECTORY);
  });

  TestSongDB(
    SONG_DB_DIRECTORY,
    (db_location: string) => {
      stubConfig({
        songdb_config: {
          db_location,
        },
      });

      return new SongDB.default(createLoggerStub());
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
  });

  beforeEach(() => {
    stubConfig({
      ipc_config: {
        retry: 0,
      },
    });
    stubLogger();
  });

  after(() => {
    removeDirectory(SONG_DB_DIRECTORY);
  });

  let component: typeof ipc;
  TestSongDB(
    SONG_DB_DIRECTORY,
    (db_location: string) => {
      stubConfig({
        songdb_config: {
          db_location,
        },
      });

      component = SongDBServer.StartSongDBComponent();

      return new SongDBInterface(createLoggerStub());
    },
    () => {
      component.server.stop();
    }
  );

  describe('Start Component', () => {
    it('should start component when "start-component" argument is set', async () => {
      const song_db_stub = sinon.stub(SongDB, 'default').callsFake(() => {
        return {} as unknown as SongDB.default;
      });
      const start_ipc_server_stub = sinon.stub(StartIPCServer, 'default').callsFake(sinon.fake());

      process.argv.push('start-component');
      SongDBServer.CheckStartComponent();

      assert.equal(song_db_stub.callCount, 1, 'Component was started');
      assert.equal(start_ipc_server_stub.callCount, 1, 'Component was started');
    });
  });
});
