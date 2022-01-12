require('chai').should();
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, 'test.env') });

const testLocation = path.join(__dirname, 'test');

before(function () {
	try {
		fs.mkdirSync(testLocation);
	} catch (error) {
		console.log(`Error while creating test directory, error:\n${error}\nMaybe it already exists. Continuing...`);
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
	} catch (error) {
		console.log(`Failed to remove test directory, error:\n${error}\nIf you don't remove the directory at "${testLocation}", future tests may fail`);
	}
});

// create logger
const logger = require('../guildHandler/logger.js')(testLocation);

describe('Write logs in JSON format', function () {
	let logLocation;

	it('should create file with correct format in folder', function () {
		const files = fs.readdirSync(testLocation);

		// find file with correct format
		let found = false;
		for (let i = 0; i < files.length; i++) {
			if (files[i].match(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]).log/)) {
				found = true;
				logLocation = path.join(testLocation, files[i]);
			}
		}

		found.should.equal(true);
	});

	it('should write debug logs to file', function () {
		const message = 'This is some debug';
		logger.debug(message);

		const log = fs.readFileSync(logLocation, 'utf-8');
		const logs = log.split('\n');

		const info = JSON.parse(logs[0]);
		info.level.should.equal('debug');
		info.message.should.equal(message);
		info.timestamp.should.be.a('string');
	});

	it('should write info logs to file', function () {
		const message = 'This is some info';
		logger.info(message);

		const log = fs.readFileSync(logLocation, 'utf-8');
		const logs = log.split('\n');

		const info = JSON.parse(logs[1]);
		info.level.should.equal('info');
		info.message.should.equal(message);
		info.timestamp.should.be.a('string');
	});

	it('should write warning logs to file', function () {
		const message = 'This is some warning';
		logger.warn(message);

		const log = fs.readFileSync(logLocation, 'utf-8');
		const logs = log.split('\n');

		const warning = JSON.parse(logs[2]);
		warning.level.should.equal('warn');
		warning.message.should.equal(message);
		warning.timestamp.should.be.a('string');
	});

	it('should write error logs to file', function () {
		const message = 'This is some error';
		logger.error(message);

		const log = fs.readFileSync(logLocation, 'utf-8');
		const logs = log.split('\n');

		const error = JSON.parse(logs[3]);
		error.level.should.equal('error');
		error.message.should.equal(message);
		error.timestamp.should.be.a('string');
	});

	it('should write fatal logs to file', function () {
		const message = 'This is some fatal error';
		logger.fatal(message);

		const log = fs.readFileSync(logLocation, 'utf-8');
		const logs = log.split('\n');

		const fatal = JSON.parse(logs[4]);
		fatal.level.should.equal('fatal');
		fatal.message.should.equal(message);
		fatal.timestamp.should.be.a('string');
	});
});