/* eslint-disable @typescript-eslint/no-unused-vars */
import Logger from './logger';
import Profiler, { LevelThresholds } from './profiler';

// A fake logger object for use in tests
export const dummy_logger = {
  debug: (msg: string) => {
    console.log(msg);
    return;
  },
  info: (msg: string) => {
    return;
  },
  warn: (msg: string, error?: Error) => {
    return;
  },
  error: (msg: string, error?: Error) => {
    return;
  },
  fatal: (msg: string, error?: Error) => {
    return;
  },
  profile: (name: string, level_thresholds: LevelThresholds) => {
    const profiler = {
      stop: (options: object) => {
        return 0;
      },
    } as unknown as Profiler;
    return profiler;
  },
} as unknown as Logger;
