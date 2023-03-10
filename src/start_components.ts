import path from 'path';
import { fork } from 'child_process';
import EventEmitter from 'events';
import TypedEventEmitter from 'typed-emitter';

import Logger from './logger/logger';
import MIKU_CONSTS from './constants';

class Component {
  private events_ = new EventEmitter() as TypedEventEmitter<{ ready: () => void }>;
  get events() {
    return this.events_;
  }

  private component_name_: string;
  private js_file_location_: string;

  private log_: Logger;

  constructor(component_name: string, js_file_location: string, logger: Logger) {
    this.component_name_ = component_name;
    this.js_file_location_ = js_file_location;
    this.log_ = logger;
    this.StartComponent();
  }

  StartComponent() {
    this.log_.info(`Starting component ${this.component_name_}`);
    const component = fork(this.js_file_location_);

    component.on('message', (message) => {
      if (message === 'ready') {
        this.log_.info(`Component ${this.component_name_} is ready`);
        this.events_.emit('ready');
      }
    });

    component.on('error', (error) => {
      this.log_.error(`Component at {location:${this.js_file_location_}} named {component_name:${this.component_name_}} encountered an error`, error);
    });

    component.on('exit', (code) => {
      this.log_.debug(`Component at {location:${this.js_file_location_}} named {component_name:${this.component_name_}} exited with {code:${code}}, restarting it in 5 seconds`);
      component.removeAllListeners();
      setTimeout(() => this.StartComponent(), 5000);
    });
  }
}

const logger = new Logger('Component-Manager');
const components: Array<{ name: string; location: string }> = [
  {
    name: MIKU_CONSTS.ipc_config.song_db_ipc_id,
    location: path.join(__dirname, 'song_db', 'song_db_ipc_server.js'),
  },
  {
    name: MIKU_CONSTS.ipc_config.music_ipc_id,
    location: path.join(__dirname, 'music_cache', 'music_cache_ipc_server.js'),
  },
];

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
