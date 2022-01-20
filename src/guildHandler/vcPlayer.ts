import * as Voice from '@discordjs/voice';
import type * as Discord from 'discord.js';

import { GuildComponent } from './guildComponent.js';
import type { GuildHandler } from './guildHandler.js';

/**
 * VCPlayer
 *
 * Handles joining and playing a stream in a voice channel
 */
export class VCPlayer extends GuildComponent {
	/**
	 * VCPlayer
	 * @param {GuildHander} - guildHandler for this vcplayer
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
	}

	/**
	 * join()
	 *
	 * Joins the voice channel specified
	 * @param {Discord.User} user - discord user to join in voice channel
	 * @return {Promise<boolean>} - promise that resolves if a voice channel is joined or rejects if failed
	 */
	async join(user: Discord.User): Promise<boolean> {
		this.info(`Joining {userId: ${user.id}} in voice channel`);

		try {
			const member = await this.guild.members.fetch({ user: user.id });

			// check if they are in a voice channel
			if (member.voice.channelId) {
				// if they are join it and send notification that join was successful
				this.debug(`Found that {userId: ${user.id}} is in {channelId: ${member.voice.channelId}}`);

				Voice.joinVoiceChannel({
					channelId: member.voice.channelId,
					guildId: this.guild.id,
					selfMute: false,
					selfDeaf: true,
					adapterCreator: this.guild.voiceAdapterCreator as unknown as Voice.DiscordGatewayAdapterCreator, 			// <-- bug, workaround: "as unknown as Voice.DiscordGatewayAdapterCreator". reference: https://github.com/discordjs/discord.js/issues/7273. 
				});

				this.info(`Joined {userId: ${user.id}} in {channelId: ${member.voice.channelId}}`);
				this.ui.sendNotification(`Joined <@${user.id}> in ${member.voice.channel.name}`);
				return true;
			} else {
				// if they aren't send and error message
				this.info(`{userId: ${user.id}} was not found in a voice channel`);
				this.ui.sendError(`<@${user.id}> Join a voice channel first!`);
				return false;
			}
		}
		catch (error) {
			const errorId = this.ui.sendError(`<@${user.id}> Sorry! There was an error joining you in the voice channel.`, true);
			this.error(`{error: ${error}} while joining {userId: ${user.id}} in voice channel. {errorId: ${errorId}}`);
			return false;
		}
	}
}