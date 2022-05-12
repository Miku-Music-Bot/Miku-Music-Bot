import { should } from 'chai';
should();
import sinon from 'sinon';
import winston from 'winston';

import { newStub } from '../../../../GuildHandlerStub.test';
import { PlaylistConfig, SongConfig } from '../sourceConfig';
import YTPlaylist from './YTPlaylist';
import YTSong from './YTSong';

describe('Youtube Song Class', () => {
	it('should validate youtube video urls', async () => {
		// not urls
		(await YTSong.checkUrl('notaurl', { error: () => { return; } } as unknown as winston.Logger)).should.be.false;
		(await YTSong.checkUrl('https://youtu.be/almostaurl', { error: () => { return; } } as unknown as winston.Logger)).should.be.false;
		// regular youtube video url
		(await YTSong.checkUrl('https://youtu.be/NEkk7cwyUQw', { error: () => { return; } } as unknown as winston.Logger)).should.be.true;
	});
});

describe('Youtube Song Initialization', () => {
	it('should initialize using defaults if only partial data is given', () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				songIdCount: 1000
			}
		});

		const partialData = {
			url: 'https://youtu.be/NEkk7cwyUQw',
		};
		const testSong = new YTSong(guildHandlerStub, partialData);

		// should increment songIdCount
		guildHandlerStub.data.guildSettings.songIdCount.should.equal(1001);

		// data should be valid
		testSong.url.should.equal(partialData.url);
		testSong.id.should.equal(1000);
		testSong.title.should.equal('No Title');
		testSong.type.should.equal('yt');
		(typeof testSong.duration).should.equal('undefined');
		// song is live so durationString should be live
		testSong.durationString.should.equal('Live');
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
			type: 'yt',
			title: 'testSong',
			url: 'https://youtu.be/NEkk7cwyUQw',
			duration: 100,
			thumbnailURL: 'https://place.url/somewhere',
			artist: 'testArtist',
			live: false,
			reqBy: '123456',
		};
		const testSong = new YTSong(guildHandlerStub, fullData);

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

describe('Fetch Youtube Song Data', () => {
	it('should fetch correct song data', (done) => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				songIdCount: 1000
			}
		});

		// only give url
		let checked = false;
		const testSong = new YTSong(guildHandlerStub, { url: 'https://youtu.be/NEkk7cwyUQw', });

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

describe('Youtube Song Data Export', () => {
	it('should export youtube data correctly', () => {
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
			url: 'https://youtu.be/NEkk7cwyUQw',
			duration: 100,
			thumbnailURL: 'https://place.url/somewhere',
			artist: 'testArtist',
			live: false,
			reqBy: '123456',
		};
		const testSong = new YTSong(guildHandlerStub, fullData);

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



describe('Youtube Playlist Class', () => {
	it('should validate youtube playlists urls', async () => {
		// non urls
		(await YTPlaylist.checkUrl('notaurl', { error: () => { return; } } as unknown as winston.Logger)).should.be.false;
		(await YTPlaylist.checkUrl('https://youtu.be/almostaurl', { error: () => { return; } } as unknown as winston.Logger)).should.be.false;
		// just playlist url
		(await YTPlaylist.checkUrl('https://www.youtube.com/playlist?list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh', { error: () => { return; } } as unknown as winston.Logger)).should.be.true;
		// song from playlist url
		(await YTSong.checkUrl('https://www.youtube.com/watch?v=AAwJ0_uqhb4&list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh', { error: () => { return; } } as unknown as winston.Logger)).should.be.true;
	});
});

describe('Youtube Playlist Initialization', () => {
	it('should initialize using defaults if only partial data is given', () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				playlistIdCount: 1000
			}
		});

		const partialData: PlaylistConfig = {
			url: 'https://www.youtube.com/playlist?list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh',
		};
		const testPlaylist = new YTPlaylist(guildHandlerStub, partialData);

		// data should be valid
		guildHandlerStub.data.guildSettings.playlistIdCount.should.equal(1001);		// should increment playlistIdCount
		testPlaylist.url.should.equal(partialData.url);
		testPlaylist.id.should.equal(1000);
		testPlaylist.title.should.equal('No Name');
		testPlaylist.type.should.equal('yt');
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
			type: 'yt',
			title: 'testPlaylist',
			url: 'https://www.youtube.com/playlist?list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh',
			songs: [
				{
					id: 1,
					title: 'testSong',
					url: 'songThing'
				}
			]
		};
		const testPlaylist = new YTPlaylist(guildHandlerStub, fullData);

		// data should be valid
		testPlaylist.id.should.equal(fullData.id);		// id should not change if given
		testPlaylist.type.should.equal(fullData.type);
		testPlaylist.title.should.equal(fullData.title);
		testPlaylist.url.should.equal(fullData.url);
		testPlaylist.getAllSongs().length.should.equal(1);
	});
});

describe('Fetch Youtube Playlist Data', () => {
	it('should fetch correct song data', (done) => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				playlistIdCount: 1000
			}
		});

		// only give url
		let checked = false;
		const testPlaylist = new YTPlaylist(guildHandlerStub, { url: 'https://www.youtube.com/playlist?list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh' });

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
			type: 'yt',
			title: 'testPlaylist',
			url: 'https://www.youtube.com/playlist?list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh',
			songs: [
				{
					id: 1,
					title: 'testSong',
					url: 'songThing'
				}
			]
		};
		const testPlaylist = new YTPlaylist(guildHandlerStub, fullData);

		setTimeout(() => {
			// song's newSettings events should be handled
			testPlaylist.events.once('newSettings', () => { done(); });
			testPlaylist.getSong(1).events.emit('newSettings', testPlaylist.getSong(1));
		}, 1000);
	});
});

describe('Youtube Playlist Search', () => {
	it('should accurately search for songs', () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				playlistIdCount: 1000
			}
		});

		const fullData: PlaylistConfig = {
			id: 1,
			type: 'yt',
			title: 'testPlaylist',
			url: 'https://www.youtube.com/playlist?list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh',
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
		const testPlaylist = new YTPlaylist(guildHandlerStub, fullData);

		// exact search using song id
		(typeof testPlaylist.getSong(0)).should.equal('undefined');
		testPlaylist.getSong(1).id.should.equal(1);
		testPlaylist.getSong(2).id.should.equal(2);

		// fuzzy searching
		testPlaylist.search('TESTSONG')[0].song.title.should.equal('testSong');
	});
});

describe('Youtube Playlist Data Export', () => {
	it('should export youtube playlist data correctly', () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'data').value({
			guildSettings: {
				playlistIdCount: 1000
			}
		});

		const fullData: PlaylistConfig = {
			id: 1,
			type: 'yt',
			title: 'testPlaylist',
			url: 'https://www.youtube.com/playlist?list=PLzI2HALtu4JLaGXbUiAH_RQtkaALHgRoh',
			songs: [
				{
					id: 1,
					title: 'testSong',
					url: 'songThing'
				}
			]
		};
		const testPlaylist = new YTPlaylist(guildHandlerStub, fullData);

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