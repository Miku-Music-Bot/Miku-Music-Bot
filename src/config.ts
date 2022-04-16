import dotenv from 'dotenv';	// grab env variables

export default function getEnv(path: string) {
	dotenv.config({ path, override: true });

	const config = {
		NODE_ENV: process.env.NODE_ENV,

		DISCORD_TOKEN: process.env.DISCORD_TOKEN,
		GUILD_CREATE_RATE: parseInt(process.env.GUILD_CREATE_RATE),
		MAX_RESPONSE_WAIT: parseInt(process.env.MAX_RESPONSE_WAIT),
		BOT_INVITE_LINK: process.env.BOT_INVITE_LINK,

		MONGODB_URI: process.env.MONGODB_URI,
		MONGODB_DBNAME: process.env.MONGODB_DBNAME,
		GUILDDATA_COLLECTION_NAME: process.env.GUILDDATA_COLLECTION_NAME,
		MAX_DATABASE_RETRY_WAIT: parseInt(process.env.MAX_DATABASE_RETRY_WAIT),
		DATABASE_ACCESS_WAIT: parseInt(process.env.DATABASE_ACCESS_WAIT),
		MAX_UPDATES_BEFORE_SAVE: parseInt(process.env.MAX_UPDATES_BEFORE_SAVE),

		BOT_DOMAIN: process.env.BOT_DOMAIN,
		PORT: parseInt(process.env.PORT),

		MAX_SONG_INFO_LENGTH: parseInt(process.env.MAX_SONG_INFO_LENGTH),
		UI_REFRESH_RATE: parseInt(process.env.UI_REFRESH_RATE),
		PROGRESS_BAR_LENGTH: parseInt(process.env.PROGRESS_BAR_LENGTH),
		SHOW_NUM_ITEMS: parseInt(process.env.SHOW_NUM_ITEMS),
		NOTIFICATION_LIFE: parseInt(process.env.NOTIFICATION_LIFE),
		ITEMS_PER_PAGE: parseInt(process.env.ITEMS_PER_PAGE),
		MAX_YT_RESULTS: parseInt(process.env.MAX_YT_RESULTS),
		SHOW_QUEUE_ITEMS: parseInt(process.env.SHOW_QUEUE_ITEMS),

		ASSETS_LOC: process.env.ASSETS_LOC,
		SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,

		TEMP_DIR: process.env.TEMP_DIR,
		YT_DLP_PATH: process.env.YT_DLP_PATH,
		BIT_DEPTH: parseInt(process.env.BIT_DEPTH),
		PCM_FORMAT: process.env.PCM_FORMAT,
		AUDIO_CHANNELS: parseInt(process.env.AUDIO_CHANNELS),
		AUDIO_FREQUENCY: parseInt(process.env.AUDIO_FREQUENCY),
		SEC_PCM_SIZE: 0,
		LARGE_CHUNK_SIZE: 0,
		SMALL_CHUNK_SIZE: 0,
		CHUNK_TIMING: parseInt(process.env.CHUNK_TIMING),
		NIGHTCORE_AUDIO_FREQUENCY: parseInt(process.env.NIGHTCORE_AUDIO_FREQUENCY),
		NIGHTCORE_CHUNK_TIMING: parseInt(process.env.NIGHTCORE_CHUNK_TIMING),
		MAX_READ_RETRY: parseInt(process.env.MAX_READ_RETRY),

		LOG_DIR: process.env.LOG_DIR,
		LOG_FILE_NAME: process.env.LOG_FILE_NAME,
		LOG_DATE_PATTERN: process.env.LOG_DATE_PATTERN,
		LOG_MAX_SIZE: process.env.LOG_MAX_SIZE,
		LOG_MAX_FILES: process.env.LOG_MAX_FILES,
		ZIP_LOGS: process.env.ZIP_LOGS === 'true',

		REFRESH_PLAYLIST_INTERVAL: parseInt(process.env.REFRESH_PLAYLIST_INTERVAL),
		SEARCH_THRESHOLD: parseInt(process.env.SEARCH_THRESHOLD),
		SEARCH_DISTANCE: parseInt(process.env.SEARCH_DISTANCE),

		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
		GOOGLE_SCOPE: process.env.GOOGLE_SCOPE,
		GOOGLE_TOKEN_LOC: process.env.GOOGLE_TOKEN_LOC
	};

	config.SEC_PCM_SIZE = config.AUDIO_CHANNELS * config.AUDIO_FREQUENCY * config.BIT_DEPTH / 8;
	config.LARGE_CHUNK_SIZE = config.SEC_PCM_SIZE * 10;
	config.SMALL_CHUNK_SIZE = config.SEC_PCM_SIZE / 10;

	return Object.freeze(config);
}