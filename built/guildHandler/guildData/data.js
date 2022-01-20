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
exports.GuildData = void 0;
var mongoDb = require("mongodb");
var guildComponent_js_1 = require("../guildComponent.js");
var MONGODB_URI = process.env.MONGODB_URI; // mongodb connection uri
var MONGODB_DBNAME = process.env.MONGODB_DBNAME; // name of bot database
var GUILDDATA_COLLECTION_NAME = process.env.GUILDDATA_COLLECTION_NAME || 'Guilds'; // name of collection for guild data
/**
 * GuildData
 *
 * Abstracts away database connection
 * Handles getting and setting guild settings
 */
var GuildData = /** @class */ (function (_super) {
    __extends(GuildData, _super);
    /**
     * @param {GuildHandler} guildHandler - guild handler for guild this guildData object is responsible for
     * @param {string} id - discord guild id
     * @param {CallableFunction} cb - callback for when done getting data
     */
    function GuildData(guildHandler, id, cb) {
        var _this = _super.call(this, guildHandler) || this;
        _this.guildId = id;
        _this.initData(1000, cb);
        return _this;
    }
    /**
     * initData()
     *
     * Initiallizes GuildData
     * connects to database and tries to get data
     * if no data exits, creates default values and saves it
     * if an error occurs, it retries after 10 seconds
     * calls callback once done
     * @param {number} wait - amount of time to wait before retrying in case of an error
     * @param {CallableFunction} cb - callback for when done getting data
     */
    GuildData.prototype.initData = function (wait, cb) {
        return __awaiter(this, void 0, void 0, function () {
            var dbClient, db, foundGuild, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!wait) {
                            wait = 1000;
                        }
                        if (wait > 60000) {
                            wait = 60000;
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        this.debug('Connecting to mongodb database');
                        dbClient = new mongoDb.MongoClient(MONGODB_URI);
                        return [4 /*yield*/, dbClient.connect()];
                    case 2:
                        _a.sent();
                        db = dbClient.db(MONGODB_DBNAME);
                        this.collection = db.collection(GUILDDATA_COLLECTION_NAME);
                        // grab guild data from the database
                        this.debug('Requesting settings from database');
                        return [4 /*yield*/, this.collection.findOne({ guildId: this.guildId })];
                    case 3:
                        foundGuild = _a.sent();
                        if (!foundGuild) return [3 /*break*/, 4];
                        // if guild data exists in database, set variables based on it
                        this.configured = foundGuild.configured;
                        this.channelId = foundGuild.channelId;
                        this.prefix = foundGuild.prefix;
                        this.playlists = foundGuild.playlists;
                        this.permissions = foundGuild.permissions;
                        this.debug("Guild data retrieved. {data:".concat(JSON.stringify(this.getData(), null, 4), "}"));
                        return [3 /*break*/, 6];
                    case 4:
                        // if guild is not found in database, set defaults
                        this.info('No guild data found, using defaults');
                        this.configured = false;
                        this.channelId = undefined;
                        this.prefix = '!miku ';
                        this.playlists = [];
                        this.permissions = {};
                        return [4 /*yield*/, this.collection.insertOne(this.getData())];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        cb(); // call callback once done
                        return [3 /*break*/, 8];
                    case 7:
                        error_1 = _a.sent();
                        this.error("{error: ".concat(error_1, "} retrieving/saving data from database. Trying again in ").concat(wait, " seconds..."));
                        setTimeout(function () {
                            _this.initData(wait * 10, cb);
                        }, wait);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * saveData()
     *
     * Saves guildData to database
     */
    GuildData.prototype.saveData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        clearInterval(this.retrySave);
                        this.debug('Saving data!');
                        return [4 /*yield*/, this.collection.replaceOne({ guildId: this.guildId }, this.getData())];
                    case 1:
                        result = _a.sent();
                        // check if save was successful or not
                        if (result.modifiedCount === 1) {
                            this.debug('Data save successful');
                        }
                        else {
                            this.error('Data save failed, retrying in 1 min');
                            this.retrySave = setInterval(function () { return _this.saveData(); }, 60000);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * setConfigured()
     *
     * Sets configured status
     * @param {boolean} configured - configured or not
     */
    GuildData.prototype.setConfigured = function (configured) {
        this.debug("Guild data: configured set to ".concat(configured));
        this.configured = configured;
        this.saveData();
    };
    /**
     * setChannel()
     *
     * Sets the channel id of bot
     * @param {string} id - discord channel id string
     */
    GuildData.prototype.setChannel = function (id) {
        this.debug("Guild data: channelId set to ".concat(id));
        this.channelId = id;
        this.saveData();
    };
    /**
     * setPrefix()
     *
     * Sets the channel id of bot
     * @param {string} prefix - new prefix to use
     */
    GuildData.prototype.setPrefix = function (prefix) {
        this.debug("Guild data: prefix set to ".concat(prefix));
        this.prefix = prefix;
        this.saveData();
    };
    /**
     * setPermissions()
     *
     * Set the permissions of the bots
     * @param {object} permissions
     */
    GuildData.prototype.setPermissions = function (permissions) {
        this.debug("Guild data: permissions set to ".concat(JSON.stringify(permissions)));
        this.permissions = permissions;
        this.saveData();
    };
    /**
     * getData()
     *
     * @return {object} - object containing bot settings
     */
    GuildData.prototype.getData = function () {
        return {
            configured: this.configured,
            guildId: this.guildId,
            channelId: this.channelId,
            prefix: this.prefix,
            playlists: this.playlists,
            permissions: this.permissions,
        };
    };
    return GuildData;
}(guildComponent_js_1.GuildComponent));
exports.GuildData = GuildData;
