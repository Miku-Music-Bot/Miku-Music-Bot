import { should } from 'chai';
should();

import EventEmitter from 'events';

import SourceManager from './SourceManager';
import { SOURCE_DATA_DEFAULT } from './sourceConfig';
import { newStub } from '../../../GuildHandlerStub.test';
import Playlist from './Playlist';
import GuildSettings from '../Settings/GuildSettings';
import sinon from 'sinon';

describe('SourceManager Initialization', () => {
	it('Should initialize using defaults if nothing given and emit events', (done) => {
		const guildHandlerStub = newStub();
		guildHandlerStub.data.guildSettings = {
			playlistIdCount: 10
		} as GuildSettings;

		const srcMng = new SourceManager(guildHandlerStub);
		srcMng.events.on('newSettings', () => { done(); });

		const exported = srcMng.export();

		exported.gdPlaylists[0].title.should.equal(SOURCE_DATA_DEFAULT.gdPlaylists[0].title);
		exported.ytPlaylists[0].title.should.equal(SOURCE_DATA_DEFAULT.ytPlaylists[0].title);
	});

	it('Should initialize using given properties', () => {
		const guildHandlerStub = newStub();
		guildHandlerStub.data.guildSettings = {
			playlistIdCount: 10
		} as GuildSettings;

		const srcMng = new SourceManager(guildHandlerStub, {
			gdPlaylists: [
				{
					type: 'gd',
					title: 'gdPlaylist1',
					events: new EventEmitter(),
					export: () => { return { title: 'gdPlaylist1' }; }
				},
				{
					type: 'gd',
					title: 'gdPlaylist2',
					events: new EventEmitter(),
					export: () => { return { title: 'gdPlaylist2' }; }
				}
			],
			ytPlaylists: [
				{
					type: 'yt',
					title: 'ytPlaylist1',
					events: new EventEmitter(),
					export: () => { return { title: 'ytPlaylist1' }; }
				}
			]
		} as any);

		const exported = srcMng.export();

		exported.gdPlaylists[0].title.should.equal('gdPlaylist1');
		exported.gdPlaylists[1].title.should.equal('gdPlaylist2');
		exported.ytPlaylists[0].title.should.equal('ytPlaylist1');
	});
});

describe('Manipulating playlists in source manager', () => {
	const guildHandlerStub = newStub();
	guildHandlerStub.data.guildSettings = {
		playlistIdCount: 10
	} as GuildSettings;

	it('Should add new playlist and emit event', (done) => {
		const srcMng = new SourceManager(guildHandlerStub, {
			gdPlaylists: [
				{
					id: 0,
					type: 'gd',
					title: 'gdPlaylist1',
					events: new EventEmitter(),
					export: () => { return { title: 'gdPlaylist1' }; }
				}
			],
			ytPlaylists: [
				{
					id: 1,
					type: 'yt',
					title: 'ytPlaylist1',
					events: new EventEmitter(),
					export: () => { return { title: 'ytPlaylist1' }; }
				}
			]
		} as any);

		let newSettingsEmitted = 0;
		srcMng.events.on('newSettings', () => {
			newSettingsEmitted++;
			if (newSettingsEmitted >= 3) {
				srcMng.resolveRef({ type: 'undefined', playlist: -1, id: -1 } as any).length.should.equal(3);
				srcMng.resolveRef({ type: 'gd', playlist: 3, id: 1 })[0].title.should.equal('song1');
				srcMng.resolveRef({ type: 'gd', playlist: 3, id: -1 })[0].title.should.equal('song1');
				srcMng.resolveRef({ type: 'gd', playlist: 3, id: -1 })[1].title.should.equal('song2');
				srcMng.resolveRef({ type: 'gd', playlist: 3, id: 11 }).length.should.equal(0);
				srcMng.resolveRef({ type: 'yt', playlist: 2, id: 11 }).length.should.equal(0);
				srcMng.resolveRef({ type: 'yt', playlist: 20, id: -1 })[0].title.should.equal('song3');
				done();
			}
		});

		srcMng.addPlaylist({ type: 'unknown' } as any).should.be.false;

		const settings = {
			id: 3,
			type: 'gd',
			title: 'gdPlaylist2',
			events: new EventEmitter(),
			getSong: (i: number) => {
				if (i === 1) { return { title: 'song1' }; }
				else return undefined;
			},
			getAllSongs: () => { return [{ id: 1, title: 'song1' }, { id: 4, title: 'song2' }]; },
			export: () => { return { title: 'gdPlaylist2' }; }
		} as Playlist;
		srcMng.addPlaylist(settings).should.be.true;
		settings.events.emit('newSettings');

		srcMng.addPlaylist({
			id: 20,
			type: 'yt',
			title: 'ytPlaylist2',
			events: new EventEmitter(),
			getSong: (i: number) => {
				if (i === 3) { return { title: 'song3' }; }
				else return undefined;
			},
			getAllSongs: () => { return [{ title: 'song3' }]; },
			export: () => { return { title: 'ytPlaylist2' }; }
		} as Playlist).should.be.true;

		const exported = srcMng.export();

		exported.gdPlaylists[0].title.should.equal('gdPlaylist2');
		exported.gdPlaylists[1].title.should.equal('gdPlaylist1');
		exported.ytPlaylists[0].title.should.equal('ytPlaylist1');
		exported.ytPlaylists[1].title.should.equal('ytPlaylist2');
	});

	it('Should remove playlist and emit event', (done) => {
		const srcMng = new SourceManager(guildHandlerStub, {
			gdPlaylists: [
				{
					id: 2,
					type: 'gd',
					title: 'gdPlaylist1',
					events: new EventEmitter(),
					export: () => { return { title: 'gdPlaylist1' }; }
				}
			],
			ytPlaylists: [
				{
					id: 1,
					type: 'yt',
					title: 'ytPlaylist1',
					events: new EventEmitter(),
					export: () => { return { title: 'ytPlaylist1' }; }
				}
			]
		} as any);

		let newSettingsEmitted = 0;
		srcMng.events.on('newSettings', () => {
			newSettingsEmitted++;
			if (newSettingsEmitted >= 2) { done(); }
		});

		srcMng.removePlaylist(2).should.be.true;
		srcMng.removePlaylist(1).should.be.true;
		srcMng.removePlaylist(1).should.be.false;

		const exported = srcMng.export();

		exported.gdPlaylists.length.should.equal(0);
		exported.ytPlaylists.length.should.equal(0);
	});
});

