import * as Voice from '@discordjs/voice';
import path from 'path';
import { PassThrough } from 'stream';

import GuildComponent from '../GuildComponent';
import type GuildHandler from '../../GuildHandler';
import type AudioSource from './AudioSources/AudioSource';
import Song from '../Data/SourceData/Song';
import YTSource from './AudioSources/YTAudioSource';
import GDSource from './AudioSources/GDAudioSource';
import GDSong from '../Data/SourceData/GDSources/GDSong';

/**
 * @name VCPlayer
 * Handles joining and playing a stream in a voice channel
 */
export default class VCPlayer extends GuildComponent {
	private _voiceConnection: Voice.VoiceConnection;
	private _audioPlayer: Voice.AudioPlayer;
	private _subscription: Voice.PlayerSubscription;
	private _currentOpusStream: PassThrough;
	private _currentSource: AudioSource;
	private _currentResource: Voice.AudioResource;
	private _finishedSongCheck: NodeJS.Timer;

	private _connected = false;										// connected to voice channel or not
	private _playing = false;										// currently playing a song or not
	private _paused = false;										// currently paused or not

	/**
	 * @param guildHandler - guildHandler for this vcplayer
	 */
	constructor(guildHandler: GuildHandler) { super(guildHandler, path.basename(__filename)); }

	/**
	 * @name _joinChannelId()
	 * Joins a voice channel
	 * @param channelId - channel id of voice channel to join
	 * @returns Promise that resolves to true if joined successfully
	 */
	private async _joinChannelId(channelId: string): Promise<boolean> {
		try {
			this.debug(`Attempting to join voice channel with {channelId:${channelId}}`);
			this._voiceConnection = Voice.joinVoiceChannel({
				channelId: channelId,
				guildId: this.guildHandler.id,
				selfMute: false,
				selfDeaf: true,
				adapterCreator: this.guild.voiceAdapterCreator as unknown as Voice.DiscordGatewayAdapterCreator, 			// <-- 1/20/22 bug, workaround: "as unknown as Voice.DiscordGatewayAdapterCreator". reference: https://github.com/discordjs/discord.js/issues/7273. 
			});

			this._voiceConnection.on('error', (error) => {
				const errorId = this.ui.sendError('An error occured on the voice connection. Disconnected.', true);
				this.error(`{error: ${error.message}} on voice connection to {channelId: ${channelId}}, leaving. {errorId:${errorId}}`, error);
				this.leave();
			});

			await Voice.entersState(this._voiceConnection, Voice.VoiceConnectionStatus.Ready, 5_000);
			return true;
		}
		catch (error) {
			this.error(`{error:${error.message}} while joining voice channel with {channelId: ${channelId}}`, error);
			return false;
		}
	}

	/**
	 * @name join()
	 * Joins the voice channel specified
	 * @param userId - discord user to join in voice channel
	 * @return promise that resolves to true if a voice channel is joined or rejects if failed
	 */
	async join(userId: string): Promise<boolean> {
		let member;
		try {
			this.debug(`Joining {userId: ${userId}} in voice channel, fetching user`);
			member = await this.guild.members.fetch({ user: userId });
			this.debug(`Successfully fetched user with {userId:${userId}}`);
		}
		catch (error) {
			this.error(`{error:${error.message}} while fetching user with {userId:${userId}}`, error);
		}

		// check if they are in a voice channel
		if (member && !member.voice.channelId) {
			// if they aren't send and error message
			this.info(`UserId: ${userId} was not found in a voice channel`);
			this.ui.sendError(`<@${userId}> Join a voice channel first!`);
			return false;
		}
		// if they are join it and send notification that join was successful
		this.debug(`Found that {userId: ${userId}} is in {channelId: ${member.voice.channelId}}`);


		const success = await this._joinChannelId(member.voice.channelId);
		if (success) {
			this.info(`Joined userId: ${userId} in {channelId: ${member.voice.channelId}}`);
			this.ui.sendNotification(`Joined <@${userId}> in ${member.voice.channel.name}`);

			this._connected = true;
			return true;
		}
		else {
			const errorId = this.ui.sendError(`<@${userId}> Sorry! There was an error joining the voice channel.`, true);
			this.error(`There was an error while joining user with {userId:${userId}} in {channelId:${member.voice.channelId}}. {errorId:${errorId}}`);
			return false;
		}
	}

	/**
	 * @name leave()
	 * Leaves the currently connected voice connection
	 */
	leave(): void {
		try {
			this.info('Leaving voice channel');
			clearInterval(this._finishedSongCheck);
			this._connected = false;
			this._playing = false;
			this._paused = false;
			this.finishedSong();
			this._voiceConnection.destroy();
			this.queue.clearQueue();
			this.info('Left voice channel');
		}
		catch (error) {
			const errorId = this.ui.sendError('There was an error while leaving the voice channel.', true);
			this.error(`{error: ${error.message}} while leaving voice channel. {errorId:${errorId}}`, error);
		}
	}

	/**
	 * @name pause()
	 * Pauses currently playing song
	 */
	pause(): void {
		this.debug('Attempting to pause player');
		if (!this._currentSource || !this._audioPlayer) {		// ignore if there is nothing playing
			this.info('Currently nothing to pause, nothing done');
			return;
		}

		if (this._currentSource.song.live) {					// ignore if current song if live
			this.info('Song is live, cannot pause');
			this.ui.sendError('Livestreams cannot be paused!');
			return;
		}

		this._paused = true;
		this._currentSource.pause();
		const success = this._audioPlayer.pause(true);
		if (success) { this.info('Paused song'); }
		else { this.debug('Failed to pause audio player'); }
	}

