import dotenv from "dotenv";
dotenv.config();

import Logger from "./logger";

const log = new Logger("Test");



import YoutubeDownloader from "./audio_downloader/youtube_downloader";

const ytdl = new YoutubeDownloader("rDQdGr0Cdn0", process.env.CACHE_DIRECTORY + "/rDQdGr0Cdn0", log);

ytdl.BeginDownload(); ytdl.BeginDownload(); ytdl.BeginDownload(); ytdl.BeginDownload(); ytdl.BeginDownload(); ytdl.BeginDownload(); ytdl.BeginDownload();
ytdl.DeleteCache().catch(() => { });
setTimeout(() => {
  ytdl.DeleteCache();
}, 5000);