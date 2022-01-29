import * as Voice from '@discordjs/voice';
import type * as Discord from 'discord.js';

import { GuildComponent } from '../GuildComponent';
import { Song } from './Song';
import type { GuildHandler } from '../GuildHandler';
import { YTSource } from './sources/YTSource';

/**
 * VCPlayer
 *
 * Handles joining and playing a stream in a voice channel
 */
export class VCPlayer extends GuildComponent {
	voiceConnection: Voice.VoiceConnection;
	audioPlayer: Voice.AudioPlayer;
	subscription: Voice.PlayerSubscription;
	nowPlaying: YTSource;

	/**
	 * VCPlayer
	 * @param - guildHandler for this vcplayer
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
	}

	/**
	 * join()
	 *
	 * Joins the voice channel specified
	 * @param user - discord user to join in voice channel
	 * @return - promise that resolves if a voice channel is joined or rejects if failed
	 */
	async join(user: Discord.User): Promise<boolean> {
		this.info(`Joining {userId: ${user.id}} in voice channel`);

		try {
			const member = await this.guild.members.fetch({ user: user.id });

			// check if they are in a voice channel
			if (member.voice.channelId) {
				// if they are join it and send notification that join was successful
				this.debug(`Found that {userId: ${user.id}} is in {channelId: ${member.voice.channelId}}`);

				this.voiceConnection = Voice.joinVoiceChannel({
					channelId: member.voice.channelId,
					guildId: this.guild.id,
					selfMute: false,
					selfDeaf: true,
					adapterCreator: this.guild.voiceAdapterCreator as unknown as Voice.DiscordGatewayAdapterCreator, 			// <-- 1/20/22 bug, workaround: "as unknown as Voice.DiscordGatewayAdapterCreator". reference: https://github.com/discordjs/discord.js/issues/7273. 
				});

				this.play(new YTSource({} as unknown as Song)); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<for testing

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
			const errorId = this.ui.sendError(`<@${user.id}> Sorry! There was an error joining the voice channel.`, true);
			this.error(`{error: ${error}} while joining {userId: ${user.id}} in voice channel. {errorId: ${errorId}}`);
			return false;
		}
	}

	/**
	 * leave()
	 * 
	 * Leaves the currently connected voice connection
	 */
	leave() {
		try {
			this.voiceConnection.destroy();
			this.voiceConnection = undefined;
		}
		catch (error) {
			this.error(`{error: ${error}} while leaving voice channel`);
		}
	}

	/**
	 * play()
	 * 
	 * Plays from given stream to voice channel if connected
	 * If not connected, nothing happens
	 * If already playing something, stops previous stream and plays new stream
	 * @param source - source to play from
	 */
	play(source: YTSource) {
		this.nowPlaying.destroy();
		this.nowPlaying = source;

		// create audio player for this song
		if (this.subscription) {
			this.subscription.unsubscribe();
		}
		this.audioPlayer = Voice.createAudioPlayer();
		this.subscription = this.voiceConnection.subscribe(this.audioPlayer);

		// create and play the resource
		//const resource = Voice.createAudioResource(this.nowPlaying.getStream());
		//this.audioPlayer.play(resource);
	}
}