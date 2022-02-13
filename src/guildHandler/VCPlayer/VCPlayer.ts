import * as Voice from '@discordjs/voice';
import type * as Discord from 'discord.js';

import GuildComponent from '../GuildComponent';
import Song from './Song';
import type GuildHandler from '../GuildHandler';
import AudioProcessor from './AudioProcessor';
import AudioSettings from './AudioSettings';
import type AudioSource from './sources/AudioSource';


import YTSource from './sources/YTSource'; //<<<<<<<<<<<<<<<<<<<For testing

/**
 * VCPlayer
 *
 * Handles joining and playing a stream in a voice channel
 */
export default class VCPlayer extends GuildComponent {
	voiceConnection: Voice.VoiceConnection;
	audioPlayer: Voice.AudioPlayer;
	subscription: Voice.PlayerSubscription;
	currentAudioProcessor: AudioProcessor;
	currentSource: AudioSource;
	_finishedSongCheck: NodeJS.Timer;
	playing: boolean;
	paused: boolean;

	/**
	 * @param guildHandler - guildHandler for this vcplayer
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler);
		this.playing = false;
		this.paused = false;
	}

	/**
	 * 
	 * @param channelId - channel id of voice channel to join
	 */
	private async _joinChannelId(channelId: string) {
		try {
			this.voiceConnection = Voice.joinVoiceChannel({
				channelId: channelId,
				guildId: this.guild.id,
				selfMute: false,
				selfDeaf: true,
				adapterCreator: this.guild.voiceAdapterCreator as unknown as Voice.DiscordGatewayAdapterCreator, 			// <-- 1/20/22 bug, workaround: "as unknown as Voice.DiscordGatewayAdapterCreator". reference: https://github.com/discordjs/discord.js/issues/7273. 
			});
		} catch (error) {
			this.debug(`Error while joining voice channel with {channelId: ${channelId}}`);
		}

		this.voiceConnection.on(Voice.VoiceConnectionStatus.Disconnected, async () => {
			this.debug(`Voice connection for {channelId: ${channelId}} disconnected`);
			try {
				await Promise.race([
					Voice.entersState(this.voiceConnection, Voice.VoiceConnectionStatus.Signalling, 5000),
					Voice.entersState(this.voiceConnection, Voice.VoiceConnectionStatus.Connecting, 5000),
				]);

				this.debug(`Voice connection for {channelId: ${channelId}} seems to be recoverable, attempting to rejoin...`);
				await this._joinChannelId(channelId);
				this.debug(`Successfully rejoined voice {channelId: ${channelId}}`);
			}
			catch (error) {
				this.debug(`{error: ${error}} Unable to recover voice connection to {channelId: ${channelId}}, closing connection`);
				this.leave();
			}
		});

		this.voiceConnection.on('error', (error) => {
			this.error(`{error; ${error}} on voice connection to {channelId: ${channelId}}`);
			this.leave();
		});

		return Voice.entersState(this.voiceConnection, Voice.VoiceConnectionStatus.Ready, 5000);
	}

	/**
	 * join()
	 *
	 * Joins the voice channel specified
	 * @param user - discord user to join in voice channel
	 * @return promise that resolves if a voice channel is joined or rejects if failed
	 */
	async join(user: Discord.User): Promise<boolean> {
		this.info(`Joining {userId: ${user.id}} in voice channel`);

		try {
			const member = await this.guild.members.fetch({ user: user.id });

			// check if they are in a voice channel
			if (!member.voice.channelId) {
				// if they aren't send and error message
				this.info(`{userId: ${user.id}} was not found in a voice channel`);
				this.ui.sendError(`<@${user.id}> Join a voice channel first!`);
				return false;
			}
			// if they are join it and send notification that join was successful
			this.debug(`Found that {userId: ${user.id}} is in {channelId: ${member.voice.channelId}}`);

			await this._joinChannelId(member.voice.channelId);
			this.info(`Joined {userId: ${user.id}} in {channelId: ${member.voice.channelId}}`);
			this.ui.sendNotification(`Joined <@${user.id}> in ${member.voice.channel.name}`);

			//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<for testing
			const source = new YTSource(this.guildHandler, { url: 'https://www.youtube.com/watch?v=zREufEpj0zM', live: false, type: 'yt', fetchData: async () => { /* */ } } as unknown as Song);
			this.play(source);
			//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

			return true;
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
			clearInterval(this._finishedSongCheck);
			this.playing = false;
			this.paused = false;
			if (this.currentSource) { this.currentSource.destroy(); }
			this.currentSource = null;
			if (this.currentAudioProcessor) { this.currentAudioProcessor.destroy(); }
			this.currentAudioProcessor = null;
			if (this.audioPlayer) { this.audioPlayer.stop(); }
			this.audioPlayer = null;
			if (this.subscription) { this.subscription.unsubscribe(); }
			this.subscription = null;

			this.voiceConnection.destroy();
			this.voiceConnection = null;
		}
		catch (error) {
			this.error(`{error: ${error}} while leaving voice channel`);
		}
	}

