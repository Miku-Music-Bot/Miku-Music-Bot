import ipc from "node-ipc";

import Logger from "../logger";
import MIKU_CONSTS from "../constants";
import { SourceId, FunctionType, FunctionRequest, FunctionResponse } from "./audio_downloader";

/**
 * AudioDownloaderInterface - Class for interfacing with audio downloader from seperate process
 */
export default class AudioDownloaderInterface {
  private ipc_ = new ipc.IPC();

  private counter_ = 0;
  private ready_ = false;

  private log_: Logger;

  /**
   * @param logger - logger
   */
  constructor(logger: Logger) {
    this.log_ = logger;

    this.ipc_.config.retry = 5000;
    this.ipc_.config.silent = true;
    this.ipc_.config.rawBuffer = false;
    this.ipc_.config.appspace = MIKU_CONSTS.APP_NAMESPACE;
    this.ipc_.config.id = MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID + "-Interface-" + Date.now().toString();

    this.log_.debug(`Attempting ipc connection to {id:${MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID}} in {namespace:${MIKU_CONSTS.APP_NAMESPACE}}`);
    this.ipc_.connectTo(MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID, () => {
      // Establish listeners
      const connection = this.ipc_.of[MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID];
      connection.on("connect", () => {
        this.ready_ = true;
        this.log_.debug(`ipc connection to {id:${MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID}} in {namespace:${MIKU_CONSTS.APP_NAMESPACE}} established`);
      });

      connection.on("disconnect", () => {
        this.log_.warn(`ipc connection to {id:${MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID}} in {namespace:${MIKU_CONSTS.APP_NAMESPACE}} disconnected`);
      });
    })
  }

  /**
   * GenerateUID() - Generates a unique identifier every call
   * @returns uid
   */
  private GenerateUID(): string {
    this.counter_++;
    return this.counter_.toString();
  }

  /**
   * QueueSource() - Queues a source to be downloaded
   * @param source_id - source id of source to queue
   * @returns resolves to nothing if success, rejects to user friendly error message
   */
  QueueSource(source_id: SourceId): Promise<string | undefined> {
    if (!this.ready_) return Promise.reject("Downloader Not Ready, Try Again In A Moment");
    return new Promise((resolve, reject) => {
      const function_req: FunctionRequest = {
        uid: this.GenerateUID(),
        function_type: FunctionType.QueueSource,
        args: [source_id]
      }
      this.ipc_.of[MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID].emit("message", function_req);

      this.ipc_.of[MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID].on(function_req.uid, (response: FunctionResponse) => {
        if (response.success) {
          resolve(response.result);
          return;
        }
        reject(response.error);
      })
    });
  }

  /**
   * GetCacheLocation() - Gets location of first chunk of cached song once streamable
   * @param source_id - source id of cache location to fetch
   * @returns Promise that resolve to string or rejects if failed
   */
  GetCacheLocation(source_id: SourceId): Promise<string> {
    if (!this.ready_) return Promise.reject("Downloader Not Ready, Try Again In A Moment");
    return new Promise((resolve, reject) => {
      const function_req: FunctionRequest = {
        uid: this.GenerateUID(),
        function_type: FunctionType.GetCacheLocation,
        args: [source_id]
      }
      this.ipc_.of[MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID].emit("message", function_req);

      this.ipc_.of[MIKU_CONSTS.AUDIO_DOWNLOADER_IPC_ID].on(function_req.uid, (response: FunctionResponse) => {
        if (response.success) {
          resolve(response.result);
          return;
        }
        reject(response.error);
      })
    });
  }
}