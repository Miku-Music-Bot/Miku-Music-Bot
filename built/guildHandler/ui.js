"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI = void 0;
var Discord = require("discord.js");
var guildComponent_1 = require("./guildComponent");
/* eslint-disable */
var GREY = '#373b3e';
var TEAL = '#137a7f';
var PINK = '#e12885';
var YT_RED = '#FF0000';
var SC_ORANGE = '#FE5000';
var GD_BLUE = '#4688F4';
/* eslint-enable */
/**
 * UI
 *
 * Handles creating and refreshing the user interface of the bot in discord
 */
var UI = /** @class */ (function (_super) {
    __extends(UI, _super);
    /**
     * UI
     * @param {GuildHandler} guildHandler - guildHandler of the guild this ui object is to be responsible for
     */
    function UI(guildHandler) {
        return _super.call(this, guildHandler) || this;
    }
    /**
     * sendUI()
     *
     * Sends ui to channel
     */
    UI.prototype.sendUI = function () {
        // this needs to be improved to not use .get();
        var channel = this.bot.channels.cache.get(this.data.channelId);
        if (channel instanceof Discord.TextChannel) {
            channel.send({ embeds: [this.createUI()] });
        }
    };
    /**
     * createUI()
     *
     * Creates discord messageEmbed for UI
     * @return {Discord.MessageEmbed}
     */
    UI.prototype.createUI = function () {
        var userInterface = new Discord.MessageEmbed()
            .setDescription('hi');
        return userInterface;
    };
    /**
     * sendNotification()
     *
     * Sends a notification
     * @param {string} message - message you want to send
     * @param {string} channelId - discord channel id for text channel for message to be sent
     */
    UI.prototype.sendNotification = function (message, channelId) {
        return __awaiter(this, void 0, void 0, function () {
            var notification, row, channel, msg, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!channelId) {
                            channelId = this.data.channelId;
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        this.debug("Sending notification with {message: ".concat(message, "} to {channelId: ").concat(channelId, "}"));
                        notification = new Discord.MessageEmbed()
                            .setColor(GREY)
                            .setDescription(message);
                        row = new Discord.MessageActionRow()
                            .addComponents(new Discord.MessageButton() // close button
                            .setCustomId('primary')
                            .setStyle('PRIMARY')
                            .setEmoji('❌'));
                        return [4 /*yield*/, this.bot.channels.fetch(channelId)];
                    case 2:
                        channel = _a.sent();
                        if (!(channel instanceof Discord.TextChannel)) return [3 /*break*/, 4];
                        return [4 /*yield*/, channel.send({ embeds: [notification], components: [row] })];
                    case 3:
                        msg = _a.sent();
                        this.debug("Notification message sent, {messageId: ".concat(msg.id, "}"));
                        return [3 /*break*/, 5];
                    case 4:
                        this.debug("Channel with {channelId: ".concat(channelId, "} was not a text channel, notification with {message: ").concat(message, "} was not sent"));
                        _a.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        this.error("{error: ".concat(error_1, "} while creating/sending notification message."));
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * sendError()
     *
     * Sends a notification
     * @param {string} message - message you want to send
     * @param {boolean} saveErrorId - create an error id or not
     * @param {string} channelId - discord channel id for text channel for message to be sent
     * @param {number} - randomized error id
     */
    UI.prototype.sendError = function (message, saveErrorId, channelId) {
        var _this = this;
        if (!channelId) {
            channelId = this.data.channelId;
        }
        var errorId = (Date.now() * 1000) + Math.floor(Math.random() * (9999 - 1000) + 1000); // Unix Timestamp + random number between 1000-9999
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var error, channel, msg, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        this.debug("Sending error message with {message: ".concat(message, "} to {channelId: ").concat(channelId, "}"));
                        error = new Discord.MessageEmbed()
                            .setColor(PINK)
                            .setDescription(message);
                        if (saveErrorId) {
                            error.setFooter({ text: "Error id ".concat(errorId) });
                        }
                        return [4 /*yield*/, this.bot.channels.fetch(channelId)];
                    case 1:
                        channel = _a.sent();
                        if (!(channel instanceof Discord.TextChannel)) return [3 /*break*/, 3];
                        return [4 /*yield*/, channel.send({ embeds: [error] })];
                    case 2:
                        msg = _a.sent();
                        this.debug("Error message sent, {messageId: ".concat(msg.id, "}"));
                        return [3 /*break*/, 4];
                    case 3:
                        this.debug("Channel with {channelId: ".concat(channelId, "} was not a text channel, error with {message: ").concat(message, "} was not sent"));
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        this.error("{error: ".concat(error_2, "} while creating/sending error message."));
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        }); })();
        return errorId;
    };
    return UI;
}(guildComponent_1.GuildComponent));
exports.UI = UI;
