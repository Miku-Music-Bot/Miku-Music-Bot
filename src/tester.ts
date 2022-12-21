import dotenv from "dotenv";
dotenv.config();

import Logger from "./logger";

import { fork } from "child_process";

const log = new Logger("test");

fork(__dirname + "/audio_downloader/audio_downloader.js");

import AudioDownloaderInterface from "./audio_downloader/audio_downloader_interface";
import { SourceType } from "./audio_downloader/audio_downloader";

const a = new AudioDownloaderInterface(log);

setTimeout(async () => {
  a.QueueSource({ source_type: SourceType.Youtube, url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" });
  a.GetCacheLocation({ source_type: SourceType.Youtube, url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" });
}, 10000);
