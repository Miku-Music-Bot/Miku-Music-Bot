"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
chai.should();
var fs = require("fs");
var path = require("path");
var dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, '..', 'test.env') });
var testLocation = path.join(__dirname, 'test');
before(function () {
    try {
        fs.mkdirSync(testLocation);
    }
    catch (error) {
        console.log("Error while creating test directory, error:\n".concat(error, "\nMaybe it already exists. Continuing..."));
    }
});
var failed = false;
afterEach(function () {
    if (this.currentTest.state === 'failed') {
        failed = true;
    }
});
after(function () {
    try {
        if (!failed) {
            fs.rmSync(testLocation, { recursive: true, force: true });
        }
    }
    catch (error) {
        console.log("Failed to remove test directory, error:\n".concat(error, "\nIf you don't remove the directory at \"").concat(testLocation, "\", future tests may fail"));
    }
});
// create logger
var logger_js_1 = require("../guildHandler/logger.js");
var logger = (0, logger_js_1.newLogger)(testLocation);
describe('Write logs in JSON format', function () {
    var logLocation;
    it('should create file with correct format in folder', function () {
        var files = fs.readdirSync(testLocation);
        // find file with correct format
        var found = false;
        for (var i = 0; i < files.length; i++) {
            if (files[i].match(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]).log/)) {
                found = true;
                logLocation = path.join(testLocation, files[i]);
            }
        }
        found.should.equal(true);
    });
    it('should write debug logs to file', function () {
        var message = 'This is some debug';
        logger.debug(message);
        var log = fs.readFileSync(logLocation, 'utf-8');
        var logs = log.split('\n');
        var info = JSON.parse(logs[0]);
        info.level.should.equal('debug');
        info.message.should.equal(message);
        info.timestamp.should.be.a('string');
    });
    it('should write info logs to file', function () {
        var message = 'This is some info';
        logger.info(message);
        var log = fs.readFileSync(logLocation, 'utf-8');
        var logs = log.split('\n');
        var info = JSON.parse(logs[1]);
        info.level.should.equal('info');
        info.message.should.equal(message);
        info.timestamp.should.be.a('string');
    });
    it('should write warning logs to file', function () {
        var message = 'This is some warning';
        logger.warn(message);
        var log = fs.readFileSync(logLocation, 'utf-8');
        var logs = log.split('\n');
        var warning = JSON.parse(logs[2]);
        warning.level.should.equal('warn');
        warning.message.should.equal(message);
        warning.timestamp.should.be.a('string');
    });
    it('should write error logs to file', function () {
        var message = 'This is some error';
        logger.error(message);
        var log = fs.readFileSync(logLocation, 'utf-8');
        var logs = log.split('\n');
        var error = JSON.parse(logs[3]);
        error.level.should.equal('error');
        error.message.should.equal(message);
        error.timestamp.should.be.a('string');
    });
});