	/**
	 * @name resume()
	 * Resumes currently playing song
	 */
	resume(): void {
		this.debug('Attempting to resume player');
		if (!this._currentSource || !this._audioPlayer) {		// ignore if there is nothing playing
			this.info('Currently nothing to resume, nothing done');
			return;
		}

		this._paused = false;
		this._paused = false;
		this._currentSource.resume();
		const success = this._audioPlayer.unpause();
		if (success) { this.info('Resumed song'); }
		else { this.debug('Failed to resume audio player'); }
	}

	/**
	 * @name finishedSong()
	 * Call to clean up current song and call nextSong on this.queue
	 */
	finishedSong(): void {
		this.debug('Finishing song');
		clearInterval(this._finishedSongCheck);			// stop checking for end of song
		this._playing = false;							// no longer playing or paused
		this._paused = false;
		if (this._currentOpusStream) {					// clean up current source
			this.debug('Removing listners on currentOpusStream');
			this._currentOpusStream.removeAllListeners();
		}
		if (this._currentSource) {
			this.debug('Destroying current source');
			this._currentSource.destroy();
		}
		if (this._audioPlayer) {
			this.debug('Stopping current audio player');
			this._audioPlayer.stop();
		}
		if (this._subscription) {
			this.debug('Unsubscribing from current subscription');
			this._subscription.unsubscribe();
		}

		if (this._connected) {							// if still connected (finishedSong() was not called by leave()), play next song
			this.debug('Currently connected to voice channel, ask queue to play next song');
			this.queue.nextSong();
			return;
		}
		this.debug('Currently not connected to voice channel, doing nothing');
	}

	/**
	 * @name pauseAudioPlayer()
	 * Only pauses audio player, used while changing audio settings and waiting for ffmpeg to start
	 */
	pauseAudioPlayer(): void {
		this.debug('Attempting to pause audio player');
		if (!this._currentSource || !this._audioPlayer) {			// ignore if there is nothing playing
			this.debug('Currently nothing to pause, nothing done');
			return;
		}

		const success = this._audioPlayer.pause(true);
		if (success) { this.info('Paused audio player only'); }
		else { this.warn('Failed to pause audio player'); }
	}

	/**
	 * @name play()
	 * Plays from given stream to voice channel if connected
	 * If not connected, nothing happens
	 * If already playing something, stops previous stream and plays new stream
	 * @param song - source to play from
	 */
	play(song: Song): void {
		const createSource = (song: Song): AudioSource | undefined => {
			let source: AudioSource;
			switch (song.type) {
				case ('yt'): {
					source = new YTSource(this.guildHandler, song);
					break;
				}
				case ('gd'): {
					source = new GDSource(this.guildHandler, song as GDSong);
					break;
				}
				default: {
					break;
				}
			}
			return source;
		};
		const source = createSource(song);
		this.debug(`Attempting to play audio source with song {url:${source.song.url}}`);
		if (!this._connected) {				// ignore if not in a voice channel
			this.debug('Currently not connected, nothing played');
			return;
		}
		if (source.destroyed) {				// ignore if source is already destroyed
			this.debug('Source has already been destroyed, nothing played');
			return;
		}
		this._playing = true;

		// clean up previous source and create new source
		// stop previous stream
		if (this._currentOpusStream) {
			this.debug('Stopping previous opus stream');
			this._currentOpusStream.removeAllListeners();
			this._currentOpusStream.end();
		}
		// set currentSource
		if (this._currentSource) {
			this.debug('Destroying previous audio source');
			this._currentSource.destroy();
		}
		this._currentSource = source;
		// create audio player for this song
		if (this._subscription) {
			this.debug('Unsubscribing from previous subscription');
			this._subscription.unsubscribe();
		}
		this._audioPlayer = Voice.createAudioPlayer();
		this._subscription = this._voiceConnection.subscribe(this._audioPlayer);
		this._audioPlayer.on('error', (error) => {
			this.error(`{error: ${error.message}} on audioPlayer while playing song with {url: ${source.song.url}}, finishing song early. {stack:${error.stack}}`);
			this.finishedSong();
		});

		// catch error events
		source.events.on('fatalError', (error) => {
			let errorTxt = '';
			const lines = error.split('\n');
			const last5 = lines.slice(-5);
			for (let i = 0; i < last5.length; i++) { errorTxt += last5[i] + '\n'; }
			const errorId = this.ui.sendError(
				`There was an error playing song: ${source.song.title}\n
				The following might tell you why:\n\`\`\`${errorTxt}\`\`\``
			);
			this.error(`{error:${error.message}} while playing song with {url: ${source.song.url}}. {stack:${error.stack}}. {errorId: ${errorId}}`);
			this.finishedSong();
		});

		// get stream and play the song
		(async () => {
			try {
				// create and play the resource
				this.debug('Attempting to play from source');
				this._currentOpusStream = await source.getStream();
				this._currentResource = Voice.createAudioResource(this._currentOpusStream, { inputType: Voice.StreamType.OggOpus });
				this._audioPlayer.play(this._currentResource);

				// catch finished stream event
				const finishCheck = setInterval(() => {
					if (!this._currentResource.ended) return;

					clearInterval(finishCheck);
					this.debug(`Finished playing song with {url:${source.song.url}}`);
					this.finishedSong();
				}, 100);
				this._finishedSongCheck = finishCheck;
			}
			catch (error) {
				this.error(`{error:${error.message}} while starting playback for song with {url:${source.song.url}}. {stack:${error.stack}}`);
			}
		})();
	}

	// Getter for current source
	get connected() { return this._connected; }
	get playing() { return this._playing; }
	get paused() { return this._paused; }
	get currentSource() { return this._currentSource; }
}