import fs from 'fs';

import { Database, verbose, RunResult } from 'sqlite3';
import Logger from '../logger/logger';
const sqlite3 = verbose();

/**
 * SQLiteInterface() - Provides abstractions to SQLite3 to make it easier to interact with a databse
 */
export default class SQLiteInterface {
  protected log_: Logger;
  private db_: Database;

  private ready_: Promise<void>;
  get ready() {
    return this.ready_;
  }

  /**
   * @param database_path - path to the .db file
   * @param tables - array of tables to create (runs commands in the format: "CREATE TABLE ${name} ${cols}")
   * ex. { name: "Test", cols: "(col1 STRING, col2 STRING)" } creates a table named test with 2 columns named col1 and col2
   * @param logger - logger
   */
  constructor(database_path: string, tables: Array<{ name: string; cols: string }>, logger: Logger) {
    this.log_ = logger;
    this.initializeDatabase_(database_path, tables);
  }

  /**
   * dbRun() - Runs an SQLite command
   * @param cmd - command to run
   * @param params - parameters to pass to command
   * @returns - results of command
   */
  protected async dbRun(cmd: string, params: object): Promise<RunResult> {
    await this.ready_;
    return new Promise((resolve, reject) => {
      this.db_.serialize(() => {
        this.db_.run(cmd, params, function (error) {
          if (error) {
            reject(error);
            return;
          }
          resolve(this);
        });
      });
    });
  }

  /**
   * dbAll() - Runs an SQLite query and returns all resulting rows
   * @param cmd - query to run
   * @param params - parameters to pass to query
   * @returns - resulting rows
   */
  protected async dbAll(cmd: string, params: object): Promise<Array<any>> {
    await this.ready_;
    return new Promise((resolve, reject) => {
      this.db_.serialize(() => {
        this.db_.all(cmd, params, (error, rows) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(rows);
        });
      });
    });
  }

  /**
   * initialize_database_() - accesses database and creates tables that we need
   * @param database_path - path to the .db file
   * @param tables - array of tables to create (runs commands in the format: "CREATE TABLE ${name} ${cols}")
   * ex. { name: "Test", cols: "(col1 STRING, col2 STRING)" } creates a table named test with 2 columns named col1 and col2
   */
  private initializeDatabase_(database_path: string, tables: Array<{ name: string; cols: string }>): void {
    this.ready_ = new Promise((resolve, reject) => {
      const profile = this.log_.profile('Initialize Database', { info: 0, error: 5000 });
      const existed = fs.existsSync(database_path);

      // load database from file, fatal error if this fails
      this.db_ = new sqlite3.Database(database_path, (error) => {
        if (error) {
          this.log_.fatal(`Failed to open database at: ${database_path}`, error);
          profile.stop();
          reject(error);
          return;
        }
      });

      // if database exists, just open it, don't initalize
      if (existed) {
        this.log_.debug(`Database at ${database_path} exists, skipping initialization`);
        profile.stop();
        resolve();
        return;
      }

      this.log_.debug(`Database at ${database_path} did not exist, initializating`);

      // create the tables needed
      let count = 0;
      for (let i = 0; i < tables.length; i++) {
        this.db_.run(`CREATE TABLE ${tables[i].name} ${tables[i].cols}`, (error) => {
          if (error) {
            this.log_.fatal(`Error creating table: ${tables[i].name}.`, error);
            profile.stop({ success: false, level: 'fatal' });
            return;
          }

          // count how many commands have been completed, done initializing once all have been run
          count++;
          if (count === tables.length) {
            profile.stop();
            resolve();
          }
        });
      }
    });
  }

  /**
   * close() - releases lock on database after finishing all queued operations
   * @returns Promise resolving to nothing (rejected if an error occurs)
   */
  async close(): Promise<void> {
    await this.ready_;
    return new Promise((resolve, reject) => {
      this.db_.close((error) => {
        if (error) {
          this.log_.error('Error while closing database', error);
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
