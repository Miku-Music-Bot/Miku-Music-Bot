import dotenv from "dotenv";
dotenv.config();

import Logger from "./logger";


const log = new Logger("Test");

import AudioDownloader, { SourceType } from "./audio_downloader/audio_downloader";

const dl = new AudioDownloader(__dirname + "/../cache", 150, log);

dl.QueueSource({ source_type: SourceType.Youtube, identifier: "https://www.youtube.com/watch?v=jfKfPfyJRdk" });
dl.GetCacheLocation({ source_type: SourceType.Youtube, uid: "jfKfPfyJRdk" });