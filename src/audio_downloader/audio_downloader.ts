import fs from "fs";
import path from "path";
import ipc from "node-ipc";

import MIKU_CONSTS from "../constants";
import Logger from "../logger";
import SourceDownloader from "./source_downloader";
import YoutubeDownloader from "./youtube_downloader";

const MAX_CACHESIZE_MB = parseInt(process.env.MAX_CACHESIZE_MB);
const CACHE_DIRECTORY = process.env.CACHE_DIRECTORY;

export enum SourceType { Youtube, GoogleDrive }

export type SourceId = {
  source_type: SourceType;
  uid?: string;
  url?: string;
}

/**
 * AudioDownloader - Handles downloading and caching audio
 */
class AudioDownloader {
  private downloading_ = false;
  private download_queue_: Array<SourceDownloader> = [];

  private downloaders_list_: Array<{
    list_index: number;
    play_count: number;
    downloader: SourceDownloader
  }> = [];

  private youtube_downloaders_logger_ = new Logger("youtube_downloaders");
  private youtube_cache_location_: string;
  private youtube_cache_: {
    [key: string]: {
      list_index: number;
      play_count: number;
      downloader: YoutubeDownloader
    }
  } = {};

  private cachesize_MB_ = 0;

  private log_: Logger;

  /**
   * @param logger - logger
   */
  constructor(logger: Logger) {
    this.log_ = logger;

    this.log_.debug(`Clearing cache directory at {location:${CACHE_DIRECTORY}}`);
    try {
      fs.rmSync(CACHE_DIRECTORY, { recursive: true });
      this.log_.debug(`Cleared cache directory at {location:${CACHE_DIRECTORY}}`);
    } catch (error) {
      this.log_.warn(`Error clearing cache directory at {location:${CACHE_DIRECTORY}}`, error);
    }

    this.log_.debug(`Making cache directory at {location:${CACHE_DIRECTORY}}`);
    try {
      fs.mkdirSync(CACHE_DIRECTORY);
      this.log_.debug(`Made cache directory at {location:${CACHE_DIRECTORY}}`);
    } catch (error) {
      this.log_.warn(`Error making cache directory at {location:${CACHE_DIRECTORY}}`, error);
    }

    this.youtube_cache_location_ = path.join(CACHE_DIRECTORY, "youtube");
    this.log_.debug(`Making youtube cache directory at {location:${this.youtube_cache_location_}}`);
    try {
      fs.mkdirSync(this.youtube_cache_location_);
      this.log_.debug(`Made youtube cache directory at {location:${this.youtube_cache_location_}}`);
    } catch (error) {
      this.log_.warn(`Error making youtube_cache_location at {location:${this.youtube_cache_location_}}`, error);
    }
  }

  /**
   * QueueDownload() - Queues a downloader, starts it's download if still under max concurrent downloads
   * @param downloader - downloader to queue up
   */
  private QueueDownload(downloader: SourceDownloader) {
    downloader.events.on("finish", (success: boolean) => {
      if (success) this.cachesize_MB_ += downloader.cachesize_MB;
    });

    this.download_queue_.push(downloader);
    if (!this.downloading_) {
      const to_download = this.download_queue_.shift();
      this.StartDownload(to_download);
    }
  }

  /**
   * FreeSpace() - Frees given amount in cache
   * @param amount_mb - amount in megabytes to free
   */
  private async FreeSpace(amount_mb: number) {
    if (amount_mb > MAX_CACHESIZE_MB) {
      this.log_.fatal(`Space of {amount_mb:${amount_mb}} required, but {max_cachesize_MB:${MAX_CACHESIZE_MB}} avaliable`);
      return;
    }
    if (this.cachesize_MB_ + amount_mb < MAX_CACHESIZE_MB) return;

    let i = this.downloaders_list_.length - 1;
    while (amount_mb > 0 && i >= 0) {
      const downloader = this.downloaders_list_[i].downloader;
      this.log_.debug(`Attempting to free {amount_mb:${amount_mb}} in cache by deleting source with {uid:${downloader.uid}}`);

      try {
        const delete_amount = downloader.cachesize_MB;
        await downloader.DeleteCache();
        amount_mb -= delete_amount;

        // Remove source from cache
        if (this.youtube_cache_[downloader.uid]) {
          for (let i = this.youtube_cache_[downloader.uid].list_index; i < this.downloaders_list_.length; i++) {
            this.downloaders_list_[i].list_index--;
          }
          this.downloaders_list_.splice(this.youtube_cache_[downloader.uid].list_index, 1);

          delete this.youtube_cache_[downloader.uid];
        }

        this.log_.debug(`Freed {amount_mb:${amount_mb}} in cache by deleting source with {uid:${downloader.uid}}`);
      } catch {
        this.log_.debug(`Could not free  {amount_mb:${amount_mb}} in cache by deleting source with {uid:${downloader.uid}} likely due to delete lock`);
      }
      i--;
    }
  }

  /**
   * StartDownload() - Starts downloader and sets listeners to move onto next download once finished
   * @param downloader - downloader to start
   */
  private async StartDownload(downloader: SourceDownloader) {
    if (!downloader) return;

    this.downloading_ = true;

    const space_required = await downloader.EstimateCacheSize_MB();
    await this.FreeSpace(space_required + 1);

    this.log_.debug(`Starting download for source with {uid:${downloader.uid}}`);
    downloader.BeginDownload();

    downloader.events.on("finish", (success) => {
      if (success) this.log_.debug(`Download for source with {uid:${downloader.uid}} completed successfully`);
      else this.log_.debug(`Download for source with {uid:${downloader.uid}} ended unsuccessfully`);

      this.downloading_ = false;
      this.StartDownload(this.download_queue_.shift());
    });
  }

