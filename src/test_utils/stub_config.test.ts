import sinon from 'sinon';
import * as config from '../constants/constants';

/**
 * stubConfig - stubs miku's constants with something else
 * @param new_config - new config to use
 */
export default function stubConfig(new_config: {
  ipc_config?: Partial<config.IPCConfig>;
  logger_config?: Partial<config.LoggerConfig>;
  songdb_config?: Partial<config.SongDBConfig>;
  music_cache_config?: Partial<config.MusicCacheConfig>;
  web_config?: Partial<config.WebConfig>;
}) {
  let prop: keyof typeof new_config;
  for (prop in new_config) {
    const c = Object.assign({}, config[prop]);
    Object.assign(c, new_config[prop]);
    sinon.stub(config, prop).value(c);
  }
}