describe('Source Manager Refresh Playlist', () => {
	const guildHandlerStub = newStub();
	guildHandlerStub.data.guildSettings = {
		playlistIdCount: 10
	} as GuildSettings;
	const ee = new EventEmitter();
	sinon.stub(guildHandlerStub, 'bot').value(ee);

	let gdPlaylistRefreshed = 0;
	let ytPlaylistRefreshed = 0;
	const srcMng = new SourceManager(guildHandlerStub, {
		gdPlaylists: [],
		ytPlaylists: []
	} as any);

	srcMng.addPlaylist({
		id: 0,
		type: 'gd',
		events: new EventEmitter(),
		fetchData: (): Promise<void> => {
			gdPlaylistRefreshed++;
			return new Promise((resolve) => { resolve(); });
		}
	} as Playlist);
	srcMng.addPlaylist({
		id: 1,
		type: 'yt',
		events: new EventEmitter(),
		fetchData: (): Promise<void> => {
			ytPlaylistRefreshed++;
			return new Promise((resolve) => { resolve(); });
		}
	} as Playlist);

	it('Should refresh all the playlists at the correct frequency ', (done) => {
		ee.emit('ready');
		setTimeout(() => {
			gdPlaylistRefreshed.should.equal(2);
			ytPlaylistRefreshed.should.equal(2);
			done();
		}, guildHandlerStub.config.REFRESH_PLAYLIST_INTERVAL * 1.5);
	});

	it('Should not refresh if currently playing a song', (done) => {
		const gdRefreshStart = gdPlaylistRefreshed;
		const ytRefreshStart = ytPlaylistRefreshed;
		sinon.stub(guildHandlerStub.vcPlayer, 'playing').value(true);

		setTimeout(() => {
			gdPlaylistRefreshed.should.equal(gdRefreshStart);
			ytPlaylistRefreshed.should.equal(ytRefreshStart);
			sinon.stub(srcMng, <any>'_refreshAll').callsFake(() => { return; });
			done();
		}, guildHandlerStub.config.REFRESH_PLAYLIST_INTERVAL * 3);
	});
});

describe('Search Source Manager', () => {
	it('Should return songs sorted by match score', () => {
		const guildHandlerStub = newStub();
		const srcMng = new SourceManager(guildHandlerStub);

		srcMng.addPlaylist({
			id: 0,
			type: 'gd',
			events: new EventEmitter(),
			search: () => {
				return [
					{ song: { title: 'song1' }, score: 10 },
					{ song: { title: 'song2' }, score: 2 },
					{ song: { title: 'song3' }, score: 1 }
				];
			}
		} as any);
		srcMng.addPlaylist({
			id: 0,
			type: 'yt',
			events: new EventEmitter(),
			search: () => {
				return [
					{ song: { title: 'song4' }, score: 20 },
					{ song: { title: 'song5' }, score: 3 },
					{ song: { title: 'song6' }, score: 12 }
				];
			}
		} as any);

		const results = srcMng.searchSaved('testString');
		results.gd[0].title.should.equal('song1');
		results.gd[1].title.should.equal('song2');
		results.gd[2].title.should.equal('song3');
		results.yt[0].title.should.equal('song4');
		results.yt[1].title.should.equal('song6');
		results.yt[2].title.should.equal('song5');
	});
});