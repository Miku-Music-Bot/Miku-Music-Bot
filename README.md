# Miku-DiscordMusicBot
A discord bot that plays music from Youtube and local files and can apply audio filters with ffmpeg.

1. Install NodeJS from https://nodejs.org/en/download/

2.  In the config.json file insert your discord bot token into "token"
    - Your preferred bot prefix into "prefix" (add a space to the end for cleaner commands)
    - In "ffmpegFilter" insert any audio filter arguments for ffmpeg that you want to apply
    - "idleThumbnail" is the link to the thumbnail you want displayed when the bot is idle and similarly "autoplayThumbnail" for the thumbnail when the bot is playing songs from local files
    Ignore "channelID"

3. In the same directory as miku.js, run "npm install", then "node miku.js".

4. In discord, type "[Your prefix]set channel" to set the text channel for miku to listen for commands on.

Local songs should be placed in /autoplay (avoid putting anything other than audio files in here)
