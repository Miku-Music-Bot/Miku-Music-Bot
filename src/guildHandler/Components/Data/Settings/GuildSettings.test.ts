import { should } from 'chai';
should();

import GuildSettings from './GuildSettings';
import { GUILD_DEFAULT } from './config/guildConfig';

describe('GuildSettings Initialization', () => {
	it('Should initialize using defaults if nothing given and emit events', (done) => {
		const guildSet = new GuildSettings();
		guildSet.events.on('newSettings', () => { done(); });

		if (GUILD_DEFAULT.configured) { guildSet.configured.should.be.true; }
		else { guildSet.configured.should.be.false; }
		(typeof guildSet.channelId).should.equal('undefined');
		guildSet.prefix.should.equal(GUILD_DEFAULT.prefix);
		if (GUILD_DEFAULT.autoplay) { guildSet.autoplay.should.be.true; }
		else { guildSet.autoplay.should.be.false; }
		if (GUILD_DEFAULT.shuffle) { guildSet.shuffle.should.be.true; }
		else { guildSet.shuffle.should.be.false; }
		guildSet.autoplayList.length.should.equal(0);
		guildSet.songIdCount.should.equal(GUILD_DEFAULT.songIdCount);
		guildSet.playlistIdCount.should.equal(GUILD_DEFAULT.playlistIdCount);
	});

	it('Should initialize using given properties', () => {
		const guildSet = new GuildSettings({
			configured: true,
			channelId: 'testId',
			prefix: '!test',
			autoplay: true,
			shuffle: false,
			autoplayList: [{ id: 1, playlist: 1, type: 'gd' }],
			songIdCount: 10,
			playlistIdCount: 10
		});

		guildSet.configured.should.be.true;
		guildSet.channelId.should.equal('testId');
		guildSet.prefix.should.equal('!test');
		guildSet.autoplay.should.be.true;
		guildSet.shuffle.should.be.false;

		guildSet.autoplayList.length.should.equal(1);
		guildSet.autoplayList[0].id.should.equal(1);
		guildSet.autoplayList[0].playlist.should.equal(1);
		guildSet.autoplayList[0].type.should.equal('gd');

		guildSet.songIdCount.should.equal(10);
		guildSet.playlistIdCount.should.equal(10);
	});

	it('Should initialize using given properties and fill in missing properties with default', () => {
		const guildSet = new GuildSettings({
			configured: true,
			prefix: '!test',
			autoplay: true,
			shuffle: false,
		} as any);

		guildSet.configured.should.be.true;
		(typeof guildSet.channelId).should.equal('undefined');
		guildSet.prefix.should.equal('!test');
		guildSet.autoplay.should.be.true;
		guildSet.shuffle.should.be.false;
		guildSet.autoplayList.length.should.equal(0);
		guildSet.songIdCount.should.equal(GUILD_DEFAULT.songIdCount);
		guildSet.playlistIdCount.should.equal(GUILD_DEFAULT.playlistIdCount);
	});
});

describe('Setting new guild settings', () => {
	it('Should apply new guild settings and emit events', (done) => {
		const guildSet = new GuildSettings();

		let newSetEmitted = 0;
		guildSet.events.on('newSettings', () => {
			newSetEmitted++;
			if (newSetEmitted >= 8) { done(); }
		});

		guildSet.configured = true;
		guildSet.channelId = 'testId';
		guildSet.prefix = '!test';
		guildSet.autoplay = true;
		guildSet.shuffle = false;
		guildSet.autoplayList.push({ id: 1, playlist: 1, type: 'gd' });
		guildSet.songIdCount = 10;
		guildSet.playlistIdCount = 10;

		guildSet.configured.should.be.true;
		guildSet.channelId.should.equal('testId');
		guildSet.prefix.should.equal('!test');
		guildSet.autoplay.should.be.true;
		guildSet.shuffle.should.be.false;

		guildSet.autoplayList.length.should.equal(1);
		guildSet.autoplayList[0].id.should.equal(1);
		guildSet.autoplayList[0].playlist.should.equal(1);
		guildSet.autoplayList[0].type.should.equal('gd');

		guildSet.songIdCount.should.equal(10);
		guildSet.playlistIdCount.should.equal(10);
	});
});

describe('Export guild settings', () => {
	it('Should export guild settings in the correct database format', () => {
		const guildSet = new GuildSettings();

		const exported = guildSet.export();

		if (GUILD_DEFAULT.configured) { exported.configured.should.be.true; }
		else { exported.configured.should.be.false; }
		(typeof exported.channelId).should.equal('undefined');
		exported.prefix.should.equal(GUILD_DEFAULT.prefix);
		if (GUILD_DEFAULT.autoplay) { exported.autoplay.should.be.true; }
		else { exported.autoplay.should.be.false; }
		if (GUILD_DEFAULT.shuffle) { exported.shuffle.should.be.true; }
		else { exported.shuffle.should.be.false; }
		exported.autoplayList.length.should.equal(0);
		exported.songIdCount.should.equal(GUILD_DEFAULT.songIdCount);
		exported.playlistIdCount.should.equal(GUILD_DEFAULT.playlistIdCount);
	});
});