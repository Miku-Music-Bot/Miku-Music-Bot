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
Object.defineProperty(exports, "__esModule", { value: true });
var guildComponent_js_1 = require("../guildComponent.js");
/**
 * YTSource
 *
 * Handles getting audio from a yt source
 */
var YTSource = /** @class */ (function (_super) {
    __extends(YTSource, _super);
    /**
     *
     * @param {GuildHandler} guildHandler
     * @param {Song} song
     */
    function YTSource(guildHandler, song) {
        var _this = _super.call(this, guildHandler) || this;
        _this.song = song;
        return _this;
    }
    return YTSource;
}(guildComponent_js_1.GuildComponent));
module.exports = YTSource;
