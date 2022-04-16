import { should } from 'chai';
should();

import Discord from 'discord.js';

import PermissionSettings from './PermissionSettings';
import { PERMISSIONS_DEFAULT } from './config/permissionConfig';

describe('PermissionSettings Initialization', () => {
	it('Should initialize using defaults if nothing given and emit events', () => {
		const guildStub = {
			roles: {
				cache: {
					filter: () => {
						return { first: () => { return { id: 'testRole' }; } };
					}
				}
			}
		} as unknown as Discord.Guild;

		const permSet = new PermissionSettings();
		permSet.resetPermissions(guildStub);

		for (let i = 0; i < PERMISSIONS_DEFAULT.everyone.length; i++) {
			permSet.getFor(PERMISSIONS_DEFAULT.everyone[i]).indexOf('testRole').should.not.equal(-1);
		}
	});

	it('Should initialize using given properties', () => {
		const permSet = new PermissionSettings({
			'join': ['testRole1'],
			'play': [],
			'stop': ['testRole2'],
			'pause': ['testRole3'],
		});

		permSet.getFor('join')[0].should.equal('testRole1');
		permSet.getFor('play').length.should.equal(0);
		permSet.getFor('stop')[0].should.equal('testRole2');
		permSet.getFor('pause')[0].should.equal('testRole3');
	});
});

describe('Setting new permission settings', () => {
	it('Should add new permission settings and emit events', (done) => {
		const permSet = new PermissionSettings({
			'join': [],
			'play': [],
			'stop': [],
			'pause': [],
		});

		let newSettingsEmitted = 0;
		permSet.events.on('newSettings', () => {
			newSettingsEmitted++;
			if (newSettingsEmitted >= 3) { done(); }
		});

		permSet.addPermission('join', 'testRole1');
		permSet.getFor('join')[0].should.equal('testRole1');
		permSet.addPermission('play', 'testRole1');
		permSet.getFor('play')[0].should.equal('testRole1');
		permSet.addPermission('stop', 'testRole1');
		permSet.getFor('stop')[0].should.equal('testRole1');
		permSet.getFor('pause').length.should.equal('testRole1');
	});

	it('Should add new permission settings and emit events', (done) => {
		const permSet = new PermissionSettings({
			'join': ['testRole1'],
			'play': [],
			'stop': ['testRole2']
		});

		permSet.events.on('newSettings', () => {
			done();
		});

		permSet.removePermission('join', 'testRole1').should.be.true;
		permSet.getFor('join').length.should.equal(0);

		permSet.removePermission('play', 'testRole1').should.be.false;
		permSet.getFor('play').length.should.equal(0);

		permSet.removePermission('stop', 'testRole1').should.be.false;
		permSet.getFor('stop')[0].should.equal('testRole2');
	});
});

describe('Export permission settings', () => {
	it('Should export permission settings in the correct database format', () => {
		const permSet = new PermissionSettings({
			'join': ['testRole1'],
			'play': [],
			'stop': ['testRole2'],
			'pause': ['testRole3'],
		});

		const exported = permSet.export();

		exported['join'][0].should.equal('testRole1');
		exported['play'].length.should.equal(0);
		exported['stop'][0].should.equal('testRole2');
		exported['pause'][0].should.equal('testRole3');
	});
});