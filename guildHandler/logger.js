const fs = require('fs');
const path = require('path');

/**
 * Logger
 * 
 * Handles logging for a guildHandler
 */

class Logger {
	/**
	 * @param {string} logLocation - path for logging location
	 */
	constructor(logLocation, fileName) {
		this.location = path.join(logLocation, fileName + '.log');
		this.message = '';
		this.writing = false;
	}

	/**
	 * writeLogs()
	 * 
	 * If file is not being written to currently and there is something to be written, appends logs to file
	 */
	writeLogs() {
		if (!this.writing && this.message.length > 0) {
			this.writing = true;
			let lastMessage = this.message;
			this.message = '';
			fs.appendFile(this.location, lastMessage, (error) => {
				if (error) {
					console.log(`Error: {${error}} saving log to ${this.logLocation}. Log content:\n---Start Failed Log---\n${lastMessage}\n----End Failed Log----`);
				}
				this.writing = false;
				this.writeLogs();
			});
		}
	}

	/**
	 * log()
	 * 
	 * Logs a string to file with date and time attached
	 * @param {string} msg - message to log
	 */
	log(msg) {
		console.log(msg);
		this.message = this.message + `[${new Date(Date.now()).toISOString()}] ${msg}\n`;
		this.writeLogs();
	}
}

module.exports = Logger;