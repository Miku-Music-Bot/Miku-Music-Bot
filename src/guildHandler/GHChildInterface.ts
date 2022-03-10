import GuildHandler from './GuildHandler';

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
			guildHandler = new GuildHandler(message.content);
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