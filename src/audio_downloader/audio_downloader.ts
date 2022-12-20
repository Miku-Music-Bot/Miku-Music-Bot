import fs from "fs";
import path from "path";

import Logger from "../logger";
import SourceDownloader from "./source_downloader";
import YoutubeDownloader from "./youtube_downloader";

export enum SourceType { Youtube, GoogleDrive }

export type SourceId = {
  source_type: SourceType;
  uid?: string;
  identifier?: string;
}

/**
 * Handles downloading and caching audio
 */
export default class AudioDownloader {
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

  private cache_directory_: string;
  private max_cachesize_MB_: number;

  private log_: Logger;

  /**
   * @param cache_directory - directory to place audio cache
   * @param max_concurrent_downloads - number of concurrent downloads allowed
   * @param max_cachesize_MB - maximum size of cache in megabytes
   */
  constructor(cache_directory: string, max_cachesize_MB: number, logger: Logger) {
    this.cache_directory_ = cache_directory;
    this.max_cachesize_MB_ = max_cachesize_MB;
    this.log_ = logger;

    this.youtube_cache_location_ = path.join(this.cache_directory_, "youtube");
    try {
      fs.mkdirSync(this.youtube_cache_location_);
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
    if (amount_mb > this.max_cachesize_MB_) {
      this.log_.fatal(`Space of {amount_mb:${amount_mb}} required, but {max_cachesize_MB:${this.max_cachesize_MB_}} avaliable`);
      return;
    }
    if (this.cachesize_MB_ + amount_mb < this.max_cachesize_MB_) return;

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
    this.log_.debug(`Attempting to queue youtube source with {identifier:${source_id.identifier}}`);

    let uid;
    try {
      uid = YoutubeDownloader.GenerateUID(source_id.identifier);
    } catch (error) {
      return error.message;
    }
    this.log_.debug(`Parsed {uid:${uid}} from youtube source with {identifier: ${source_id.identifier}}`);

    if (this.youtube_cache_[uid]) {
      this.log_.debug(`Youtube source with {uid:${uid}} found in cache, already queued`);
      return undefined;
    }

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
   * GetCacheLocation() - Gets location of first chunk of cached song once streamable
   * @param source_id - source id of cache location to fetch
   */
  GetCacheLocation(source_id: SourceId): Promise<string> {
    switch (source_id.source_type) {
      case (SourceType.Youtube): {
        if (!this.youtube_cache_[source_id.uid]) return Promise.reject();

        this.youtube_cache_[source_id.uid].play_count++;
        this.KeepInOrder(this.youtube_cache_[source_id.uid].list_index, this.downloaders_list_);

        return this.youtube_cache_[source_id.uid].downloader.GetCacheLocation();
      }
      default: {
        return Promise.reject();
      }
    }
  }
}