  /**
   * QueueYoutubeSource() - Queues a youtube source to be downloaded
   * @param source_id 
   * @returns 
   */
  private QueueYoutubeSource(source_id: SourceId): string | undefined {
    this.log_.debug(`Attempting to queue youtube source with {url:${source_id.url}}`);

    let uid = source_id.uid;
    if (!uid) {
      try {
        uid = YoutubeDownloader.GenerateUID(source_id.url);
      } catch (error) {
        return error.message;
      }
      this.log_.debug(`Parsed {uid:${uid}} from youtube source with {url: ${source_id.url}}`);
    }

    if (this.youtube_cache_[uid]) {
      this.log_.debug(`Youtube source with {uid:${uid}} found in cache, already queued`);
      return undefined;
    }

    this.log_.debug(`Youtube source with {uid:${uid}} not found in cache, queueing download and adding to index`);
    const downloader_tracker = {
      list_index: this.downloaders_list_.length,
      play_count: 0,
      downloader: new YoutubeDownloader(uid, this.youtube_cache_location_, this.youtube_downloaders_logger_)
    };
    this.youtube_cache_[uid] = downloader_tracker
    this.downloaders_list_.push(downloader_tracker);
    this.QueueDownload(downloader_tracker.downloader);
    return undefined;
  }

  /**
   * KeepInOrder() - Keeps list given sorted by play_count assuming only item at changed_obejct_index was changed
   * @param changed_object_index - index of changed object in ist
   * @param list - list to keep in order
   */
  private KeepInOrder(changed_object_index: number, list: Array<{
    list_index: number;
    play_count: number;
    downloader: SourceDownloader
  }>) {
    while ((changed_object_index - 1) >= 0 && list[changed_object_index - 1].play_count < list[changed_object_index].play_count) {
      list[changed_object_index - 1].list_index++;
      list[changed_object_index].list_index--;

      const temp = list[changed_object_index - 1];
      list[changed_object_index - 1] = list[changed_object_index];
      list[changed_object_index] = temp;

      changed_object_index--;
    }
  }

  /**
   * QueueSource() - Queues a source to be downloaded
   * @param source_id - source id of source to queue
   * @returns user friendly error message if failed 
   */
  QueueSource(source_id: SourceId): string | undefined {
    switch (source_id.source_type) {
      case (SourceType.Youtube): {
        return this.QueueYoutubeSource(source_id);
      }
      default: {
        return "Error Queueing Song Download: Unknown Source Type";
      }
    }
  }

  /**
   * GetYoutubeCacheLocation() - Gets location of first chunk of cached youtube song once streamable
   * @param source_id - source id of cache location to fetch
   */
  private GetYoutubeCacheLocation(source_id: SourceId): Promise<string> {
    let uid = source_id.uid;
    if (!uid) {
      try {
        uid = YoutubeDownloader.GenerateUID(source_id.url);
      } catch (error) {
        return error.message;
      }
      this.log_.debug(`Parsed {uid:${uid}} from youtube source with {url: ${source_id.url}}`);
    }

    if (!this.youtube_cache_[uid]) return Promise.reject();
    this.youtube_cache_[uid].play_count++;
    this.KeepInOrder(this.youtube_cache_[uid].list_index, this.downloaders_list_);

    return this.youtube_cache_[uid].downloader.GetCacheLocation();
  }

  /**
   * GetCacheLocation() - Gets location of first chunk of cached song once streamable
   * @param source_id - source id of cache location to fetch
   * @returns Promise that resolve to string or rejects if failed
   */
  GetCacheLocation(source_id: SourceId): Promise<string> {
    switch (source_id.source_type) {
      case (SourceType.Youtube): {
        return this.GetYoutubeCacheLocation(source_id);
      }
      default: {
        return Promise.reject();
      }
    }
  }
}

export enum FunctionType { QueueSource, GetCacheLocation }
export type FunctionRequest = {
  uid: string;
  function_type: FunctionType;
  args: Array<any>;
};
export type FunctionResponse = {
  success: boolean;
  error?: Error;
  result: any;
}

const logger = new Logger("audio_downloader");
const audio_downloader = new AudioDownloader(logger);

ipc.config.silent = true;
ipc.config.rawBuffer = false;
ipc.config.appspace = MIKU_CONSTS.APP_NAMESPACE;
ipc.config.id = MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID;

logger.debug(`Starting ipc server for audio downloader in {namespace:${MIKU_CONSTS.APP_NAMESPACE}} and {id:${MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID}}`);
ipc.serve(() => {
  ipc.server.on("error", (error) => {
    logger.error("Error on ipc server", error);
  });

  ipc.server.on("socket.disconnected", (socket, destroyed_socket_id) => {
    logger.warn(`IPC socket with {id:${destroyed_socket_id}} disconnected`);
  });

  ipc.server.on("message", async (data: FunctionRequest, socket) => {
    switch (data.function_type) {
      case (FunctionType.QueueSource): {
        let result;
        try {
          result = audio_downloader.QueueSource(data.args[0]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      case (FunctionType.GetCacheLocation): {
        let result;
        try {
          result = await audio_downloader.GetCacheLocation(data.args[0]);
          ipc.server.emit(socket, data.uid, { success: true, result });
        } catch (error) {
          ipc.server.emit(socket, data.uid, { success: false, error });
        }
        break;
      }
      default: {
        const error = new Error("Audio Downloader Interface Error: function type invalid");
        ipc.server.emit(socket, data.uid, { success: false, error });
      }
    }
  });
});

ipc.server.start();