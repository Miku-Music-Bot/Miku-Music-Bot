const path = require('path');
const { VoiceConnection } = require('@discordjs/voice');

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
	 * @param {string} channelId - discord channel id of voice channel
	 * @returns {Promise} - Promise that resolves to once vc is joined, 
	 */
	join(channelId) {
		this.vc = new Promise((resolve, reject) => {
			try {
				const connection = new VoiceConnection(
					{
						channelId: channelId,
						guildId: this.data.guildId
					}
				);

				console.log(connection);
			}
			catch (error) {
				console.log(error);
				reject();
			}
		});
		return this.vc;
	}
}

module.exports = VCPlayer;