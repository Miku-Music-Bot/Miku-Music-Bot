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
		this.guildHandler = guidlHandler;
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
			console.log(this.guildHandler.bot.channels.cache.get(channelId))
		});
		return this.vc;
	}
}

module.exports = VCPlayer;