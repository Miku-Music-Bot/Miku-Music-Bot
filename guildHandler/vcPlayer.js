/**
 * VCPlayer
 * 
 * Handles joining and playing a stream in a voice channel
 */

class VCPlayer {
	/**
	 * VCPlayer
	 * @param {GuildHander} - guildHandler for this vcplayer
	 */
	constructor (guildHandler) {
		this.guildHandler = guildHandler;
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
				const voiceChannel = this.guildHandler.bot.guilds.cache.get(this.guildHandler.guildData.guildId).channels.cache.get(channelId);
				if (voiceChannel) {
					voiceChannel.join();
				}
			}
			catch (error) {
				this.log(error);
				reject();
			}
		});
		return this.vc;
	}
}

module.exports = VCPlayer;