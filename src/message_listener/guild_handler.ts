import Discord from "discord.js";

export default class GuildHandler {
  private guild_id: string;

  constructor(guild_id: string) {
    this.guild_id = guild_id;
  }

  MessageHandler(message: Discord.Message) {
    //
  }

  InteractionHandler(interaction: Discord.Interaction) {
    //
  }

  RemoveGuild() {
    //
  }
}