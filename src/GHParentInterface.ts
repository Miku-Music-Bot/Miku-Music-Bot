import * as path from 'path';
import * as Discord from 'discord.js';
import * as winston from 'winston';
import { ChildProcess, fork } from 'child_process';

import { MessageObject } from './guildHandler/GHChildInterface';

export default class GuildHandlerInterface {
	private log: winston.Logger;		// logger
	private _guildId: string;			// discord guild id
	private _process: ChildProcess;		// child process doing the work

	constructor(guildId: string, log: winston.Logger) {
		this.log = log;
		this._guildId = guildId;
		this._startChild();
	}

	private _startChild() {
		if (this._process) { this._process.kill('SIGINT'); }

		this._process = fork(path.join(__dirname, 'guildHandler', 'ghChildInterface.js'));
		this._process.on('spawn', () => { this.log.debug(`GuildHandler child process started with {pid: ${this._process.pid}}`); });
		this._process.on('exit', (code) => {
			this.log.info(`GuildHandler child process exited with {code: ${code}}, restarting in 3 sec...`);
			setTimeout(() => { this._startChild(); }, 3000);
		});
		this._process.on('error', (error) => {
			if (error.toString().indexOf('SIGINT') !== -1) return;
			this.log.error(`{error: ${error}} on GuildHandler process for {guildId: ${this._guildId}}`);
		});

		this._process.send({
			type: 'start',
			content: this._guildId
		});
	}
	
	removeGuild() {
		//
	}

	messageHandler(message: Discord.Message) {
		const content: MessageObject = {
			id: message.id,
			content: message.content,
			channelId: message.channelId,
			authorId: message.author.id
		};

		this._process.send({ type: 'message', content });
	}
}
