import { GuildComponent } from '../GuildComponent';
import type { GuildHandler } from '../GuildHandler';

export class Queue extends GuildComponent {
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
	}
}