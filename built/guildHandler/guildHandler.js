"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildHandler = void 0;
var path = require("path");
var Discord = require("discord.js");
var ui_1 = require("./ui");
var data_1 = require("./guildData/data");
var permissions_1 = require("./permissions");
var vcPlayer_1 = require("./vcPlayer");
var logger_1 = require("./logger");
/* eslint-disable */ //<<<<<<<<<<<<<<<<<<<< remove this sometime
var BOT_DOMAIN = process.env.BOT_DOMAIN;
var DISCORD_TOKEN = process.env.DISCORD_TOKEN;
var SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;
/* eslint-disable */
var GREY = '#5a676b'; // colors to be used
var TEAL = '#86cecb';
var PINK = '#e12885';
var YT_RED = '#FF0000';
var SC_ORANGE = '#FE5000';
var GD_BLUE = '#4688F4';
/* eslint-enable */
/**
 * GuildHander
 *
 * Handles all bot functions for a specific guild
 */
var GuildHandler = /** @class */ (function () {
    /**
     * Creates data object and once data is ready, calls startBot()
     * @param {string} id - discord guild id for GuildHander to be responsible for
     */
    function GuildHandler(id) {
        var _this = this;
        // set up logger
        var logger = (0, logger_1.newLogger)(path.join(__dirname, 'logs', id));
        this.logger = logger;
        this.debug = function (msg) { logger.debug(msg); };
        this.info = function (msg) { logger.info(msg); };
        this.warn = function (msg) { logger.warn(msg); };
        this.error = function (msg) { logger.error(msg); };
        this.info("Creating guild handler for guild {id: ".concat(id, "}"));
        this.bot = new Discord.Client({
            intents: [
                Discord.Intents.FLAGS.GUILDS,
                Discord.Intents.FLAGS.GUILD_VOICE_STATES, // for checking who is in vc and connecting to vc
            ],
        });
        this.ready = false;
        this.bot.once('ready', function () {
            // get the guild object
            _this.guild = _this.bot.guilds.cache.get(_this.data.guildId);
            // set up guild components
            _this.ui = new ui_1.UI(_this);
            _this.vcPlayer = new vcPlayer_1.VCPlayer(_this);
            _this.permissions = new permissions_1.CommandPermissions(_this);
            _this.ready = true;
            _this.info('Logged into discord, guild handler is ready!');
            if (!_this.data.configured) {
                _this.info('This guild has not been configured, waiting set-channel command');
            }
        });
        this.data = new data_1.GuildData(this, id, function () {
            _this.info('Guild data ready, logging in to discord...');
            _this.bot.login(DISCORD_TOKEN);
        });
    }
    /**
     * messageHandler()
     *
     * Handles all messages the bot recieves
     * @param {Discord.Message} message - discord message object
     */
    GuildHandler.prototype.messageHandler = function (message) {
        // ignore if not in right channel
        if (message.channelId !== this.data.channelId && message.content.indexOf('set-channel') === -1)
            return;
        // ignore if bot isn't ready yet
        if (!this.ready)
            return;
        // split message into command and argument
        var prefix = false;
        if (message.content.startsWith(this.data.prefix)) {
            prefix = true;
            message.content = message.content.slice(this.data.prefix.length, message.content.length);
        }
        var msg = message.content + ' ';
        var command = msg.slice(0, msg.indexOf(' '));
        var argument = msg.slice(msg.indexOf(' ') + 1, msg.length);
        this.debug("Recieved {messageId: ".concat(message.id, "} with {content: ").concat(message.content, "} and {prefix: ").concat(prefix, "} from {userId: ").concat(message.author.id, "} in {channelId: ").concat(message.channelId, "}. Determined {command: ").concat(command, "}, {argument: ").concat(argument, "}"));
        // check permissions for command then handle each command
        if (this.permissions.checkMessage(command, message)) {
            switch (command) {
                case ('set-channel'): {
                    if (prefix) {
                        // set the channel, send ui, then notify user
                        this.data.setChannel(message.channelId);
                        this.ui.sendUI();
                        if (!this.data.configured) {
                            this.ui.sendNotification("<@".concat(message.author.id, "> This is where miku will live. You no longer need to use the prefix as all messages sent to this channel will be interpreted as commands and will be deleted after the command is executed."));
                            this.data.setConfigured(true);
                        }
                    }
                    else if (message.channelId === this.data.channelId) {
                        this.ui.sendNotification("<@".concat(message.author.id, "> Miku already lives here!"));
                    }
                    break;
                }
                case ('join'): {
                    // join the vc
                    this.vcPlayer.join(message.author).catch(function () { });
                    break;
                }
                case ('play'): {
                    if (argument) {
                        // do something
                    }
                    else {
                        // do something else
                    }
                    break;
                }
            }
        }
    };
    GuildHandler.prototype.removeGuild = function () {
        // stops the handler
    };
    return GuildHandler;
}());
exports.GuildHandler = GuildHandler;
