import { should } from 'chai';
should();

import EventEmitter from 'events';

import SourceManager from './SourceManager';
import { SOURCE_DATA_DEFAULT } from './sourceConfig';
import { newStub } from '../../../GuildHandlerStub.test';
import Playlist from './Playlist';
import GuildSettings from '../Settings/GuildSettings';

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
					title: 'gdPlaylist1',
					events: new EventEmitter(),
					export: () => { return { title: 'gdPlaylist1' }; }
				},
				{
					title: 'gdPlaylist2',
					events: new EventEmitter(),
					export: () => { return { title: 'gdPlaylist2' }; }
				}
			],
			ytPlaylists: [
				{
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
					title: 'gdPlaylist1',
					events: new EventEmitter(),
					export: () => { return { title: 'gdPlaylist1' }; }
				}
			],
			ytPlaylists: [
				{
					id: 1,
					title: 'ytPlaylist1',
					events: new EventEmitter(),
					export: () => { return { title: 'ytPlaylist1' }; }
				}
			]
		} as any);

		let newSettingsEmitted = 0;
		srcMng.events.on('newSettings', () => {
			newSettingsEmitted++;
			if (newSettingsEmitted >= 3) { done(); }
		});

		const settings = {
			id: 3,
			title: 'gdPlaylist2',
			events: new EventEmitter(),
			getAllSongs: () => { return [{ id: 1, title: 'song1' }, { title: 'song2' }]; },
			export: () => { return { title: 'gdPlaylist2' }; }
		} as Playlist;
		srcMng.addPlaylist(settings, 'gd').should.be.true;
		settings.events.emit('newSettings');

		srcMng.addPlaylist({
			id: 1000000000,
			title: 'ytPlaylist2',
			events: new EventEmitter(),
			getAllSongs: () => { return []; },
			export: () => { return { title: 'ytPlaylist2' }; }
		} as Playlist, 'yt').should.be.true;

		const exported = srcMng.export();

		exported.gdPlaylists[0].title.should.equal('gdPlaylist2');
		exported.gdPlaylists[1].title.should.equal('gdPlaylist1');
		exported.ytPlaylists[0].title.should.equal('ytPlaylist1');
		exported.ytPlaylists[1].title.should.equal('ytPlaylist2');

		srcMng.resolveRef({ type: undefined, playlist: -1, id: -1 }).length.should.equal(2);
		srcMng.resolveRef({ type: 'gd', playlist: 3, id: 1 })[0].title.should.equal('song1');
		srcMng.resolveRef({ type: 'gd', playlist: 3, id: -1 })[0].title.should.equal('song1');
		srcMng.resolveRef({ type: 'gd', playlist: 3, id: -1 })[1].title.should.equal('song2');
		srcMng.resolveRef({ type: 'gd', playlist: 3, id: 10 }).length.should.equal(0);
		srcMng.resolveRef({ type: 'yt', playlist: 2, id: 10 }).length.should.equal(0);
	});

	it('Should remove playlist and emit event', (done) => {
		const srcMng = new SourceManager(guildHandlerStub, {
			gdPlaylists: [
				{
					id: 2,
					title: 'gdPlaylist1',
					events: new EventEmitter(),
					export: () => { return { title: 'gdPlaylist1' }; }
				}
			],
			ytPlaylists: [
				{
					id: 1,
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

		const exported = srcMng.export();

		exported.gdPlaylists.length.should.equal(0);
		exported.ytPlaylists.length.should.equal(0);
	});
});