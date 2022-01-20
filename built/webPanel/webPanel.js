"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWebServer = void 0;
var path = require("path");
var express = require("express");
var PORT = process.env.PORT || 8080;
/**
 * webPanel.js
 *
 * Handles webserver for bot
 * @param {object} botMaster - bot master object
 * @return {Promise<Void>} - resolves once web server is ready
 */
function startWebServer(botMaster) {
    botMaster; // delete this later plz <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    var app = express();
    app.use(express.static(path.join(__dirname, 'public')));
    app.get('/', function (req, res) {
        res.send('Hello World!');
    });
    return new Promise(function (resolve, reject) {
        try {
            app.listen(PORT, function () {
                console.log("Webserver listening on port ".concat(PORT));
                resolve();
            });
        }
        catch (error) {
            console.log(error);
            reject();
        }
    });
}
exports.startWebServer = startWebServer;
