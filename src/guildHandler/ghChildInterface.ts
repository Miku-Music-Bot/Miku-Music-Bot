import GuildHandler from './GuildHandler';

export type startMsg = {
	type: 'start',
	content: string			// discord guild id
}

export type MessageObject = {
	id: string,			// message id
	content: string,	// message content
	channelId: string	// discord channel id for where message is from
	authorId: string	// discord user id for author of message
}
export type message = {
	type: 'message',
	content: MessageObject
}

export type InteractionObject = {
	customId: string,
	authorId: string,
	parentMessageId: string,
	parentChannelId: string
}
export type interaction = { 
	type: 'interaction',
	content: InteractionObject
}

type parentCommand = startMsg | message | interaction

let guildHandler: GuildHandler;
process.on('message', (message: parentCommand) => {
	switch(message.type) {
		case('start'): {
			guildHandler = new GuildHandler(message.content);
			break;
		}
		case('message'): {
			guildHandler.messageHandler(message.content);
			break;
		}
		case('interaction'): {
			guildHandler.interactionHandler(message.content);
			break;
		}
	}
});