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

import MIKU_CONSTS from "../constants";
import SourceDownloader, { DownloaderEvents, DownloaderTypes } from "./source_downloader";
import Logger from "../logger";



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

  private start_chunk_number_ = 0;

  private delete_lock_ = 0;

  private log_: Logger;

  /**
   * GenerateUID() - Generates a uid from given youtube link
   * @param youtube_link - youtube link to generate uid from
   * @returns string of uid or throws error if failed
   */
  static GenerateUID(youtube_link: string) {
    const is_youtube_video_regex = /^(https?\:\/\/)?((www\.)?youtube\.com|youtu\.be)\/.+$/;
    const parse_video_id_regex = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;

    // Check that link is a valid youtube url
    const is_youtube_video = youtube_link.match(is_youtube_video_regex);
    if (!is_youtube_video) throw new Error(`Error Queueing Song Download: ${youtube_link} is not a valid youtube url`);

    // Parse out video id if link is valid
    const parsed = youtube_link.match(parse_video_id_regex);
    if (!parsed || parsed.length < 2) throw new Error(`Error Queueing Song Download: Failed to parse video id from ${youtube_link}`);
    return parsed[1];
  }

  /**
   * constructor()
   * @param uid - unique identifier of youtube video
   * @param cache_location - location to save downloaded audio to
   */
  constructor(uid: string, cache_location: string, logger: Logger) {
    this.uid_ = uid;
    this.cache_location_ = path.join(cache_location, this.uid_);
    this.log_ = logger;

    this.log_.debug(`Created Youtube downloader for video with {uid:${this.uid_}}`);

    // Catch unsuccessful finish event to clear cached data
    this.events.on("finish", (success) => {
      if (success) return;

      this.streamable_ = false;
      this.downloaded_ = false;
      this.downloading_ = false;

      this.log_.debug(`Youtube downloader for video with {uid:${this.uid_}} completed unsuccessfully, attempting to delete incomplete cached data`);
      fs.rm(this.cache_location_, { recursive: true }, (error) => {
        if (!error) {
          this.log_.debug(`Incomplete cached data deleted for video with {uid:${this.uid_}}`);
          this.cachesize_MB_ = 0;
          return;
        }
        this.log_.error(`Error while deleting incompleted cached data for video with {uid:${this.uid_}}`, error);
      });
    })
  }

  /**
   * FetchInfo() - Fetches video info
   * @returns info about video
   */
  private async FetchInfo(): Promise<{ live: boolean, duration_sec: number }> {
    const fetch_info_profiler = this.log_.profile(`Fetching video info for video with {uid: ${this.uid_}}`);
    let live;
    let duration_sec;
    try {
      const video_info = await ytdl.getBasicInfo(this.uid_);
      live = video_info.videoDetails.isLiveContent;
      duration_sec = parseInt(video_info.videoDetails.lengthSeconds);
    } catch (error) {
      this.downloading_ = false;
      this.log_.error(`Error fetching video info for video with {uid: ${this.uid_}}`, error);
      return Promise.reject();
    } finally {
      fetch_info_profiler.stop({ conditional_level: { "warn": 1000, "error": 5000 } });
    }

    return Promise.resolve({ live, duration_sec });
  }

  /**
   * EstimateCacheSize() - Estimates the size of the downloaded cache before download
   * @returns Promise that resolves to number if successful, rejected if failed
   */
  async EstimateCacheSize_MB(): Promise<number> {
    this.log_.debug(`Estimating cache size for song with {uid:${this.uid_}}`);

    let live;
    let duration_sec;
    try {
      const info = await this.FetchInfo();
      live = info.live;
      duration_sec = info.duration_sec;
    } catch {
      this.log_.warn(`Error fetching info for song with {uid:${this.uid_}}, giving inaccurate cache_size`);
      return 0;
    }

    let estimate;
    if (live) estimate = (MIKU_CONSTS.STREAMABLE_AFTER_NUM_CHUNKS * 2 * MIKU_CONSTS.CHUNK_SIZE) / (1 << 20);
    else estimate = (duration_sec * MIKU_CONSTS.SIZE_OF_1_SEC_PCM) / (1 << 20);
    this.log_.debug(`Estimating that cache size for song with {uid:${this.uid_}} will be {estimate:${estimate}}`);
    return estimate;
  }

  /**
   * DownloadSong() - Downloads audio
   * @param live - video is a livestream or not
   * @param duration_sec - duration of video in seconds (undefined for livestreams)
   */
  private async DownloadSong(live: boolean, duration_sec: number): Promise<void> {
    this.log_.info(`Downloading song with uid: ${this.uid_}`);
    const download_profiler = this.log_.profile(`Download for video with {uid:${this.uid_}}`);
    this.events_.emit("start");

    // Try making directory for song
    try {
      this.log_.debug(`Making directory at {location: ${this.cache_location_}} for video of {uid: ${this.uid_}}`);
      await fs.promises.mkdir(this.cache_location_);
    } catch (error) {
      this.log_.warn(`Error while making directory at {location: ${this.cache_location_}} for video of {uid: ${this.uid_}}`, error);
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
      .audioChannels(MIKU_CONSTS.AUDIO_CHANNELS)
      .audioFrequency(MIKU_CONSTS.AUDIO_FREQUENCY)
      .format(MIKU_CONSTS.PCM_FORMAT)
      .on("start", (command: string) => {
        this.log_.debug(`Started ffmpeg process to convert youtube download to pcm using {command: ${command}} for video with {uid: ${this.uid_}}`);
      })
      .on("error", (error) => {
        this.log_.error(`Error on download stream for video with {uid: ${this.uid_}}`, error);
        this.log_.info(`Song with uid: ${this.uid_} failed to download`);
        this.events_.emit("finish", false);
      })
      .pipe(raw_pcm_s16le_output);

    // writes a chunk in directory
    let chunk_num = 0;
    const write_chunk = async (chunk: Buffer) => {
      this.cachesize_MB_ += Buffer.byteLength(chunk) / (1 << 20);

      const location = path.join(this.cache_location_, chunk_num.toString());
      this.log_.debug(`Writing chunk number {chunk_num: ${chunk_num}} for video with {uid: ${this.uid_}} at {location: ${location}}`);
      try {
        await fs.promises.writeFile(location, chunk);
      } catch (error) {
        this.log_.info(`Song with uid: ${this.uid_} failed to download`);
        this.log_.fatal(`Error while writing chunk number {chunk_num: ${chunk_num}} for video with {uid: ${this.uid_}} to {location:${location}}`, error);
        download_profiler.stop({ level: "error" });
        this.events_.emit("finish", false);
      }

      if (chunk_num === MIKU_CONSTS.STREAMABLE_AFTER_NUM_CHUNKS) {
        this.log_.debug(`${MIKU_CONSTS.STREAMABLE_AFTER_NUM_CHUNKS} chunks buffered, video with {uid: ${this.uid_}} is now streamable`);
        this.streamable_ = true;
        this.events_.emit("streamable");
      }

      // Update start chunk number of video is live and is now streamable
      if (live && this.streamable_) this.start_chunk_number_ = chunk_num - MIKU_CONSTS.STREAMABLE_AFTER_NUM_CHUNKS;
      chunk_num++;

      // Delete old chunks for livestreams
      const chunk_num_to_delete = chunk_num - (MIKU_CONSTS.STREAMABLE_AFTER_NUM_CHUNKS * 2);
      if (!live || chunk_num_to_delete < 0) return;

      const delete_location = path.join(this.cache_location_, chunk_num_to_delete.toString());
      this.log_.debug(`Deleting old {chunk_num:${chunk_num_to_delete}} at {location:${delete_location}} for livestream with {uid:${this.uid_}}`);
      try {
        await fs.promises.unlink(delete_location);
        this.cachesize_MB_ -= MIKU_CONSTS.CHUNK_SIZE / (1 << 20);
      } catch (error) {
        this.log_.fatal(`Error while deleting {chunk_num:${chunk_num_to_delete}} at {location:${delete_location}} for livestream with {uid:${this.uid_}}`, error);
        this.events_.emit("finish", false);
      }
    }

    // chunks data into groups 
    let data_chunk = Buffer.alloc(0);
    const chunk_data = (data: Buffer) => {
      data_chunk = Buffer.concat([data_chunk, data]);

      // Once data_chunk is the right size, save to file
      while (Buffer.byteLength(data_chunk) >= MIKU_CONSTS.CHUNK_SIZE) {
        const save = data_chunk.subarray(0, MIKU_CONSTS.CHUNK_SIZE);
        data_chunk = data_chunk.subarray(MIKU_CONSTS.CHUNK_SIZE);
        write_chunk(save);
      }
    }

    raw_pcm_s16le_output.on("data", (data) => {
      // Abort download if is a livestream and nobody is listening anymore
      if (live && this.delete_lock_ === 0) {
        this.log_.debug(`Livestream with {uid:${this.uid_}} has 0 listeners, aborting download`);
        raw_youtube_download.Abort();
      }
      chunk_data(data);
    });
    raw_pcm_s16le_output.on("end", async () => {
      // Reaching this indicates successful download
      await write_chunk(data_chunk);

      this.downloading_ = false;
      this.downloaded_ = true;

      data_chunk = undefined;

      if (!this.streamable_) {
        this.streamable_ = true;
        this.events_.emit("streamable");
      }
      this.events_.emit("finish", true);
      this.log_.info(`Song with uid: ${this.uid_} downloaded`);
      download_profiler.stop({ conditional_level: { warn: live ? undefined : duration_sec * 0.75, error: live ? undefined : duration_sec } });
    });
  }

  /**
   * BeginDownload() - Begins the download from the source, nothing happens if failed
   * @param download_live - Force start download for livestream
   * @returns void
   */
  async BeginDownload(download_live?: boolean): Promise<void> {
    this.log_.debug(`Attempting download for video with {uid: ${this.uid_}}`);

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
    let live;
    let duration_sec;
    try {
      const info = await this.FetchInfo();
      live = info.live;
      duration_sec = info.duration_sec;
    } catch {
      this.downloading_ = false;
      return;
    }

    // Don't download if video is a livestream
    if (live && !download_live) {
      this.log_.debug(`Video with {uid: ${this.uid_}} is live, skipping download for now`);
      this.downloading_ = false;
      return;
    }
    this.DownloadSong(live, duration_sec);
  }

  /**
   * GetCacheLocation() - Gets location of first chunk of cached song once streamable
   * @returns Promise that resolves to location of first chunk if successful, rejected if failed
   */
  async GetCacheLocation(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.delete_lock_++;

      this.BeginDownload(true);
      if (this.streamable_) {
        resolve(path.join(this.cache_location_, this.start_chunk_number_.toString()));
        return;
      }

      const wait_for_streamable: Promise<void> = new Promise((resolve, reject) => {
        let resolved = false;
        this.events_.on("streamable", () => {
          if (!resolved) {
            resolve();
            resolved = true;
          }
        });
        this.events_.on("finish", (success) => {
          if (!success) {
            if (!resolved) {
              reject();
              resolved = true;
            }
          }
        });
      });

      wait_for_streamable.
        then(() => {
          resolve(path.join(this.cache_location_, this.start_chunk_number_.toString()));
        })
        .catch(() => {
          this.delete_lock_--;
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