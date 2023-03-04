import { SourceType } from "../audio_downloader/audio_downloader";

export enum SourceEntryType { SingleSong, MultiSong }

export type SingleSongSourceEntry = {
  entry_type: SourceEntryType.SingleSong;
  source_type: SourceType;
  uid: string;
  url: string;
  title: string;
  duration_sec: number;
}

export type MultiSongSourceEntry = {
  entry_type: SourceEntryType.MultiSong;
  source_type: SourceType;
  url: string;
  songs: Array<SingleSongSourceEntry>
}

export type DatabaseEntry = {
  guild_id: string;
  guild_config: {
    prefix: string;
    channel_id: string;
    autoplay: boolean;
    shuffle: boolean;
  };
  audio_processing_config: {
    volume: number;
    normalize: boolean;
    nightcore: boolean;
    eq: Array<{                                 // TODO - Figure out good representation for eq
      frequency: number
    }>
  };
  permissions_config: {
    [key: string]: {
      // join/leave vc
      request_join: boolean;
      request_leave: boolean;
      // song control
      pause_song: boolean;
      resume_song: boolean;
      // queue management
      view_queue: boolean;
      queue_song: boolean;
      queue_previous: boolean;
      skip_song: boolean;
      remove_song: boolean;
      advance_song: boolean;
      clear_queue: boolean;
      toggle_repeat_song: boolean;
      toggle_repeat_queue: boolean;
      toggle_shuffle: boolean;
      toggle_autoplay: boolean;
      // bot management
      edit_permissions: boolean;
      set_channel: boolean;
      set_prefix: boolean;
      clear_channel: boolean;
    }
  }
  saved_sources: Array<SingleSongSourceEntry | MultiSongSourceEntry>
}

export const DEFAULT_DATABSE_ENTRY: DatabaseEntry = Object.freeze({
  guild_id: "",
  guild_config: {
    prefix: "!miku ",
    channel_id: "",
    autoplay: false,
    shuffle: false,
  },
  audio_processing_config: {
    volume: 1,
    normalize: false,
    nightcore: false,
    eq: []
  },
  permissions_config: {},
  saved_sources: []
});

export type SongEntry = {
  source_type: SourceType;
  uid: string;
  url: string;
  guild_id: string;
  title: string;
  duration_sec: number;
  artist: string;
}