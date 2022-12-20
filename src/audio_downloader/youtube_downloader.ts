import { EventEmitter } from "stream";
import TypedEventEmitter from "typed-emitter";
import { PassThrough } from "stream";
import ytdl from "ytdl-core";
import ytdlp from "node-ytdlp-wrap";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
ffmpeg.setFfmpegPath(ffmpegPath);

import SourceDownloader, { DownloaderEvents, DownloaderTypes } from "./source_downloader";
import Logger from "../logger";

const AUDIO_CHANNELS = 2;
const AUDIO_FREQUENCY = 48000;
const PCM_FORMAT = "s16le";
const BIT_DEPTH = 16;
const SIZE_OF_1_SEC_PCM = AUDIO_CHANNELS * AUDIO_FREQUENCY * BIT_DEPTH / 8;    // Length of 1 second of pcm audio
const CHUNK_SIZE = SIZE_OF_1_SEC_PCM * 10;

const STREAMABLE_AFTER_NUM_CHUNKS = 2;

/**
 * YoutubeDownloader - Handles downloading audio from youtube
 */
export default class YoutubeDownloader implements SourceDownloader {
  private events_ = new EventEmitter as TypedEventEmitter<DownloaderEvents>
  get events() { return this.events_; }

  private uid_: string;
  get uid() { return this.uid_; }
  get type() { return DownloaderTypes.Youtube; }

  private downloading_ = false;

  private streamable_ = false;
  private downloaded_ = false;
  get downloaded() { return this.downloaded_; }

  private cachesize_MB_ = 0;
  get cachesize_MB() { return this.cachesize_MB_; }
  private cache_location_: string;

  private delete_lock_ = 0;

  private log_: Logger;

  /**
   * constructor()
   * @param uid - unique identifier of youtube video
   * @param cache_location - location to save downloaded audio to
   */
  constructor(uid: string, cache_location: string, logger: Logger) {
    this.uid_ = uid;
    this.cache_location_ = cache_location;
    this.log_ = logger;

    this.log_.debug(`Created Youtube downloader for video with {uid:${this.uid_}}`);
  }

  /**
   * EstimateCacheSize() - Estimates the size of the downloaded cache before download
   * @returns Promise that resolves to number if successful, rejected if failed
   */
  async EstimateCacheSize_MB(): Promise<number> {
    return 1;
  }

  /**
   * DownloadSong() - Downloads audio
   * @param live - video is a livestream or not
   */
  private async DownloadSong(live: boolean): Promise<void> {
    this.log_.info(`Downloading song with uid: ${this.uid_}`);
    const download_profiler = this.log_.profile(`Download for video with {uid: ${this.uid_}}`);
    this.events_.emit("start");

    // Try making directory for song
    try {
      this.log_.debug(`Making directory at {location: ${this.cache_location_}} for video of {uid: ${this.uid_}}`);
      await fs.promises.mkdir(this.cache_location_);
    } catch (error) {
      this.log_.warn(`Error while making director at {location: ${this.cache_location_}} for video of {uid: ${this.uid_}}`, error);
    }

    // determine download format to use
    let format = "-f bestaudio";
    if (live) {
      this.log_.debug(`Video with {uid: ${this.uid_}} is live, using live itags`);
      format = "93/92/91/94/95/96";
    }

    // start download from youtube
    const raw_youtube_download = ytdlp.downloader(this.uid_, [
      "-o", "-",
      format,
      "--no-playlist",
      "--ffmpeg-location", ffmpegPath,
      "--quiet"
    ]);

    // create ffmpeg processor
    const raw_pcm_s16le_output = new PassThrough();
    ffmpeg(raw_youtube_download.stream)
      .audioChannels(AUDIO_CHANNELS)
      .audioFrequency(AUDIO_FREQUENCY)
      .format(PCM_FORMAT)
      .on("start", (command: string) => {
        this.log_.debug(`Started ffmpeg process to convert youtube download to pcm using {command: ${command}} for video with {uid: ${this.uid_}}`);
      })
      .on("error", (error) => {
        this.log_.error(`Error on download stream for video with {uid: ${this.uid_}}`, error);
        download_profiler.stop();
        this.log_.info(`Song with uid: ${this.uid_} failed to download`);
        this.events_.emit("finish", false);
      })
      .pipe(raw_pcm_s16le_output);

    // writes a chunk in directory
    let chunk_num = 0;
    const write_chunk = async (chunk: Buffer) => {
      try {
        const location = path.join(this.cache_location_, chunk_num.toString());
        this.log_.debug(`Writing chunk number {chunk_num: ${chunk_num}} for video with {uid: ${this.uid_}} at {location: ${location}}`);

        this.cachesize_MB_ += Buffer.byteLength(chunk) / (1 << 20);
        await fs.promises.writeFile(location, chunk);

        if (chunk_num === STREAMABLE_AFTER_NUM_CHUNKS) {
          this.log_.debug(`${STREAMABLE_AFTER_NUM_CHUNKS} chunks buffered, video with {uid: ${this.uid_}} is now streamable`);
          this.streamable_ = true;
          this.events_.emit("streamable");
        }
        chunk_num++;
      } catch (error) {
        this.log_.info(`Song with uid: ${this.uid_} failed to download`);
        this.log_.fatal(`Error while writing chunk number {chunk_num: ${chunk_num}} for video with {uid: ${this.uid_}}`, error);
      } finally {
        download_profiler.stop();
        this.events_.emit("finish", false);
      }
    }

    // chunks data into groups 
    let data_chunk = Buffer.alloc(0);
    const chunk_data = (data: Buffer) => {
      data_chunk = Buffer.concat([data_chunk, data]);

      // Once data_chunk is the right size, save to file
      while (Buffer.byteLength(data_chunk) >= CHUNK_SIZE) {
        const save = data_chunk.subarray(0, CHUNK_SIZE);
        data_chunk = data_chunk.subarray(CHUNK_SIZE);
        write_chunk(save);
      }
    }

    raw_pcm_s16le_output.on("data", (data) => { chunk_data(data); });
    raw_pcm_s16le_output.on("end", async () => {
      // Reaching this indicates successful download
      await write_chunk(data_chunk);

      this.downloading_ = false;
      this.downloaded_ = true;

      data_chunk = undefined;

      this.events_.emit("finish", true);
      if (!this.streamable_) {
        this.streamable_ = true;
        this.events_.emit("streamable");
      }
      this.log_.info(`Song with uid: ${this.uid_} downloaded`);
      download_profiler.stop();
    });
  }

