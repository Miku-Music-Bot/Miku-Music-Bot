"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildComponent = void 0;
/**
 * Guild Component
 *
 * Makes functions for guild compontents easier to use
 */
var GuildComponent = /** @class */ (function () {
    /**
     * @param {GuildHandler} guildHandler
     */
    function GuildComponent(guildHandler) {
        // guildHandler objects
        this.bot = guildHandler.bot;
        this.guild = guildHandler.guild;
        this.data = guildHandler.data;
        this.ui = guildHandler.ui;
        // logging
        this.logger = guildHandler.logger;
        this.debug = guildHandler.debug;
        this.info = guildHandler.info;
        this.warn = guildHandler.warn;
        this.error = guildHandler.error;
    }
    return GuildComponent;
}());
exports.GuildComponent = GuildComponent;
