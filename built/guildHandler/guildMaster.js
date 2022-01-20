"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotMaster = void 0;
var guildHandler_1 = require("./guildHandler");
/**
 * BotMaster
 *
 * Handles adding, getting, and removing guild handlers
 */
var BotMaster = /** @class */ (function () {
    function BotMaster() {
        this.guildList = {};
    }
    /**
     * getGuild()
     *
     * Returns GuildHandler for guild with matching id
     * @param {string} id - discord guild id string
     * @return {GuildHandler | undefined} - returns guildHandler or undefined if not found
     */
    BotMaster.prototype.getGuild = function (id) {
        return this.guildList[id];
    };
    /**
     * newGuild()
     *
     * checks if guild already has a handler
     * if not, creates a handler
     * @param {string} id - discord guild id string
     */
    BotMaster.prototype.newGuild = function (id) {
        if (!this.getGuild(id)) {
            var newGuild = new guildHandler_1.GuildHandler(id);
            this.guildList[id] = newGuild;
        }
    };
    /**
     * removeGuild()
     *
     * Removes guild handler with matching id
     * @param {string} id - discord guild id string
     */
    BotMaster.prototype.removeGuild = function (id) {
        this.guildList[id].removeGuild();
        this.guildList[id] = undefined;
    };
    return BotMaster;
}());
exports.BotMaster = BotMaster;
