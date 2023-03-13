import TypedEventEmitter from 'typed-emitter';

export type DownloaderEvents = {
  error: (error: Error) => void;
  finished: () => void;
  deferred: () => void;
};

/**
 * DownloaderInterface() - How a downloader should be interacted with
 * Download lifecycle:
 * - call start_dl() to start the download, listen on events for 3 possibilities:
 * 'error':
 *    - something went wrong with download, retry or ignore or whatever
 * 'finished':
 *    - download finished (also emitted if error event is trigger or if download was stopped)
 * 'deferred':
 *    - download should be downloaded at a later time (song is a livestream)
 *    - to download later, use the start_dl_imm() method
 *
 * - call stop_dl() to stop the download
 */
export default interface DownloaderInterface {
  readonly events: TypedEventEmitter<DownloaderEvents>;

  /**
   * start_dl() - Starts a download but skips if song should be downloaded at a later time
   * @param url - url of song to download
   * @param cache_location - disk location to download song to
   */
  start_dl(url: string, cache_location: string): void;

  /**
   * start_dl() - Starts a download no matter what
   * @param url - url of song to download
   * @param cache_location - disk location to download song to
   */
  start_dl_imm(url: string, cache_location: string): void;

  /**
   * stop_dl() - Stops an ongoing download
   */
  stop_dl(): void;
}
