import path from 'path';

import Logger from '../logger/logger';
import { ipc_config } from '../constants/constants';
import Component from './component';

const logger = new Logger('Component-Manager');
const components: Array<{ name: string; location: string }> = [
  {
    name: ipc_config.song_db_ipc_id,
    location: path.join(__dirname, '..', 'song_db', 'song_db_ipc_server.js'),
  },
  {
    name: ipc_config.music_ipc_id,
    location: path.join(__dirname, '..', 'music_cache', 'music_cache_ipc_server.js'),
  },
];

/**
 * StartComponents() - Starts miku's components
 * @param index - index of component to start
 * @returns - Promise that resolves once all components have started
 */
export default function StartComponents(index?: number): Promise<void> {
  if (!index) index = 0;
  if (index === components.length) return Promise.resolve();

  return new Promise((resolve) => {
    const component = new Component(components[index].name, components[index].location, logger);
    component.events.once('ready', () => {
      resolve(StartComponents(index + 1));
    });
  });
}
