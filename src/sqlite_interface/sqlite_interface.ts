import fs from 'fs-extra';

import sqlite3, { Database, RunResult } from 'sqlite3';
import Logger from '../logger/logger';

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
    const profiler = this.log_.profile(`Run {cmd: ${cmd}}`, { warn: 1000, error: 5000 });
    try {
      const result: RunResult = await new Promise((resolve, reject) => {
        this.db_.serialize(() => {
          this.db_.run(cmd, params, function (error) {
            if (error) return reject(error);
            resolve(this);
          });
        });
      });

      profiler.stop();
      return result;
    } catch (error) {
      profiler.stop({ success: false, level: 'warn' });
      this.log_.warn(`Error while running SQL {cmd: ${cmd}} with {param:${JSON.stringify(params)}}`, error);
      throw error;
    }
  }

  /**
   * dbAll() - Runs an SQLite query and returns all resulting rows
   * @param cmd - query to run
   * @param params - parameters to pass to query
   * @returns - resulting rows
   */
  protected async dbAll(cmd: string, params: object): Promise<Array<any>> {
    await this.ready_;
    const profiler = this.log_.profile(`Fetch all rows {cmd: ${cmd}}`, { warn: 1000, error: 5000 });
    try {
      const rows: Array<any> = await new Promise((resolve, reject) => {
        this.db_.serialize(() => {
          this.db_.all(cmd, params, (error, rows) => {
            if (error) return reject(error);
            resolve(rows);
          });
        });
      });

      profiler.stop();
      return rows;
    } catch (error) {
      profiler.stop({ success: false, level: 'warn' });
      this.log_.warn(`Error while fetching rows with SQL {cmd: ${cmd}} with {param:${JSON.stringify(params)}}`, error);
      throw error;
    }
  }

  /**
   * openDatabase() - Opens sqlite3 database
   * @param database_path - path to the .db file
   * @returns - promise that resolves to opened database
   */
  private async openDatabase(database_path: string): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
      const database = new sqlite3.Database(database_path, (error) => {
        if (error) return reject(error);
        resolve(database);
      });
    });
  }

  /**
   * createTables() - Creates tables in database
   * @param tables - array of tables to create (runs commands in the format: "CREATE TABLE ${name} ${cols}")
   * ex. { name: "Test", cols: "(col1 STRING, col2 STRING)" } creates a table named test with 2 columns named col1 and col2
   * @returns - promise that resolves once tables are created
   */
  private async createTables(tables: Array<{ name: string; cols: string }>): Promise<void> {
    for (let i = 0; i < tables.length; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.db_.run(`CREATE TABLE ${tables[i].name} ${tables[i].cols}`, (error) => {
            if (error) return reject(error);
            resolve();
          });
        });
      } catch (error) {
        this.log_.error(`Error creating table: ${tables[i].name}.`, error);
        throw error;
      }
    }
  }

  /**
   * initialize_database_() - accesses database and creates tables that we need
   * @param database_path - path to the .db file
   * @param tables - array of tables to create (runs commands in the format: "CREATE TABLE ${name} ${cols}")
   * ex. { name: "Test", cols: "(col1 STRING, col2 STRING)" } creates a table named test with 2 columns named col1 and col2
   */
  private initializeDatabase_(database_path: string, tables: Array<{ name: string; cols: string }>): void {
    const profile = this.log_.profile('Initialize Database', { info: 0, error: 5000 });

    this.ready_ = new Promise((res, rej) => {
      const resolve = () => {
        profile.stop();
        res();
      };
      const reject = (error: Error) => {
        profile.stop({ success: false, level: 'error' });
        rej(error);
      };

      let existed: boolean;
      try {
        existed = fs.existsSync(database_path);
      } catch (error) {
        reject(error);
        this.log_.fatal('Error while checking if database existed already', error);
        return;
      }

      this.openDatabase(database_path)
        .then((database) => {
          this.db_ = database;

          // if database exists, just open it, don't initalize
          if (existed) {
            this.log_.debug(`Database at ${database_path} exists, skipping initialization`);
            return resolve();
          }

          this.log_.debug(`Database at ${database_path} did not exist, initializating`);
          this.createTables(tables)
            .then(() => {
              resolve();
            })
            .catch((error) => {
              this.log_.fatal('Failed to create tables', error);
              reject(error);
            });
        })
        .catch((error) => {
          this.log_.fatal(`Failed to open database at: ${database_path}`, error);
          reject(error);
        });
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
