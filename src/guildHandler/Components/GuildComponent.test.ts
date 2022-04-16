import { should } from 'chai';
import GuildHandler from '../GuildHandler';
should();

import GuildComponent from './GuildComponent';

describe('Guild Component', () => {
	it('Should expose often used properties of guildHandler on self', () => {
		let logsCalled = 0;
		let errorsGiven = 0;
		const guildHandler = {
			logger:  {
				debug: (msg: string) => { msg.should.equal('{filename: fileName} debugMsg'); logsCalled++; },
				info: (msg: string) => { msg.should.equal('infoMsg'); logsCalled++; },
				warn: (msg: string) => { msg.should.equal('{filename: fileName} warnMsg'); logsCalled++; },
				error: (msg: string, error: Error) => {
					if (error) { error.message.should.equal('testError'); errorsGiven++; }
					msg.should.equal('{filename: fileName} errorMsg'); logsCalled++;
				}
			},
			bot: {},
			dbClient: {},
			guild: {},
			ui: {},
			queue: {},
			vcPlayer: {},
			drive: {},
			config: {}
		};
		class Component extends GuildComponent {
			constructor(guildHandler: GuildHandler) {
				super(guildHandler, 'fileName');
			}
		}
		const component = new Component(guildHandler as any);

		component.guildHandler.should.equal(guildHandler);
		component.bot.should.equal(guildHandler.bot);
		component.dbClient.should.equal(guildHandler.dbClient);
		component.guild.should.equal(guildHandler.guild);
		component.ui.should.equal(guildHandler.ui);
		component.queue.should.equal(guildHandler.queue);
		component.vcPlayer.should.equal(guildHandler.vcPlayer);
		component.drive.should.equal(guildHandler.drive);
		component.config.should.equal(guildHandler.config);
		component.logger.should.equal(guildHandler.logger);

		component.debug('debugMsg');
		component.info('infoMsg');
		component.warn('warnMsg');
		component.error('errorMsg');
		component.error('errorMsg', new Error('testError'));

		errorsGiven.should.equal(1);
		logsCalled.should.equal(5);
	});
});