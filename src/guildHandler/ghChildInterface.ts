import GuildHandler from './GuildHandler';

export type StartMsg = {
	type: 'start',
	content: string			// discord guild id
}

export type MessageInfo = {
	id: string,			// message id
	content: string,	// message content
	channelId: string	// discord channel id for where message is from
	authorId: string	// discord user id for author of message
}
export type Message = {
	type: 'message',
	content: MessageInfo
}

export type InteractionInfo = {
	customId: string,
	authorId: string,
	parentMessageId: string,
	parentChannelId: string,
}
export type Interaction = {
	type: 'interaction',
	content: InteractionInfo,
	responseId: string
}

export type ParentCommand = StartMsg | Message | Interaction

export type InteractionSuccess = {
	success: boolean
}
export type InteractionResponse = {
	responseId: string,
	content: InteractionSuccess
}

export type ChildResponse = InteractionResponse;

let guildHandler: GuildHandler;
process.on('message', async (message: ParentCommand) => {
	switch (message.type) {
		case ('start'): {
			guildHandler = new GuildHandler(message.content);
			break;
		}
		case ('message'): {
			guildHandler.messageHandler(message.content);
			break;
		}
		case ('interaction'): {
			const success = await guildHandler.interactionHandler(message.content);
			const response: InteractionResponse = {
				responseId: message.responseId,
				content: { success }
			};
			process.send(response);
			break;
		}
	}
});

process
	.on('unhandledRejection', (reason, p) => {
		console.error(reason, 'Unhandled Rejection at Promise', p);
	})
	.on('uncaughtException', err => {
		console.error(err, 'Uncaught Exception thrown');
		process.exit(1);
	});