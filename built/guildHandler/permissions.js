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
exports.CommandPermissions = void 0;
var guildComponent_js_1 = require("./guildComponent.js");
/**
 * CommandPermissions
 *
 * Checks if user has permission to use a certain command
 */
var CommandPermissions = /** @class */ (function (_super) {
    __extends(CommandPermissions, _super);
    /**
     * @param {GuildHandler} guildHandler
     */
    function CommandPermissions(guildHandler) {
        var _this = _super.call(this, guildHandler) || this;
        _this.permissions = {
            'set-channel': [],
            'join': [],
            'play': [],
            'pause': [],
        };
        // if the database didn't have permissions saved, set to defaults
        if (Object.keys(_this.data.permissions).length === 0) {
            _this.info('Guild permissions have not been set, setting defaults.');
            // find @everyone role id
            var everyone = _this.guild.roles.cache.filter(function (role) { return role.name === '@everyone'; }).first();
            _this.debug("Found @everyone role with {id: ".concat(everyone.id, "}"));
            // give the default @everyone permissions to each command
            var defaultEveryone = ['join', 'play', 'pause'];
            for (var i = 0; i < defaultEveryone.length; i++) {
                _this.addPermission(defaultEveryone[i], everyone.id);
            }
        }
        return _this;
    }
    /**
     * addPermission()
     *
     * @param {string} command - command to change permissions for
     * @param {string} roleId - discord role id for permissions you would like to add
     */
    CommandPermissions.prototype.addPermission = function (command, roleId) {
        // remove the permission in case it already existed
        this.removePermission(command, roleId);
        this.permissions[command].push(roleId);
        // save to database
        this.data.setPermissions(this.permissions);
        this.info("Added permission for {roleId: ".concat(roleId, "} for {command: ").concat(command, "}"));
    };
    /**
     * removePermission()
     *
     * @param {string} command - command to change permissions for
     * @param {string} roleId - discord role id for permissions you would like to add
     */
    CommandPermissions.prototype.removePermission = function (command, roleId) {
        // find location of the roleId in the permissions list
        var location = this.permissions[command].indexOf(roleId);
        if (location !== -1) {
            // if found, remove it and save to database
            this.permissions[command].splice(location, 1);
            this.data.setPermissions(this.permissions);
            this.info("Removed permission for {roleId: ".concat(roleId, "} for {command: ").concat(command, "}"));
        }
    };
    /**
     * check()
     *
     * @param {string} command - command to test
     * @param {Discord.Message} message - discord message object that requested the command
     * @return {boolean} - true if user has permission to use the command, false if not
     */
    CommandPermissions.prototype.checkMessage = function (command, message) {
        return __awaiter(this, void 0, void 0, function () {
            var member, found, i, error_1, errorId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        this.debug("Checking permissions for {messageId: ".concat(message.id, "}"));
                        // if command doesn't exist, return false
                        if (!this.permissions[command]) {
                            this.debug("Command from {messageId: ".concat(message.id, "} does not exist."));
                            this.ui.sendError("<@".concat(message.author.id, "> ").concat(message.content, " is not valid command!"), false, message.channel.id);
                            return [2 /*return*/, false];
                        }
                        // if the user is the guild owner, return true no matter what
                        if (this.guild.ownerId === message.author.id) {
                            this.debug("Command from {messageId: ".concat(message.id, "} came from guild owner, permission allowed"));
                            return [2 /*return*/, true];
                        }
                        return [4 /*yield*/, this.guild.members.fetch({ user: message.author.id })];
                    case 1:
                        member = _a.sent();
                        found = false;
                        for (i = 0; i < this.permissions[command].length; i++) {
                            if (member.roles.cache.get(this.permissions[command][i])) {
                                found = true;
                            }
                        }
                        if (found) {
                            this.debug("User with {userId: ".concat(message.author.id, "} has permissions to use command from {messageId: ").concat(message.id, "}"));
                            return [2 /*return*/, true];
                        }
                        this.debug("Permission rejected to command with {messageId: ".concat(message.id, "}"));
                        // if we get here, they don't have permission
                        this.ui.sendError("<@".concat(message.author.id, "> You don't have permission to use the \"").concat(command, "\" command!"), false, message.channel.id);
                        return [2 /*return*/, false];
                    case 2:
                        error_1 = _a.sent();
                        errorId = this.ui.sendError("<@".concat(message.author.id, "> Sorry! There was an error while joining voice channel."), true);
                        this.error("{error: ".concat(error_1, "} while checking permissions for {messageId: ").concat(message.id, "}. {errorId: ").concat(errorId, "}"));
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return CommandPermissions;
}(guildComponent_js_1.GuildComponent));
exports.CommandPermissions = CommandPermissions;
