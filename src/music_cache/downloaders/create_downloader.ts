import DownloaderInterface from './downloader_interface';
import { DownloaderTypes } from './parse_url';

/**
 * createDownloader() - Creates a song downloader given the type
 * @param type - type of downloader to create
 * @returns - created downloader
 */
export default function createDownloader(type: DownloaderTypes): DownloaderInterface {
  return {} as unknown as DownloaderInterface;
}
