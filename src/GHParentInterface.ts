import path from 'path';
import Discord from 'discord.js';
import winston from 'winston';
import { ChildProcess, fork } from 'child_process';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

import { InteractionInfo, MessageInfo, RemoveGuildInfo, ChildResponse } from './guildHandler/GHChildInterface';

type EventTypes = {
	[key: string]: (msg: any) => void;
}

const MAX_RESPONSE_WAIT = parseInt(process.env.MAX_RESPONSE_WAIT);

export default class GuildHandlerInterface {
	private log: winston.Logger;					// logger
	private _events: TypedEmitter<EventTypes>;		// for message events
	private _guildId: string;						// discord guild id
	private _nextId: number;						// next response id to use
	private _process: ChildProcess;					// child process doing the work

	constructor(guildId: string, log: winston.Logger) {
		this.log = log;
		this._events = new EventEmitter() as TypedEmitter<EventTypes>;
		this._guildId = guildId;
		this._nextId = 0;
		this._startChild();
	}

	private _startChild() {
		if (this._process) { this._process.kill('SIGINT'); }

		this._process = fork(path.join(__dirname, 'guildHandler', 'GHChildInterface.js'));
		this._process.on('spawn', () => { this.log.debug(`GuildHandler child process started with {pid: ${this._process.pid}}`); });
		this._process.on('exit', (code) => {
			this.log.info(`GuildHandler child process exited with {code: ${code}}, restarting in 3 sec...`);
			setTimeout(() => { this._startChild(); }, 3000);
		});
		this._process.on('error', (error) => {
			if (error.toString().indexOf('SIGINT') !== -1) return;
			this.log.error(`{error: ${error}} on GuildHandler process for {guildId: ${this._guildId}}`);
		});
		this._process.on('message', (message: ChildResponse) => { this._events.emit(message.responseId, message.content); });

		this._process.send({
			type: 'start',
			content: this._guildId
		});
	}

	/**
	 * messageHandler()
	 *
	 * Handles all messages the bot recieves
	 * @param message - discord message object
	 * @returms Promise resolves to true if handled message, false if not
	 */
	messageHandler(message: Discord.Message): Promise<boolean> {
		return new Promise((resolve) => {
			const content: MessageInfo = {
				id: message.id,
				content: message.content,
				channelId: message.channelId,
				authorId: message.author.id
			};
			const resId = (this._nextId++).toString();
			this._events.once(resId, (message) => { resolve(message.success); });

			this._process.send({ type: 'message', content, responseId: resId.toString() });
			setTimeout(() => { this._events.emit(resId.toString(), { resId: resId.toString(), content: false }); }, MAX_RESPONSE_WAIT);
		});
	}

	/**
	 * interactionHandler()
	 * 
	 * Handles all interactions the bot recieves
	 * @param interaction - discord interaction object
	 * @return Promise resovles to true if the interaction was handled, false if not
	 */
	interactionHandler(interaction: Discord.ButtonInteraction): Promise<boolean> {
		return new Promise((resolve) => {
			const content: InteractionInfo = {
				customId: interaction.customId,
				authorId: interaction.user.id,
				parentMessageId: interaction.message.id,
				parentChannelId: interaction.channelId,
			};
			const resId = (this._nextId++).toString();
			this._events.once(resId, (message) => { resolve(message.success); });

			this._process.send({ type: 'interaction', content, responseId: resId.toString() });

			setTimeout(() => { this._events.emit(resId.toString(), { resId: resId.toString(), content: false }); }, MAX_RESPONSE_WAIT);
		});
	}

	/**
	 * removeGuild();
	 * 
	 * Call to stop the guild handler and clean up
	 */
	removeGuild(purge?: boolean): Promise<void> {
		if (!purge) { purge = false; }
		return new Promise((resolve) => {
			const content: RemoveGuildInfo = { purge };
			const resId = (this._nextId++).toString();
			this._events.once(resId, (message) => { resolve(message.done); });

			this._process.send({ type: 'removeGuild', content, responseId: resId.toString() });

			setTimeout(() => { this._events.emit(resId.toString(), { resId: resId.toString(), content: false }); }, MAX_RESPONSE_WAIT);
		});
	}
}
