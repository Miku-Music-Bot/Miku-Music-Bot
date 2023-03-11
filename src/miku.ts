import StartComponents from './start_components/start_components';
import SongDBInterface from './song_db/song_db_ipc_interface';
import Logger from './logger/logger';

StartComponents().then(() => {
  const logger = new Logger('Miku');
  const song_db = new SongDBInterface(logger);
});
