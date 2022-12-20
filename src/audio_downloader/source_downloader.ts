import TypedEventEmitter from "typed-emitter";

export enum DownloaderTypes { Youtube, GoogleDrive }

export type DownloaderEvents = {
  "start": () => void;                        // emitted when download is initiated (only valid for non-live videos)
  "streamable": () => void;                   // emitted when download is ready to be streamed 
  "finish": (success: boolean) => void;       // emitted when download is finished or failed (only valid for non-live videos)
};

export default interface SourceDownloader {
  get events(): TypedEventEmitter<DownloaderEvents>;

  get uid(): string;                  // unique identifier of song
  get type(): DownloaderTypes;        // type of downloader
  get downloaded(): boolean;          // if song is fully downloaded or not
  get cachesize_MB(): number;         // size of the cached downloaded song ins megabytes

  /**
   * EstimateCacheSize() - Estimates the size of the downloaded cache before download
   * @returns Promise that resolves to number if successful, rejected if failed
   */
  EstimateCacheSize_MB(): Promise<number>;

  /**
   * BeginDownload() - Begins the download from the source, nothing happens if failed
   * @returns void
   */
  BeginDownload(): void;

  /**
   * DeleteCache() - Deletes downloaded audio
   * @returns Promise that resolves to location if successful, rejected if failed
   */
  GetCacheLocation(): Promise<string>;

  /**
   * ReleaseDeleteLock() - Release lock on audio
   * @returns void
   */
  ReleaseDeleteLock(): void;

  /**
   * DeleteCache() - Deletes downloaded audio if there are no locks
   * @returns Promise that resolves if successful, rejected if failed
   */
  DeleteCache(): Promise<void>;
}