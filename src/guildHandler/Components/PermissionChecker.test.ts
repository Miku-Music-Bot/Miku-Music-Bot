import { should } from 'chai';
should();
import sinon from 'sinon';

import PermissionChecker from './PermissionChecker';
import { newStub } from '../GuildHandlerStub.test';

describe('Permission Checker check message permissions', () => {
	it('Should allow messages with permissions', async () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'guild').value({
			members: {
				fetch: () => {
					return {
						roles: {
							cache: {
								get: () => {
									return { id: 'testRole2' };
								}
							}
						}
					};
				}
			}
		});
		sinon.stub(guildHandlerStub, 'data').value({
			permissionSettings: {
				getFor: () => {
					return ['testRole1', 'testRole2', 'testRole3'];
				}
			}
		});

		const permCheck = new PermissionChecker(guildHandlerStub);
		(await permCheck.checkMessage('join', {
			id: '123',
			content: 'join',
			channelId: '123',
			authorId: '123'
		})).should.be.true;
	});

	it('Should deny messages with permissions', async () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'guild').value({
			members: {
				fetch: () => {
					return {
						roles: {
							cache: {
								get: () => {
									return { id: 'testRole4' };
								}
							}
						}
					};
				}
			}
		});
		sinon.stub(guildHandlerStub, 'data').value({
			permissionSettings: {
				getFor: () => {
					return ['testRole1', 'testRole2', 'testRole3'];
				}
			}
		});

		const permCheck = new PermissionChecker(guildHandlerStub);
		(await permCheck.checkMessage('join', {
			id: '123',
			content: 'join',
			channelId: '123',
			authorId: '123'
		})).should.be.false;
	});

	it('Should allow messages from guild owner', async () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'guild').value({
			ownerId: 'ownerId',
			members: {
				fetch: () => {
					return {
						roles: {
							cache: {
								get: () => {
									return { id: 'testRole4' };
								}
							}
						}
					};
				}
			}
		});
		sinon.stub(guildHandlerStub, 'data').value({
			permissionSettings: {
				getFor: () => {
					return ['testRole1', 'testRole2', 'testRole3'];
				}
			}
		});

		const permCheck = new PermissionChecker(guildHandlerStub);
		(await permCheck.checkMessage('join', {
			id: '123',
			content: 'join',
			channelId: '123',
			authorId: 'ownerId'
		})).should.be.true;
	});

	it('Should deny messages with commands that don\'t exist', async () => {
		const guildHandlerStub = newStub();
		sinon.stub(guildHandlerStub, 'guild').value({
			members: {
				fetch: () => {
					return {
						roles: {
							cache: {
								get: () => {
									return { id: 'testRole4' };
								}
							}
						}
					};
				}
			}
		});
		sinon.stub(guildHandlerStub, 'data').value({
			permissionSettings: {
				getFor: () => { return; }
			}
		});

		const permCheck = new PermissionChecker(guildHandlerStub);
		(await permCheck.checkMessage('join', {
			id: '123',
			content: 'join',
			channelId: '123',
			authorId: '123'
		})).should.be.false;
	});
});