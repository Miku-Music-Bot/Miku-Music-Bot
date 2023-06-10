import fs from 'fs-extra';

/**
 * createDirectory() - Creates an empty directory for use in tests
 * @param directory - directory to create
 */
export function createDirectory(directory: string) {
  try {
    fs.mkdirSync(directory, { recursive: true });
  } catch (error) {
    console.log(`WARN: Failed to create test directory at: ${directory}, tests may not run properly`);
    console.error(error);
  }

  try {
    fs.emptyDirSync(directory);
  } catch (error) {
    console.log(`WARN: Failed to empty test directory at: ${directory}, tests may not run properly`);
    console.error(error);
  }
}

/**
 * removeDirectory() - Removes directory used in tests
 * @param directory - directory to remove
 */
export function removeDirectory(directory: string) {
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch (error) {
    console.log(`WARN: Failed to remove test directory at: ${directory}, tests may not have run properly`);
    console.error(error);
  }
}
