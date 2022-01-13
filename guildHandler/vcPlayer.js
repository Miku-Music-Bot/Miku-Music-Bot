const path = require('path');
const { joinVoiceChannel } = require('@discordjs/voice');

const GuildComponent = require(path.join(__dirname, 'guildComponent.js'));

/**
 * VCPlayer
 * 
 * Handles joining and playing a stream in a voice channel
 */

class VCPlayer extends GuildComponent {
	/**
	 * VCPlayer
	 * @param {GuildHander} - guildHandler for this vcplayer
	 */
	constructor(guildHandler) {
		super(guildHandler);
	}

	/**
	 * join()
	 * 
	 * Joins the voice channel specified
	 * @param {User} user - discord user to join in voice channel
	 * @returns {Promise} - promise that resolves if a voice channel is joined or rejects if failed
	 */
	join(user) {
		return new Promise((resolve, reject) => {
			this.info(`Joining {userId: ${user.id}} in voice channel`);

			// fetch guild member with voice info
			this.guild.members.fetch({ user: user.id, force: true })
				.then((member) => {
					// check if they are in a voice channel
					if (member.voice.channelId) {
						// if they are join it and send notification that join was successful
						this.debug(`Found that {userId: ${user.id}} is in {channelId: ${member.voice.channelId}}`);

						joinVoiceChannel({
							channelId: member.voice.channelId,
							guildId: this.guild.id,
							adapterCreator: this.guild.voiceAdapterCreator,
						});

						this.info(`Joined {userId: ${user.id}} in {channelId: ${member.voice.channelId}}`);
						this.sendNotification(`Joined <@${user.id}> in ${member.voice.channel.name}`);
						resolve();
					}
					else {
						// if they aren't send and error message
						this.info(`{userId: ${user.id}} was not found in a voice channel`);
						this.sendError(`<@${user.id}> Join a voice channel first!`);
						reject();
					}
				})
				.catch((error) => {
					const errorId = Math.floor(Math.random() * (999999999999999 - 100000000000000) + 100000000000000);
					this.sendError(`<@${user.id}> Sorry! There was an error joining you in the voice channel.\nError id: ${errorId}`);
					this.error(`{error: ${error}} while joining {userId: ${user.id}} in voice channel. {errorId: ${errorId}}`);
					reject();
				});
		});
	}
}

module.exports = VCPlayer;