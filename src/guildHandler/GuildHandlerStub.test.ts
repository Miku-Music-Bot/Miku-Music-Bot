import sinon from 'sinon';
import path from 'path';

import winston from 'winston';
import Discord from 'discord.js';
import * as mongodb from 'mongodb';
import { drive_v3 } from '@googleapis/drive';
import getEnv from './config';

import GuildHandler from './GuildHandler';

const guildSettings: {
	guildId?: string,
	guildConfig?: {
		configured?: boolean,
		channelId?: string,
		prefix?: string,
		autoplay?: boolean,
		shuffle?: boolean
		autoplayList?: Array<{
			id: number,
			playlist: number
		}>,
		songIdCount?: number,
		playlistIdCount?: number
	},
	audioConfig?: {
		audio?: {
			name?: string,
			volume?: number,
			normalize?: boolean,
			nightcore?: boolean
		},
		eq?: {
			name?: string,
			eq?: Array<unknown>
		}
	},
	permissionConfig?: {
		[key: string]: string[]
	},
	sourceDataConfig?: {
		gdPlaylists?: Array<{
			id?: number,
			title?: string,
			url?: string,
			songs?: Array<{
				id?: number,
				title?: string,
				type?: string,
				url?: string
				duration?: number,
				thumbnailURL?: number,
				artist?: string,
				live?: boolean,
				reqBy?: string
			}>
		}>,
		ytPlaylists?: Array<{
			id?: number,
			title?: string,
			url?: string,
			songs?: Array<{
				id?: number,
				title?: string,
				type?: string,
				url?: string
				duration?: number,
				thumbnailURL?: number,
				artist?: string,
				live?: boolean,
				reqBy?: string
			}>
		}>,
	}
} = Object.freeze({
	guildId: 'testGuild',
	guildConfig: {
		configured: true,
		channelId: 'testChannel',
		prefix: '!miku ',
		autoplay: false,
		shuffle: false,
		autoplayList: [],
		songIdCount: 1000,
		playlistIdCount: 1000
	},
	audioConfig: {
		audio: {
			name: 'testAudio',
			volume: 1,
			normalize: false,
			nightcore: false
		},
		eq: {
			name: 'testEQ',
			eq: []
		}
	},
	permissionConfig: {},
	sourceDataConfig: {
		gdPlaylists: [],
		ytPlaylists: []
	}
});

export function newStub(settings?: typeof guildSettings) {
	if (!settings) { settings = {}; }
	let dbData = Object.assign({}, guildSettings);
	dbData = Object.assign(dbData, settings);

	winston.addColors({
		debug: 'blue',
		info: 'green',
		warn: 'yellow',
		error: 'red',
	});
	const logger = winston.createLogger({
		level: 'debug',
		levels: {
			error: 0,
			warn: 1,
			info: 2,
			debug: 3,
		},
		transports: [
			new winston.transports.Console({
				level: 'error',
				format: winston.format.combine(
					winston.format.errors({ stack: true }),
					winston.format.colorize(),
					winston.format.simple(),
					winston.format.printf(({ level, stack, message, durationMs }) => {
						return `${level}: ${message} ${durationMs ? `{durationMs:${durationMs}}` : ''} ${stack ? `\n${stack}` : ''}`;
					})
				),
			})
		]
	});

	const DiscordStub = sinon.stub(new Discord.Client({ intents: [] }));
	DiscordStub.login.returns(new Promise((resolve) => resolve('')));

	const MongodbStub = sinon.stub(new mongodb.MongoClient('mongodb+srv://user:pwd@localhost'));
	MongodbStub.connect.callsFake((): Promise<mongodb.MongoClient> => {
		return new Promise((resolve) => resolve(MongodbStub));
	});
	MongodbStub.db.returns({
		collection: () => {
			return {
				findOne: () => {
					return new Promise((resolve) => resolve(dbData));
				},
				replaceOne: () => { return; }
			};
		}
	} as unknown as mongodb.Db);

	const DriveFilesStub = sinon.stub(new drive_v3.Drive({}).files);
	DriveFilesStub.get.callsFake(
		// @ts-expect-error Google api typscript definitions are funky
		(a, b, cb) => {
			if (b.responseType === 'stream') {
				cb();
			}
		}
	);
	const DriveStub = {
		files: DriveFilesStub
	};

	const config = getEnv(path.join(__dirname, '../../', 'test.env'));

	const stub = new GuildHandler(
		'1234567890',
		logger,
		DiscordStub as unknown as Discord.Client,
		MongodbStub as unknown as mongodb.MongoClient,
		DriveStub as unknown as drive_v3.Drive,
		config
	);

	return stub;
}