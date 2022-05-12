import { should } from 'chai';
should();
import sinon from 'sinon';
import winston from 'winston';

import { newStub } from '../../../../GuildHandlerStub.test';
import { PlaylistConfig, SongConfig } from '../sourceConfig';
import GDPlaylist from './GDPlaylist';
import GDSong from './GDSong';

describe('Google Drive Song Class', () => {
	it('should validate google drive video urls', async () => {
		// not urls
		(await GDSong.checkUrl('notaurl', { error: () => { return; } } as unknown as winston.Logger)).should.be.false;
		(await GDSong.checkUrl('https://youtu.be/almostaurl', { error: () => { return; } } as unknown as winston.Logger)).should.be.false;
		// regular google drive video url
		(await GDSong.checkUrl('https://youtu.be/NEkk7cwyUQw', { error: () => { return; } } as unknown as winston.Logger)).should.be.true;
	});
});

describe('Google Drive Song Initialization', () => {
	it('should initialize using defaults if only partial data is given', () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				songIdCount: 1000
			}
		});

		const partialData = {
			url: 'https://drive.google.com/notarealurl',
		};
		const testSong = new GDSong(guildHandlerStub, partialData);

		// should increment songIdCount
		guildHandlerStub.data.guildSettings.songIdCount.should.equal(1001);

		// data should be valid
		testSong.url.should.equal(partialData.url);
		testSong.id.should.equal(1000);
		testSong.title.should.equal('No Title');
		testSong.type.should.equal('gd');
		(typeof testSong.duration).should.equal('undefined');
		// song is live so durationString should be live
		testSong.durationString.should.equal('Unknown');
		testSong.thumbnailURL.should.equal(`${guildHandlerStub.config.BOT_DOMAIN}/thumbnails/defaultThumbnail.jpg`);
		testSong.artist.should.equal('unknown');
		testSong.live.should.be.true;
		testSong.reqBy.should.equal('');
	});

	it('should initialize using defaults if only partial data is given', async () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				songIdCount: 1000
			}
		});

		const fullData: SongConfig = {
			id: 1,
			type: 'gd',
			title: 'testSong',
			url: 'https://drive.google.com/notarealurl',
			duration: 100,
			thumbnailURL: 'https://place.url/somewhere',
			artist: 'testArtist',
			live: false,
			reqBy: '123456',
		};
		const testSong = new GDSong(guildHandlerStub, fullData);

		// should also allow editing of reqBy
		testSong.reqBy.should.equal(fullData.reqBy);
		testSong.reqBy = 'test';
		testSong.reqBy.should.equal('test');

		// data should be correct
		testSong.id.should.equal(fullData.id);		// id should not be changed if given
		testSong.type.should.equal(fullData.type);
		testSong.title.should.equal(fullData.title);
		testSong.url.should.equal(fullData.url);
		testSong.duration.should.equal(fullData.duration);
		testSong.durationString.should.equal('00:01:40');
		testSong.thumbnailURL.should.equal(fullData.thumbnailURL);
		testSong.artist.should.equal(fullData.artist);
		testSong.live.should.be.false;
	});
});

describe('Fetch Google Drive Song Data', () => {
	it('should fetch correct song data', (done) => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				songIdCount: 1000
			}
		});

		// only give url
		let checked = false;
		const testSong = new GDSong(guildHandlerStub, { url: 'https://drive.google.com/notarealurl', });

		// should emit newSettings event to trigger database save
		testSong.events.on('newSettings', () => {
			if (!checked) { checked = true; }
			else { done(); }
		});

		// once data has been fetched, it should be valid
		testSong.fetchData().then(() => {
			testSong.title.should.equal('Chopin - Ballade No. 2');
			testSong.duration.should.equal(427);
			testSong.thumbnailURL.indexOf('ytimg').should.not.equal(-1);
			testSong.artist.should.equal('Bento Box');
			testSong.live.should.be.false;

			if (!checked) { checked = true; }
			else { done(); }
		});
	});
});

describe('Google Drive Song Data Export', () => {
	it('should export Google Drive data correctly', () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				songIdCount: 1000
			}
		});

		const fullData: SongConfig = {
			id: 1,
			type: 'yt',
			title: 'testSong',
			url: 'https://drive.google.com/notarealurl',
			duration: 100,
			thumbnailURL: 'https://place.url/somewhere',
			artist: 'testArtist',
			live: false,
			reqBy: '123456',
		};
		const testSong = new GDSong(guildHandlerStub, fullData);

		const exported = testSong.export();

		// exported data should be correct
		exported.id.should.equal(fullData.id);
		exported.type.should.equal(fullData.type);
		exported.title.should.equal(fullData.title);
		exported.url.should.equal(fullData.url);
		exported.duration.should.equal(fullData.duration);
		exported.thumbnailURL.should.equal(fullData.thumbnailURL);
		exported.artist.should.equal(fullData.artist);
		exported.live.should.be.false;
		exported.reqBy.should.equal('');			// reqBy should be removed
	});
});



