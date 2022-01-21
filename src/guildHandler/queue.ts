import { GuildComponent } from './guildComponent';
import type { GuildHandler } from './guildHandler';

export class Queue extends GuildComponent {
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
	}
}