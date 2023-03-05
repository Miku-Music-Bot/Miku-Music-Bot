import Logger from "../logger/logger";

export enum MusicCacheFunctions { cache, cacheLocation }

export default class MusicCache {
  constructor(logger: Logger) {
    //
  }

  cache(url: string): void { return; }

  cacheLocation(url: string): { uid: string, loc: string, end_chunk: number } {
    return { uid: "", loc: "", end_chunk: 0 };
  }
}

