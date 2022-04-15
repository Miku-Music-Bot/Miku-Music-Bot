import { should } from 'chai';
should();
import sinon from 'sinon';

import * as mongodb from 'mongodb';

import GuildData from './GuildData';
import { guildTestSettings, newStub } from '../../GuildHandlerStub.test';
import { AUDIO_PRESETS, EQ_PRESETS } from './Settings/config/audioConfig';
import { GUILD_DEFAULT } from './Settings/config/guildConfig';
import { PERMISSIONS_DEFAULT } from './Settings/config/permissionConfig';

describe('Guild Data Initialization', () => {
	it('Should initialize guild data components using default constructor when no guild config exists and save config', async () => {
		const MongodbStub = sinon.stub(new mongodb.MongoClient('mongodb+srv://user:pwd@localhost'));
		let insertCount = 0;
		MongodbStub.db.returns({
			collection: () => {
				return {
					findOne: () => {
						return new Promise((resolve) => { resolve(undefined); });
					},
					insertOne: () => { insertCount++; return; },
					replaceOne: () => { return; }
				};
			}
		} as unknown as mongodb.Db);

		const guildHandlerStub = newStub({}, false, { mongodb: MongodbStub });
		const gData = new GuildData(guildHandlerStub);
		sinon.stub(guildHandlerStub, 'guild').value({
			roles: {
				cache: {
					filter: () => {
						return { first: () => { return { id: 'testRole' }; } };
					}
				}
			}
		});
		sinon.stub(guildHandlerStub, 'data').value(gData);
		await gData.initData();

		gData.audioSettings.name.should.equal(AUDIO_PRESETS.default.name);
		gData.audioSettings.eqName.should.equal(EQ_PRESETS.default.name);

		gData.guildSettings.prefix.should.equal(GUILD_DEFAULT.prefix);

		gData.permissionSettings.resetPermissions(guildHandlerStub.guild);
		gData.permissionSettings.getFor(PERMISSIONS_DEFAULT.everyone[0]).indexOf('testRole').should.not.equal(-1);

		insertCount.should.equal(1);
	});

	it('Should initialize guild data components when guild config exists', async () => {
		const guildHandlerStub = newStub();
		const gData = new GuildData(guildHandlerStub);
		sinon.stub(guildHandlerStub, 'data').value(gData);
		await gData.initData();

		gData.audioSettings.name.should.equal('testAudio');
		gData.audioSettings.eqName.should.equal('testEQ');

		gData.guildSettings.prefix.should.equal('!testPrefix');

		gData.permissionSettings.getFor('testCommand')[0].should.equal('testRole');
	});

	it('Should retry if monogdb returns error', (done) => {
		const MongodbStub = sinon.stub(new mongodb.MongoClient('mongodb+srv://user:pwd@localhost'));
		let findCalled = 0;
		let insertCalled = 0;
		let replaceCalled = 0;
		MongodbStub.db.returns({
			collection: () => {
				return {
					findOne: () => {
						return new Promise((resolve, reject) => {
							findCalled++;
							if (findCalled >= 5) { resolve(undefined); }
							else { reject(new Error()); }
						});
					},
					insertOne: (): Promise<void> => {
						return new Promise((resolve, reject) => {
							insertCalled++;
							if (insertCalled >= 5) { resolve(); }
							else { reject(new Error()); }
						});
					},
					replaceOne: (): Promise<void> => {
						return new Promise((resolve, reject) => {
							replaceCalled++;
							if (replaceCalled >= 5) { resolve(); }
							else { reject(new Error()); }
						});
					}
				};
			}
		} as unknown as mongodb.Db);

		const guildHandlerStub = newStub({}, false, { mongodb: MongodbStub });
		const gData = new GuildData(guildHandlerStub);
		sinon.stub(guildHandlerStub, 'data').value(gData);

		gData.initData().then(() => {
			gData.guildSettings.configured = true;	// edit something to trigger save

			setTimeout(() => {
				findCalled.should.equal(9); 	// 5 times for findOne to fail + 4 times for insertOne to fail
				insertCalled.should.equal(5);
				replaceCalled.should.equal(5);
				done();
			}, 1000);
		});
	});
});

describe('Delete Guild Data', async () => {
	it('Should keep retrying delete until successful', async () => {
		const MongodbStub = sinon.stub(new mongodb.MongoClient('mongodb+srv://user:pwd@localhost'));
		let deleteCalled = 0;
		MongodbStub.db.returns({
			collection: () => {
				return {
					findOne: () => {
						return new Promise((resolve) => { resolve(guildTestSettings); });
					},
					insertOne: () => { return; },
					replaceOne: () => { return; },
					deleteOne: ({ guildId }: { guildId: string }): Promise<void> => {
						guildId.should.equal(guildTestSettings.guildId);
						return new Promise((resolve, reject) => {
							deleteCalled++;
							if (deleteCalled >= 5) { resolve(); }
							else { reject(new Error()); }
						});
					}
				};
			}
		} as unknown as mongodb.Db);

		const guildHandlerStub = newStub({}, false, { mongodb: MongodbStub });
		const gData = new GuildData(guildHandlerStub);
		sinon.stub(guildHandlerStub, 'data').value(gData);

		await gData.initData();
		await gData.deleteGuild();

		deleteCalled.should.equal(5);
	});
});