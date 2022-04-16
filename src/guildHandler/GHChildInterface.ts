import fs from 'fs';
import Discord from 'discord.js';
import * as mongodb from 'mongodb';
import { drive_v3 } from '@googleapis/drive';
import { AuthPlus } from 'googleapis-common';
import path from 'path';
import newLogger from '../Logger';

import GuildHandler from './GuildHandler';
import getEnv from '../config';

// Possible commands from parent
export type StartMsg = {			// Start message containing information needed to start guild hanlder
	type: 'start',
	content: string					// discord guild id
}

export type MessageInfo = {			// Represents a discord message
	id: string,						// message id
	content: string,				// message content
	channelId: string				// discord channel id for where message is from
	authorId: string				// discord user id for author of message
}
export type MessageCall = {			// Wrapper around message info 
	type: 'message'
	content: MessageInfo,			// message info
	responseId: string				// id to respond with
}

export type InteractionInfo = {		// Represents a discord interaction
	customId: string,				// custom id of interaction
	authorId: string,				// id of user who click the interaction
	parentMessageId: string,		// message id of parent message
	parentChannelId: string,		// channel if of parent message
}
export type InteractionCall = {		// Wraper around interaction info
	type: 'interaction',
	content: InteractionInfo,		// interaction info
	responseId: string				// id to respond with
}

export type RemoveGuildInfo = {		// Info needed to call remove guild info
	purge: boolean					// purge data or not
}
export type RemoveGuildCall = {		// Wrapper around remove guild info
	type: 'removeGuild',
	content: RemoveGuildInfo		// remove guild ind
	responseId: string,				// id to respond with
}
export type ParentCommand = StartMsg | MessageCall | InteractionCall | RemoveGuildCall;

// Possible responses from child
export type MessageResInfo = {		// contains data of response to message call
	success: boolean				// sccessfully handled or not
}
export type MessageRes = {			// Wrapper around message response
	responseId: string,				// id to respond with
	content: MessageResInfo			// MessageResInfo
}

export type InteractionResInfo = {	// contains data of response to interaction call
	success: boolean				// successfully handled or not
}
export type InteractionRes = {		// Wrapper around interaction response
	responseId: string,				// id to respond with
	content: InteractionResInfo		// InteractionResInfo
}

export type DeleteResInfo = {		// data of response to delete guild call
	done: void
}
export type DeleteRes = {			// Wrapper around delete guild res
	responseId: string				// id to respond with
	content: DeleteResInfo			// DeleteResInfo
}
export type ChildResponse = MessageRes | InteractionRes;

let guildHandler: GuildHandler;
process.on('message', async (message: ParentCommand) => {
	switch (message.type) {
		case ('start'): {
			const id = message.content;

			const config = getEnv(path.join(__dirname, '../../', '.env'));

			// set up logger
			const filename = path.basename(__filename);
			const logger = newLogger(path.join(config.LOG_DIR, id), config);
			//const debug = (msg: string) => { logger.debug(`{filename: ${filename}} ${msg}`); };			unneeded right now
			const info = (msg: string) => { logger.info(msg); };
			//const warn = (msg: string) => { logger.warn(`{filename: ${filename}} ${msg}`); };
			const error = (msg: string, e: Error) => { logger.error(`{filename: ${filename}} ${msg}`, e); };

			// Create discord client
			const discordClient = new Discord.Client({			// set intent flags for bot
				intents: [
					Discord.Intents.FLAGS.GUILDS,						// for accessing guild roles
					Discord.Intents.FLAGS.GUILD_VOICE_STATES,			// for checking who is in vc and connecting to vc
				],
			});
			discordClient.login(config.DISCORD_TOKEN);

			// Authenticate with mongodb
			let mongoClient: mongodb.MongoClient;
			try {
				logger.profile('Autenticate Mongodb');
				info('Connecting to mongodb database');

				// connect to mongodb database
				mongoClient = new mongodb.MongoClient(config.MONGODB_URI);
				await mongoClient.connect();
				logger.profile('Autenticate Mongodb');
			}
			catch (e) {
				error(`{error:${e.message}} while authenticating with mongodb`, e);
				process.exit();
			}



			// Authenticate with google drive api
			let drive: drive_v3.Drive;
			try {
				logger.profile('Authenticate Google Drive');
				info('Authenticating with Google Drive API');

				const authPlus = new AuthPlus();
				const auth = new authPlus.OAuth2(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
				const token = fs.readFileSync(config.GOOGLE_TOKEN_LOC).toString();
				auth.setCredentials(JSON.parse(token));
				drive = new drive_v3.Drive({ auth });

				logger.profile('Authenticate Google Drive');
				info('Successfully authenticated with Google Drive API');
			}
			catch (e) {
				error(`{error:${e.message}} while authenticating with google drive`, e);
				process.exit();
			}

			guildHandler = new GuildHandler(
				id,
				logger,
				discordClient,
				mongoClient,
				drive,
				config
			);
			guildHandler.initHandler();
			break;
		}
		case ('message'): {
			const success = await guildHandler.messageHandler(message.content);
			const response: MessageRes = {
				responseId: message.responseId,
				content: { success }
			};
			process.send(response);
			break;
		}
		case ('interaction'): {
			const success = await guildHandler.interactionHandler(message.content);
			const response: InteractionRes = {
				responseId: message.responseId,
				content: { success }
			};
			process.send(response);
			break;
		}
		case ('removeGuild'): {
			const done = await guildHandler.removeGuild(message.content.purge);
			const response: DeleteRes = {
				responseId: message.responseId,
				content: { done }
			};
			process.send(response);
			break;
		}
	}
});

process
	.on('unhandledRejection', (reason, p) => {
		process.send(`${reason} Unhandled Rejection at Promise ${p}`);
		process.exit();
	})
	.on('uncaughtException', err => {
		console.error(err, 'Uncaught Exception thrown');
		process.exit();
	});