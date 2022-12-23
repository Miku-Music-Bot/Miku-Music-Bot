import EventEmitter from "events";
import TypedEventEmitter from "typed-emitter";
import DatabaseHandlerInterface from "../database_handler/database_handler_interface";
import Logger from "../logger";

export default class GuildConfig {
  private events_ = new EventEmitter as TypedEventEmitter<{ config_ready: () => void }>;
  get events() { return this.events_; }

  private guild_id_: string;
  private database: DatabaseHandlerInterface;

  private prefix_: string;
  set prefix(p: string) { this.prefix = p; this.UpdateGuildConfig(); }
  get prefix() { return this.prefix_; }

  private channel_id_: string;
  set channel_id(c: string) { this.channel_id_ = c; this.UpdateGuildConfig(); }
  get channel_id() { return this.channel_id_; }

  private autoplay_: boolean;
  set autoplay(a: boolean) { this.autoplay_ = a; this.UpdateGuildConfig(); }
  get autoplay() { return this.autoplay_; }

  private shuffle_: boolean;
  set shuffle(s: boolean) { this.shuffle_ = s; this.UpdateGuildConfig(); }
  get shuffle() { return this.shuffle_; }

  private log_: Logger;

  constructor(guild_id: string) {
    this.guild_id_ = guild_id;
    this.log_ = new Logger(this.guild_id_);
    this.database = new DatabaseHandlerInterface(this.log_);
    this.FetchGuildConfig();
  }

  private async NewGuildConfig() {
    try {
      await this.database.NewGuild(this.guild_id_);
    } catch (error) {
      this.log_.error("Error while creating guild database entry, attempting to retry fetch guild config in 5 seconds", error);
      setTimeout(() => { this.FetchGuildConfig(); }, 5000);
      return;
    }
    this.log_.info("New database entry created");
    this.FetchGuildConfig();
  }

  private async FetchGuildConfig() {
    let guild_config;
    try {
      guild_config = await this.database.FetchGuildConfig(this.guild_id_);
    } catch (error) {
      this.log_.error("Error while fetching guild config, attempting to create new guild database entry", error);
      this.NewGuildConfig();
      return;
    }
    this.prefix_ = guild_config.prefix;
    this.channel_id_ = guild_config.channel_id;
    this.autoplay_ = guild_config.autoplay;
    this.shuffle_ = guild_config.shuffle;
    this.events_.emit("config_ready");
    this.log_.info("Sucessfully fetched guild config");
  }

  private async UpdateGuildConfig() {
    const updated_config = {
      prefix: this.prefix,
      channel_id: this.channel_id,
      autoplay: this.autoplay,
      shuffle: this.shuffle
    };

    try {
      await this.database.UpdateGuildConfig(this.guild_id_, updated_config);
    } catch (error) {

    }
  }
}