  /**
   * BeginDownload() - Begins the download from the source, nothing happens if failed
   * @returns void
   */
  async BeginDownload(): Promise<void> {
    this.log_.debug(`Beginning download for video with {uid: ${this.uid_}}`);

    if (this.downloading_) {
      this.log_.debug(`Download for video with {uid: ${this.uid_}} already downloading, ignoring call to download`);
      return;
    }
    if (this.downloaded_) {
      this.log_.debug(`Download for video with {uid: ${this.uid_}} already downloaded, ignore call to download`);
      return;
    }
    this.downloading_ = true;

    // Check if video is live or not
    const fetch_info_profiler = this.log_.profile(`Fetching video info for video with {uid: ${this.uid_}}`);
    let live;
    try {
      const video_info = await ytdl.getBasicInfo(this.uid_);
      live = video_info.videoDetails.isLiveContent;
    } catch (error) {
      this.downloading_ = false;
      this.log_.error(`Error fetching video info for video with {uid: ${this.uid_}}`, error);
    } finally {
      fetch_info_profiler.stop({ conditional_level: { "warn": 1000 } });
    }

    // Don't download if video is a livestream
    if (live) {
      this.log_.debug(`Video with {uid: ${this.uid_}} is live, skipping download for now`);
      this.downloading_ = false;
      return;
    }
    this.DownloadSong(live);
  }

  /**
   * GetStream() - Gets location of cached song once streamable
   * @returns Promise that resolves to location if successful, rejected if failed
   */
  async GetCacheLocation(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.BeginDownload();
      if (this.streamable_) {
        this.delete_lock_++;
        resolve(this.cache_location_);
        return;
      }

      const wait_for_streamable: Promise<void> = new Promise((resolve, reject) => {
        this.events_.on("streamable", () => { resolve(); });
        this.events_.on("finish", (success) => { if (!success) reject(); });
      });

      wait_for_streamable.
        then(() => {
          this.delete_lock_++;
          resolve(this.cache_location_);
        })
        .catch(() => {
          reject();
        })
    });
  }

  /**
 * ReleaseDeleteLock() - Release lock on audio
 * @returns void
 */
  ReleaseDeleteLock(): void {
    this.delete_lock_--;
  }

  /**
   * DeleteCache() - Deletes downloaded audio
   * @returns Promise that resolves if successful, rejected if failed
   */
  async DeleteCache(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.downloading_) {
        this.log_.debug(`Video with {uid: ${this.uid_}} currently downloading, refusing to delete cache`);
        reject();
        return;
      }

      if (this.delete_lock_ !== 0) {
        this.log_.debug(`Video with {uid: ${this.uid_}} curretly being streamed, refusing to delete cache`);
        reject();
        return;
      }

      try {
        this.log_.info(`Deleting cached song with uid: ${this.uid_}`);
        await fs.promises.rm(this.cache_location_, { recursive: true });
        this.downloaded_ = false;
        this.streamable_ = false;
        resolve();
      } catch (error) {
        this.log_.warn(`Error while deleting cache for video with {uid: ${this.uid_}}`, error);
        reject();
      }
    });
  }
}