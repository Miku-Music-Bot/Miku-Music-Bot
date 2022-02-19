import GuildComponent from '../../GuildComponent';
import type GuildHandler from '../../GuildHandler';

export default class Playlist extends GuildComponent {
	type: string;
	
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
	}
}