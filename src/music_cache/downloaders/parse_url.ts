export enum DownloaderTypes {
  Youtube = 'yt',
  GoogleDrive = 'gd',
  Unknown = 'unknown',
}

/**
 * parseURL() - Parses a url to determine the song_uid and which downloader to use
 * @param url - url to parse
 * @returns - object containing link to song, song_uid (in the form [type]$[uid]), and the type of downloader to use
 */
export default function parseURL(url: string): { link: string; song_uid: string; type: DownloaderTypes } {
  const link = url;
  const song_uid = 'unknown$';
  const type = DownloaderTypes.Unknown;
  return { link, song_uid, type };
}