	/**
	 * pause()
	 * 
	 * Pauses currently playing song
	 */
	pause() {
		if (!this.currentSource || !this.audioPlayer) return;

		if (this.currentSource.song.live) {
			this.ui.sendError('Livestreams cannot be paused!');
			return;
		}

		this.paused = true;
		this.currentSource.pause();
		this.audioPlayer.pause();
	}

	/**
	 * resume()
	 * 
	 * Resumes currently playing song
	 */
	resume() {
		if (!this.currentSource || !this.audioPlayer) return;

		this.paused = false;
		this.paused = false;
		this.currentSource.resume();
		this.audioPlayer.unpause();
	}

	/**
	 * finishedSong()
	 * 
	 * Call to clean up current song and call nextSong on this.queue
	 */
	finishedSong() {
		clearInterval(this._finishedSongCheck);
		this.playing = false;
		this.paused = false;
		if (this.currentSource) { this.currentSource.destroy(); }
		this.currentSource = null;
		if (this.currentAudioProcessor) { this.currentAudioProcessor.destroy(); }
		this.currentAudioProcessor = null;
		if (this.audioPlayer) { this.audioPlayer.stop(); }
		this.audioPlayer = null;
		if (this.subscription) { this.subscription.unsubscribe(); }
		this.subscription = null;

		this.queue.nextSong();
	}

	/**
	 * pauseAudioPlayer()
	 * 
	 * Only pauses audio player, used while changing audio settings and waiting for ffmpeg to start
	 */
	pauseAudioPlayer() {
		if (!this.currentSource || !this.audioPlayer) return;
		this.audioPlayer.pause();
	}

	/**
	 * play()
	 * 
	 * Plays from given stream to voice channel if connected
	 * If not connected, nothing happens
	 * If already playing something, stops previous stream and plays new stream
	 * @param source - source to play from
	 */
	async play(source: AudioSource) {
		this.playing = true;
		// set currentSource
		if (this.currentSource) { this.currentSource.destroy(); }
		this.currentSource = source;

		// create new audio processor
		if (this.currentAudioProcessor) { this.currentAudioProcessor.destroy(); }
		this.currentAudioProcessor = new AudioProcessor(this.guildHandler, new AudioSettings({ nightcore: false }));

		// create audio player for this song
		if (this.subscription) { this.subscription.unsubscribe(); }
		this.audioPlayer = Voice.createAudioPlayer();
		this.subscription = this.voiceConnection.subscribe(this.audioPlayer);
		this.audioPlayer.on('error', (error) => {
			this.error(`{error: ${error}} on audioPlayer while playing song with {url: ${this.currentSource.song.url}}`);
			this.finishedSong();
		});

		// catch error events
		this.currentSource.events.on('error', (error) => {
			const errorId = this.ui.sendError(
				`There was an error playing song: ${this.currentSource.song.title}\n
				The following might tell you why:\n\`\`\`${error}\`\`\``
			);
			this.error(`Error while playing song with {url: ${this.currentSource.song.url}}. {errorId: ${errorId}}`);
			this.finishedSong();
		});
		this.currentAudioProcessor.events.on('error', (error) => {
			const errorId = this.ui.sendError(
				`There was an error playing song: ${this.currentSource.song.title}\n
				The following might tell you why:\n\`\`\`${error}\`\`\``
			);
			this.error(`Error while playing song with {url: ${this.currentSource.song.url}}. {errorId: ${errorId}}`);
			this.finishedSong();
		});

		try {
			// create and play the resource
			const pcmStream = await this.currentSource.getStream();
			const opusStream = await this.currentAudioProcessor.processStream(pcmStream, this.currentSource);
			const resource = Voice.createAudioResource(opusStream, { inputType: Voice.StreamType.OggOpus });
			this.audioPlayer.play(resource);

			// catch finished stream event
			opusStream.on('end', () => {
				clearInterval(this._finishedSongCheck);
				try {
					this.debug(`Finished playing song with {url: ${this.currentSource.song.url}}`);
					this.finishedSong();
				} catch {/* */ }
			});
			this._finishedSongCheck = setInterval(() => {
				if (!resource.ended) return;

				clearInterval(this._finishedSongCheck);
				try {
					this.debug(`Finished playing song with {url: ${this.currentSource.song.url}}`);
					this.finishedSong();
				} catch {/* */ }
			}, 100);
		}
		catch { /* */ }
	}
}