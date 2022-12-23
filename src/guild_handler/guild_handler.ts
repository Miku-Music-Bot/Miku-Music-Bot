import Discord from "discord.js";
import UI from "./ui";

export default class GuildHandler extends UI {

  constructor(guild_id: string) {
    super(guild_id);
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