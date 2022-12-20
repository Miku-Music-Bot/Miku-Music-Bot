import dotenv from "dotenv";
dotenv.config();

import Logger from "./logger";


const log = new Logger("Test");

import YoutubeDownloader from "./audio_downloader/youtube_downloader";


const ytdl = new YoutubeDownloader("rDQdGr0Cdn0", process.env.CACHE_DIRECTORY + "/rDQdGr0Cdn0", log);

ytdl.BeginDownload(); ytdl.BeginDownload(); ytdl.BeginDownload(); ytdl.BeginDownload(); ytdl.BeginDownload(); ytdl.BeginDownload(); ytdl.BeginDownload();

setTimeout(() => {
  ytdl.GetCacheLocation().catch(() => { console.log("error getting cache location"); });
  console.log(ytdl.cachesize_MB)
  ytdl.DeleteCache().catch(() => { console.log("error deleting"); });
  ytdl.ReleaseDeleteLock();
  ytdl.GetCacheLocation().catch(() => { console.log("error getting cache location"); });
  ytdl.GetCacheLocation().catch(() => { console.log("error getting cache location"); });
  ytdl.GetCacheLocation().catch(() => { console.log("error getting cache location"); });
  ytdl.GetCacheLocation().catch(() => { console.log("error getting cache location"); });
  ytdl.GetCacheLocation().catch(() => { console.log("error getting cache location"); });
  ytdl.ReleaseDeleteLock();
  ytdl.ReleaseDeleteLock();
  ytdl.ReleaseDeleteLock();
  ytdl.ReleaseDeleteLock();
  ytdl.ReleaseDeleteLock();

  setImmediate(() => {
    ytdl.DeleteCache().catch(() => { console.log("error deleting"); });
  });

}, 10000);