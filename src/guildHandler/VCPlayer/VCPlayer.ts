import * as Voice from '@discordjs/voice';

import GuildComponent from '../GuildComponent';
import type GuildHandler from '../GuildHandler';
import type AudioSource from './sources/AudioSource';

/**
 * VCPlayer
 *
 * Handles joining and playing a stream in a voice channel
 */
export default class VCPlayer extends GuildComponent {
	private _voiceConnection: Voice.VoiceConnection;
	private _audioPlayer: Voice.AudioPlayer;
	private _subscription: Voice.PlayerSubscription;
	private _currentSource: AudioSource;
	private _finishedSongCheck: NodeJS.Timer;
	private _connected: boolean;
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
			this._voiceConnection = Voice.joinVoiceChannel({
				channelId: channelId,
				guildId: this.guild.id,
				selfMute: false,
				selfDeaf: true,
				adapterCreator: this.guild.voiceAdapterCreator as unknown as Voice.DiscordGatewayAdapterCreator, 			// <-- 1/20/22 bug, workaround: "as unknown as Voice.DiscordGatewayAdapterCreator". reference: https://github.com/discordjs/discord.js/issues/7273. 
			});
		} catch (error) {
			this.debug(`Error while joining voice channel with {channelId: ${channelId}}`);
		}

		this._voiceConnection.on(Voice.VoiceConnectionStatus.Disconnected, async () => {
			this.debug(`Voice connection for {channelId: ${channelId}} disconnected`);
			try {
				await Promise.race([
					Voice.entersState(this._voiceConnection, Voice.VoiceConnectionStatus.Signalling, 5000),
					Voice.entersState(this._voiceConnection, Voice.VoiceConnectionStatus.Connecting, 5000),
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

		this._voiceConnection.on('error', (error) => {
			this.error(`{error: ${error}} on voice connection to {channelId: ${channelId}}`);
			this.leave();
		});

		return Voice.entersState(this._voiceConnection, Voice.VoiceConnectionStatus.Ready, 5000);
	}

	/**
	 * join()
	 *
	 * Joins the voice channel specified
	 * @param userId - discord user to join in voice channel
	 * @return promise that resolves if a voice channel is joined or rejects if failed
	 */
	async join(userId: string): Promise<boolean> {
		this.info(`Joining {userId: ${userId}} in voice channel`);

		try {
			const member = await this.guild.members.fetch({ user: userId });

			// check if they are in a voice channel
			if (!member.voice.channelId) {
				// if they aren't send and error message
				this.info(`{userId: ${userId}} was not found in a voice channel`);
				this.ui.sendError(`<@${userId}> Join a voice channel first!`);
				return false;
			}
			// if they are join it and send notification that join was successful
			this.debug(`Found that {userId: ${userId}} is in {channelId: ${member.voice.channelId}}`);

			await this._joinChannelId(member.voice.channelId);
			this.info(`Joined {userId: ${userId}} in {channelId: ${member.voice.channelId}}`);
			this.ui.sendNotification(`Joined <@${userId}> in ${member.voice.channel.name}`);

			this._connected = true;
			return true;
		}
		catch (error) {
			const errorId = this.ui.sendError(`<@${userId}> Sorry! There was an error joining the voice channel.`, true);
			this.error(`{error: ${error}} while joining {userId: ${userId}} in voice channel. {errorId: ${errorId}}`);
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
			this._connected = false;
			this.playing = false;
			this.paused = false;
			if (this._currentSource) { this._currentSource.destroy(); }
			if (this._audioPlayer) { this._audioPlayer.stop(); }
			if (this._subscription) { this._subscription.unsubscribe(); }

			this._voiceConnection.destroy();
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
		if (!this._currentSource || !this._audioPlayer) return;

		if (this._currentSource.song.live) {
			this.ui.sendError('Livestreams cannot be paused!');
			return;
		}

		this.paused = true;
		this._currentSource.pause();
		this._audioPlayer.pause();
	}

	/**
	 * resume()
	 * 
	 * Resumes currently playing song
	 */
	resume() {
		if (!this._currentSource || !this._audioPlayer) return;

		this.paused = false;
		this.paused = false;
		this._currentSource.resume();
		this._audioPlayer.unpause();
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
		if (this._currentSource) { this._currentSource.destroy(); }
		if (this._audioPlayer) { this._audioPlayer.stop(); }
		if (this._subscription) { this._subscription.unsubscribe(); }

		this.queue.nextSong();
	}

	/**
	 * pauseAudioPlayer()
	 * 
	 * Only pauses audio player, used while changing audio settings and waiting for ffmpeg to start
	 */
	pauseAudioPlayer() {
		if (!this._currentSource || !this._audioPlayer) return;
		this._audioPlayer.pause();
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
		if (!this._connected) return;
		if (source.destroyed) return;
		this.playing = true;
		// set currentSource
		if (this._currentSource) { this._currentSource.destroy(); }
		this._currentSource = source;

		// create audio player for this song
		if (this._subscription) { this._subscription.unsubscribe(); }
		this._audioPlayer = Voice.createAudioPlayer();
		this._subscription = this._voiceConnection.subscribe(this._audioPlayer);
		this._audioPlayer.on('error', (error) => {
			this.error(`{error: ${error}} on audioPlayer while playing song with {url: ${this._currentSource.song.url}}`);
			this.finishedSong();
		});

		// catch error events
		this._currentSource.events.on('fatalError', (error) => {
			const errorId = this.ui.sendError(
				`There was an error playing song: ${this._currentSource.song.title}\n
				The following might tell you why:\n\`\`\`${error}\`\`\``
			);
			this.error(`Error while playing song with {url: ${this._currentSource.song.url}}. {errorId: ${errorId}}`);
			this.finishedSong();
		});

		try {
			// create and play the resource
			const opusStream = await this._currentSource.getStream();
			const resource = Voice.createAudioResource(opusStream, { inputType: Voice.StreamType.OggOpus });
			this._audioPlayer.play(resource);

			// catch finished stream event
			opusStream.on('end', () => {
				clearInterval(this._finishedSongCheck);
				try {
					this.debug(`Finished playing song with {url: ${this._currentSource.song.url}}`);
					this.finishedSong();
				} catch {/* */ }
			});
			this._finishedSongCheck = setInterval(() => {
				if (!resource.ended) return;

				clearInterval(this._finishedSongCheck);
				try {
					this.debug(`Finished playing song with {url: ${this._currentSource.song.url}}`);
					this.finishedSong();
				} catch {/* */ }
			}, 100);
		}
		catch { /* */ }
	}
}