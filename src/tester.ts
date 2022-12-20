import dotenv from "dotenv";
dotenv.config();

import Logger from "./logger";

import { fork } from "child_process";

const log = new Logger("test");

fork(__dirname + "/audio_downloader/audio_downloader.js");

import AudioDownloaderInterface from "./audio_downloader/audio_downloader_interface";

const a = new AudioDownloaderInterface(log);