describe('Google Drive Playlist Class', () => {
	it('should validate google drive playlists urls', async () => {
		// non urls
		(await GDPlaylist.checkUrl('notaurl', { error: () => { return; } } as unknown as winston.Logger)).should.be.false;
		(await GDPlaylist.checkUrl('https://drive.google.com/notarealurl', { error: () => { return; } } as unknown as winston.Logger)).should.be.false;
		// just folder url
		(await GDPlaylist.checkUrl('https://drive.google.com/makethisreal', { error: () => { return; } } as unknown as winston.Logger)).should.be.true;
	});
});

describe('Google Drive Playlist Initialization', () => {
	it('should initialize using defaults if only partial data is given', () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				playlistIdCount: 1000
			}
		});

		const partialData: PlaylistConfig = {
			url: '',
		};
		const testPlaylist = new GDPlaylist(guildHandlerStub, partialData);

		// data should be valid
		guildHandlerStub.data.guildSettings.playlistIdCount.should.equal(1001);		// should increment playlistIdCount
		testPlaylist.url.should.equal(partialData.url);
		testPlaylist.id.should.equal(1000);
		testPlaylist.title.should.equal('No Name');
		testPlaylist.type.should.equal('gd');
		testPlaylist.getAllSongs().length.should.equal(0); 		// song list should be empty
	});

	it('should initialize using defaults if only partial data is given', () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				playlistIdCount: 1000
			}
		});

		const fullData: PlaylistConfig = {
			id: 1,
			type: 'gd',
			title: 'testPlaylist',
			url: '',
			songs: [
				{
					id: 1,
					title: 'testSong',
					url: 'songThing'
				}
			]
		};
		const testPlaylist = new GDPlaylist(guildHandlerStub, fullData);

		// data should be valid
		testPlaylist.id.should.equal(fullData.id);		// id should not change if given
		testPlaylist.type.should.equal(fullData.type);
		testPlaylist.title.should.equal(fullData.title);
		testPlaylist.url.should.equal(fullData.url);
		testPlaylist.getAllSongs().length.should.equal(1);
	});
});

describe('Fetch Google Drive Playlist Data', () => {
	it('should fetch correct song data', (done) => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				playlistIdCount: 1000
			}
		});

		// only give url
		let checked = false;
		const testPlaylist = new GDPlaylist(guildHandlerStub, { url: '' });

		// should emit newSettings event to trigger database save
		testPlaylist.events.once('newSettings', () => {
			if (!checked) { checked = true; }
			else { done(); }
		});

		// once data has been fetched, it should be valid
		testPlaylist.fetchData().then(() => {
			testPlaylist.title.should.equal('Hololive Songs');
			testPlaylist.getAllSongs().length.should.not.equal(0);

			if (!checked) { checked = true; }
			else { done(); }
		});
	});

	it('should also handle new data from songs and trigger database save', (done) => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				playlistIdCount: 1000
			}
		});

		const fullData: PlaylistConfig = {
			id: 1,
			type: 'gd',
			title: 'testPlaylist',
			url: '',
			songs: [
				{
					id: 1,
					title: 'testSong',
					url: 'songThing'
				}
			]
		};
		const testPlaylist = new GDPlaylist(guildHandlerStub, fullData);

		setTimeout(() => {
			// song's newSettings events should be handled
			testPlaylist.events.once('newSettings', () => { done(); });
			testPlaylist.getSong(1).events.emit('newSettings', testPlaylist.getSong(1));
		}, 1000);
	});
});

describe('Google Drive Playlist Search', () => {
	it('should accurately search for songs', () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				playlistIdCount: 1000
			}
		});

		const fullData: PlaylistConfig = {
			id: 1,
			type: 'gd',
			title: 'testPlaylist',
			url: '',
			songs: [
				{
					id: 1,
					title: 'testSong',
					url: 'songThing'
				},
				{
					id: 2,
					title: 'anotherSong',
					url: 'songUrl'
				}
			]
		};
		const testPlaylist = new GDPlaylist(guildHandlerStub, fullData);

		// exact search using song id
		(typeof testPlaylist.getSong(0)).should.equal('undefined');
		testPlaylist.getSong(1).id.should.equal(1);
		testPlaylist.getSong(2).id.should.equal(2);

		// fuzzy searching
		testPlaylist.search('TESTSONG')[0].song.title.should.equal('testSong');
	});
});

describe('Google Drive Playlist Data Export', () => {
	it('should export Google Drive playlist data correctly', () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				playlistIdCount: 1000
			}
		});

		const fullData: PlaylistConfig = {
			id: 1,
			type: 'gd',
			title: 'testPlaylist',
			url: '',
			songs: [
				{
					id: 1,
					title: 'testSong',
					url: 'songThing'
				}
			]
		};
		const testPlaylist = new GDPlaylist(guildHandlerStub, fullData);

		const exported = testPlaylist.export();

		// exported data should be correct
		exported.id.should.equal(fullData.id);
		exported.type.should.equal(fullData.type);
		exported.title.should.equal(fullData.title);
		exported.url.should.equal(fullData.url);
		exported.songs.length.should.equal(fullData.songs.length);
		exported.songs[0].title.should.equal(fullData.songs[0].title);
	});
});