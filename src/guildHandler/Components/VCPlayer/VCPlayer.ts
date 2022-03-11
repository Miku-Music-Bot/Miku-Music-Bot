import * as Voice from '@discordjs/voice';
import * as path from 'path';
import { PassThrough } from 'stream';

import GuildComponent from '../GuildComponent';
import type GuildHandler from '../../GuildHandler';
import type AudioSource from './AudioSources/AudioSource';

/**
 * VCPlayer
 *
 * Handles joining and playing a stream in a voice channel
 */
export default class VCPlayer extends GuildComponent {
	private _voiceConnection: Voice.VoiceConnection;		// current voice connection
	private _audioPlayer: Voice.AudioPlayer;				// current audio player
	private _subscription: Voice.PlayerSubscription;		// current audio player subscription
	private _currentOpusStream: PassThrough;				// current audio stream
	private _currentSource: AudioSource;					// current audio source
	private _currentResource: Voice.AudioResource;			// current audio resource
	private _finishedSongCheck: NodeJS.Timer;				// interval to check if song is finished or not

	connected: boolean;										// connected to voice channel or not
	playing: boolean;										// currently playing a song or not
	paused: boolean;										// currently paused or not

	/**
	 * @param guildHandler - guildHandler for this vcplayer
	 */
	constructor(guildHandler: GuildHandler) {
		super(guildHandler, path.basename(__filename));

		this.playing = false;
		this.paused = false;
	}

	/**
	 * _joinChannelId()
	 * 
	 * Joins a voice channel
	 * @param channelId - channel id of voice channel to join
	 */
	private async _joinChannelId(channelId: string): Promise<unknown> {
		try {
			this.debug(`Attempting to join voice channel with {channelId:${channelId}}`);
			this._voiceConnection = Voice.joinVoiceChannel({
				channelId: channelId,
				guildId: this.guild.id,
				selfMute: false,
				selfDeaf: true,
				adapterCreator: this.guild.voiceAdapterCreator as unknown as Voice.DiscordGatewayAdapterCreator, 			// <-- 1/20/22 bug, workaround: "as unknown as Voice.DiscordGatewayAdapterCreator". reference: https://github.com/discordjs/discord.js/issues/7273. 
			});

			this._voiceConnection.on('error', (error) => {
				this.error(`{error: ${error.message}} on voice connection to {channelId: ${channelId}}, leaving. {stack:${error.stack}}`);
				this.leave();
			});
		}
		catch (error) { this.error(`{error:${error.message}} while joining voice channel with {channelId: ${channelId}}. {stack:${error.stack}}`); }

		return Voice.entersState(this._voiceConnection, Voice.VoiceConnectionStatus.Ready, 5_000);
	}

	/**
	 * join()
	 *
	 * Joins the voice channel specified
	 * @param userId - discord user to join in voice channel
	 * @return promise that resolves if a voice channel is joined or rejects if failed
	 */
	async join(userId: string): Promise<boolean> {
		try {
			this.debug(`Joining {userId: ${userId}} in voice channel, fetching user`);
			const member = await this.guild.members.fetch({ user: userId });
			this.debug(`Successfully fetched user with {userId:${userId}}`);

			// check if they are in a voice channel
			if (!member.voice.channelId) {
				// if they aren't send and error message
				this.info(`UserId: ${userId} was not found in a voice channel`);
				this.ui.sendError(`<@${userId}> Join a voice channel first!`);
				return false;
			}
			// if they are join it and send notification that join was successful
			this.debug(`Found that {userId: ${userId}} is in {channelId: ${member.voice.channelId}}`);

			await this._joinChannelId(member.voice.channelId);
			this.info(`Joined userId: ${userId} in {channelId: ${member.voice.channelId}}`);
			this.ui.sendNotification(`Joined <@${userId}> in ${member.voice.channel.name}`);

			this.connected = true;
			return true;
		}
		catch (error) {
			const errorId = this.ui.sendError(`<@${userId}> Sorry! There was an error joining the voice channel.`, true);
			this.error(`{error: ${error.message}} while joining {userId: ${userId}} in voice channel. {stack:${error.stack}} {errorId: ${errorId}}`);
			return false;
		}
	}

	/**
	 * leave()
	 * 
	 * Leaves the currently connected voice connection
	 */
	leave(): void {
		try {
			this.debug('Leaving voice channel');
			clearInterval(this._finishedSongCheck);		// stop checking if song is finished or not
			this.connected = false;						// no longer connected, playing, or paused
			this.playing = false;
			this.paused = false;
			this.finishedSong();						// finish current song
			this._voiceConnection.destroy();			// close voice connection
			this.queue.stop();							// stop queue
			this.info('Left voice channel');
		}
		catch (error) { this.error(`{error: ${error.message}} while leaving voice channel. {stack:${error.stack}}`); }
	}

	/**
	 * pause()
	 * 
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

		this.paused = true;
		this._currentSource.pause();
		const success = this._audioPlayer.pause(true);
		if (success) { this.info('Paused song'); }
		else { this.warn('Failed to pause audio player'); }
	}

	/**
	 * resume()
	 * 
	 * Resumes currently playing song
	 */
	resume(): void {
		this.debug('Attempting to resume player');
		if (!this._currentSource || !this._audioPlayer) {		// ignore if there is nothing playing
			this.info('Currently nothing to resume, nothing done');
			return;
		}

		this.paused = false;
		this.paused = false;
		this._currentSource.resume();
		const success = this._audioPlayer.unpause();
		if (success) { this.info('Resumed song'); }
		else { this.warn('Failed to resume audio player'); }
	}

	/**
	 * finishedSong()
	 * 
	 * Call to clean up current song and call nextSong on this.queue
	 */
	finishedSong(): void {
		this.debug('Finishing song');
		clearInterval(this._finishedSongCheck);			// stop checking for end of song
		this.playing = false;							// no longer playing or paused
		this.paused = false;
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

		if (this.connected) {							// if still connected (finishedSong() was not called by leave()), play next song
			this.debug('Currently connected to voice channel, ask queue to play next song');
			this.queue.nextSong();
		}
		this.debug('Currently not connected to voice channel, doing nothing');
	}

	/**
	 * pauseAudioPlayer()
	 * 
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
	 * play()
	 * 
	 * Plays from given stream to voice channel if connected
	 * If not connected, nothing happens
	 * If already playing something, stops previous stream and plays new stream
	 * @param source - source to play from
	 */
	play(source: AudioSource): void {
		this.debug(`Attempting to play audio source with song {url:${source.song.url}}`);
		if (!this.connected) {				// ignore if not in a voice channel
			this.debug('Currently not connected, nothing played');
			return;
		}
		if (source.destroyed) {				// ignore if source is already destroyed
			this.debug('Source has already been destroyed, nothing played');
			return;
		}
		this.playing = true;

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
	get currentSource() { return this._currentSource; }
}