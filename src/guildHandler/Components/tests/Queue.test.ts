import { should } from 'chai';
should();
import sinon from 'sinon';
import { newStub } from '../../tests/GuildHandlerStub.test';

import Discord from 'discord.js';

import Queue from '../Queue';
import type Song from '../Data/SourceData/Song';
import type { InteractionInfo } from '../../GHChildInterface';

describe('Resolve Index', () => {
	const guildHandlerStub = newStub();
	const queue = new Queue(guildHandlerStub);

	it('should turn easy to understand index into correct song from correct array when 1 list is populated', () => {
		// only autoplay
		let from = 'autoplay';
		sinon.stub(queue, <any>'_played').value([]);
		sinon.stub(queue, <any>'_advanced').value([]);
		sinon.stub(queue, <any>'_queue').value([]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: from + '1' },
			{ title: from + '2' },
			{ title: from + '3' },
			{ title: from + '4' }
		]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal(from);
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal(from + '1');
		queue.resolveIndex(1).from.should.equal(from);
		queue.resolveIndex(1).index.should.equal(1);
		queue.resolveIndex(1).song.title.should.equal(from + '2');
		queue.resolveIndex(2).from.should.equal(from);
		queue.resolveIndex(2).index.should.equal(2);
		queue.resolveIndex(2).song.title.should.equal(from + '3');
		queue.resolveIndex(3).from.should.equal(from);
		queue.resolveIndex(3).index.should.equal(3);
		queue.resolveIndex(3).song.title.should.equal(from + '4');
		queue.resolveIndex(4).from.should.equal('notFound');

		// only queue
		from = 'queue';
		sinon.stub(queue, <any>'_played').value([]);
		sinon.stub(queue, <any>'_advanced').value([]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: from + '1' },
			{ title: from + '2' },
			{ title: from + '3' },
			{ title: from + '4' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal(from);
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal(from + '1');
		queue.resolveIndex(1).from.should.equal(from);
		queue.resolveIndex(1).index.should.equal(1);
		queue.resolveIndex(1).song.title.should.equal(from + '2');
		queue.resolveIndex(2).from.should.equal(from);
		queue.resolveIndex(2).index.should.equal(2);
		queue.resolveIndex(2).song.title.should.equal(from + '3');
		queue.resolveIndex(3).from.should.equal(from);
		queue.resolveIndex(3).index.should.equal(3);
		queue.resolveIndex(3).song.title.should.equal(from + '4');
		queue.resolveIndex(4).from.should.equal('notFound');

		// only advanced
		from = 'advanced';
		sinon.stub(queue, <any>'_played').value([]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: from + '1' },
			{ title: from + '2' },
			{ title: from + '3' },
			{ title: from + '4' }
		]);
		sinon.stub(queue, <any>'_queue').value([]);
		sinon.stub(queue, <any>'_autoplay').value([]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal(from);
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal(from + '1');
		queue.resolveIndex(1).from.should.equal(from);
		queue.resolveIndex(1).index.should.equal(1);
		queue.resolveIndex(1).song.title.should.equal(from + '2');
		queue.resolveIndex(2).from.should.equal(from);
		queue.resolveIndex(2).index.should.equal(2);
		queue.resolveIndex(2).song.title.should.equal(from + '3');
		queue.resolveIndex(3).from.should.equal(from);
		queue.resolveIndex(3).index.should.equal(3);
		queue.resolveIndex(3).song.title.should.equal(from + '4');
		queue.resolveIndex(4).from.should.equal('notFound');

		// only played
		from = 'played';
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: from + '1' } },
			{ song: { title: from + '2' } },
			{ song: { title: from + '3' } },
			{ song: { title: from + '4' } },
		]);
		sinon.stub(queue, <any>'_advanced').value([]);
		sinon.stub(queue, <any>'_queue').value([]);
		sinon.stub(queue, <any>'_autoplay').value([]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal(from);
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal(from + '1');
		queue.resolveIndex(1).from.should.equal(from);
		queue.resolveIndex(1).index.should.equal(1);
		queue.resolveIndex(1).song.title.should.equal(from + '2');
		queue.resolveIndex(2).from.should.equal(from);
		queue.resolveIndex(2).index.should.equal(2);
		queue.resolveIndex(2).song.title.should.equal(from + '3');
		queue.resolveIndex(3).from.should.equal(from);
		queue.resolveIndex(3).index.should.equal(3);
		queue.resolveIndex(3).song.title.should.equal(from + '4');
		queue.resolveIndex(4).from.should.equal('notFound');
	});

	it('should turn easy to understand index into correct song from correct array when 2 lists are populated', () => {
		// played + advanced only
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' } },
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([]);
		sinon.stub(queue, <any>'_autoplay').value([]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('played');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('played1');
		queue.resolveIndex(1).from.should.equal('advanced');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('advanced1');
		queue.resolveIndex(2).from.should.equal('notFound');


		// played + queue only
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' } },
		]);
		sinon.stub(queue, <any>'_advanced').value([]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('played');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('played1');
		queue.resolveIndex(1).from.should.equal('queue');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('queue1');
		queue.resolveIndex(2).from.should.equal('notFound');

		// played + autoplay only
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' } },
		]);
		sinon.stub(queue, <any>'_advanced').value([]);
		sinon.stub(queue, <any>'_queue').value([]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('played');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('played1');
		queue.resolveIndex(1).from.should.equal('autoplay');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('autoplay1');
		queue.resolveIndex(2).from.should.equal('notFound');

		// advanced + queue only
		sinon.stub(queue, <any>'_played').value([]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('advanced');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('advanced1');
		queue.resolveIndex(1).from.should.equal('queue');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('queue1');
		queue.resolveIndex(2).from.should.equal('notFound');

		// advanced + autoplay only
		sinon.stub(queue, <any>'_played').value([]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('advanced');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('advanced1');
		queue.resolveIndex(1).from.should.equal('autoplay');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('autoplay1');
		queue.resolveIndex(2).from.should.equal('notFound');

		// queue + autoplay only
		sinon.stub(queue, <any>'_played').value([]);
		sinon.stub(queue, <any>'_advanced').value([]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('queue');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('queue1');
		queue.resolveIndex(1).from.should.equal('autoplay');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('autoplay1');
		queue.resolveIndex(2).from.should.equal('notFound');
	});

	it('should turn easy to understand index into correct song from correct array with 3 lists populated', () => {
		// played + advanced + queue only
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' } },
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('played');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('played1');
		queue.resolveIndex(1).from.should.equal('advanced');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('advanced1');
		queue.resolveIndex(2).from.should.equal('queue');
		queue.resolveIndex(2).index.should.equal(0);
		queue.resolveIndex(2).song.title.should.equal('queue1');
		queue.resolveIndex(3).from.should.equal('notFound');

		// played + advanced + autoplay only
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' } },
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('played');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('played1');
		queue.resolveIndex(1).from.should.equal('advanced');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('advanced1');
		queue.resolveIndex(2).from.should.equal('autoplay');
		queue.resolveIndex(2).index.should.equal(0);
		queue.resolveIndex(2).song.title.should.equal('autoplay1');
		queue.resolveIndex(3).from.should.equal('notFound');

		// played + queue + autoplay only
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' } },
		]);
		sinon.stub(queue, <any>'_advanced').value([]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('played');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('played1');
		queue.resolveIndex(1).from.should.equal('queue');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('queue1');
		queue.resolveIndex(2).from.should.equal('autoplay');
		queue.resolveIndex(2).index.should.equal(0);
		queue.resolveIndex(2).song.title.should.equal('autoplay1');
		queue.resolveIndex(3).from.should.equal('notFound');

		// advanced + queue + autoplay only
		sinon.stub(queue, <any>'_played').value([]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('advanced');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('advanced1');
		queue.resolveIndex(1).from.should.equal('queue');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('queue1');
		queue.resolveIndex(2).from.should.equal('autoplay');
		queue.resolveIndex(2).index.should.equal(0);
		queue.resolveIndex(2).song.title.should.equal('autoplay1');
		queue.resolveIndex(3).from.should.equal('notFound');
	});

	it('should turn easy to understand index into correct song from correct array when all lists are populated', () => {
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' } },
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		queue.resolveIndex(-1).from.should.equal('notFound');
		queue.resolveIndex(0).from.should.equal('played');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('played1');
		queue.resolveIndex(1).from.should.equal('advanced');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('advanced1');
		queue.resolveIndex(2).from.should.equal('queue');
		queue.resolveIndex(2).index.should.equal(0);
		queue.resolveIndex(2).song.title.should.equal('queue1');
		queue.resolveIndex(3).from.should.equal('autoplay');
		queue.resolveIndex(3).index.should.equal(0);
		queue.resolveIndex(3).song.title.should.equal('autoplay1');
		queue.resolveIndex(4).from.should.equal('notFound');
	});
});

describe('Autoplay initialization', () => {
	let queue: Queue;
	before((done) => {
		(async () => {
			const guildHandlerStub = newStub();
			await guildHandlerStub.data.initData();
			sinon.stub(guildHandlerStub.data, 'guildSettings').value({
				shuffle: false,
				autoplayList: [
					{ id: 1, playlist: 1 },
					{ id: 2, playlist: 2 },
					{ id: 3, playlist: 2 }
				]
			});
			sinon.stub(guildHandlerStub.data.sourceManager, 'resolveRef').callsFake((ref) => {
				return [{ title: `${ref.id}autoplay${ref.playlist}` }] as Song[];
			});

			queue = new Queue(guildHandlerStub);
		})();
		done();
	});

	it('Should initialize autoplay songs into autoplay list into autoplay array', () => {
		queue.refreshAutoplay();

		queue.resolveIndex(0).from.should.equal('autoplay');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('1autoplay1');
		queue.resolveIndex(1).from.should.equal('autoplay');
		queue.resolveIndex(1).index.should.equal(1);
		queue.resolveIndex(1).song.title.should.equal('2autoplay2');
		queue.resolveIndex(2).from.should.equal('autoplay');
		queue.resolveIndex(2).index.should.equal(2);
		queue.resolveIndex(2).song.title.should.equal('3autoplay2');
		queue.resolveIndex(3).from.should.equal('notFound');
	});

	it('Should add new autoplay songs to end of existing autoplay array', () => {
		queue.refreshAutoplay();

		queue.resolveIndex(0).from.should.equal('autoplay');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('1autoplay1');
		queue.resolveIndex(1).from.should.equal('autoplay');
		queue.resolveIndex(1).index.should.equal(1);
		queue.resolveIndex(1).song.title.should.equal('2autoplay2');
		queue.resolveIndex(2).from.should.equal('autoplay');
		queue.resolveIndex(2).index.should.equal(2);
		queue.resolveIndex(2).song.title.should.equal('3autoplay2');
		queue.resolveIndex(3).from.should.equal('autoplay');
		queue.resolveIndex(3).index.should.equal(3);
		queue.resolveIndex(3).song.title.should.equal('1autoplay1');
		queue.resolveIndex(4).from.should.equal('autoplay');
		queue.resolveIndex(4).index.should.equal(4);
		queue.resolveIndex(4).song.title.should.equal('2autoplay2');
		queue.resolveIndex(5).from.should.equal('autoplay');
		queue.resolveIndex(5).index.should.equal(5);
		queue.resolveIndex(5).song.title.should.equal('3autoplay2');
		queue.resolveIndex(6).from.should.equal('notFound');
	});
});

describe('Adding, removing, and advancing songs', () => {
	const guildHandlerStub = newStub();
	const queue = new Queue(guildHandlerStub);

	sinon.stub(queue, <any>'_played').value([
		{ song: { title: 'played1', reqBy: 'testUser' } },
		{ song: { title: 'played2', reqBy: 'testUser' } }
	]);
	sinon.stub(queue, <any>'_advanced').value([
		{ title: 'advanced1', reqBy: 'testUser' },
		{ title: 'advanced2', reqBy: 'testUser' }
	]);
	sinon.stub(queue, <any>'_queue').value([
		{ title: 'queue1', reqBy: 'testUser' },
		{ title: 'queue2', reqBy: 'testUser' }
	]);
	sinon.stub(queue, <any>'_autoplay').value([
		{ title: 'autoplay1', reqBy: 'testUser' },
		{ title: 'autoplay2', reqBy: 'testUser' }
	]);

	it('Should add new songs into queue array', () => {
		queue.addQueue([
			{ title: 'queueNew' }
		] as Song[]);

		queue.resolveIndex(0).from.should.equal('played');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('played1');
		queue.resolveIndex(1).from.should.equal('played');
		queue.resolveIndex(1).index.should.equal(1);
		queue.resolveIndex(1).song.title.should.equal('played2');

		queue.resolveIndex(2).from.should.equal('advanced');
		queue.resolveIndex(2).index.should.equal(0);
		queue.resolveIndex(2).song.title.should.equal('advanced1');
		queue.resolveIndex(3).from.should.equal('advanced');
		queue.resolveIndex(3).index.should.equal(1);
		queue.resolveIndex(3).song.title.should.equal('advanced2');

		queue.resolveIndex(4).from.should.equal('queue');
		queue.resolveIndex(4).index.should.equal(0);
		queue.resolveIndex(4).song.title.should.equal('queue1');
		queue.resolveIndex(5).from.should.equal('queue');
		queue.resolveIndex(5).index.should.equal(1);
		queue.resolveIndex(5).song.title.should.equal('queue2');

		queue.resolveIndex(6).from.should.equal('queue');
		queue.resolveIndex(6).index.should.equal(2);
		queue.resolveIndex(6).song.title.should.equal('queueNew');

		queue.resolveIndex(7).from.should.equal('autoplay');
		queue.resolveIndex(7).index.should.equal(0);
		queue.resolveIndex(7).song.title.should.equal('autoplay1');
		queue.resolveIndex(8).from.should.equal('autoplay');
		queue.resolveIndex(8).index.should.equal(1);
		queue.resolveIndex(8).song.title.should.equal('autoplay2');

		queue.resolveIndex(9).from.should.equal('notFound');
	});

	it('Should remove songs from correct locations and clear reqBy property', () => {
		// remove a song from each list
		const notFound = queue.removeSong(9);
		(typeof notFound).should.equal('undefined');

		const fromAutoplay = queue.removeSong(8);
		fromAutoplay.title.should.equal('autoplay2');
		fromAutoplay.reqBy.should.equal('');

		const fromQueue = queue.removeSong(5);
		fromQueue.title.should.equal('queue2');
		fromQueue.reqBy.should.equal('');

		const fromAdvanced = queue.removeSong(3);
		fromAdvanced.title.should.equal('advanced2');
		fromAdvanced.reqBy.should.equal('');

		const fromPlayed = queue.removeSong(1);
		fromPlayed.title.should.equal('played2');
		fromPlayed.reqBy.should.equal('');

		queue.resolveIndex(0).from.should.equal('played');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('played1');

		queue.resolveIndex(1).from.should.equal('advanced');
		queue.resolveIndex(1).index.should.equal(0);
		queue.resolveIndex(1).song.title.should.equal('advanced1');

		queue.resolveIndex(2).from.should.equal('queue');
		queue.resolveIndex(2).index.should.equal(0);
		queue.resolveIndex(2).song.title.should.equal('queue1');
		queue.resolveIndex(3).from.should.equal('queue');
		queue.resolveIndex(3).index.should.equal(1);
		queue.resolveIndex(3).song.title.should.equal('queueNew');

		queue.resolveIndex(4).from.should.equal('autoplay');
		queue.resolveIndex(4).index.should.equal(0);
		queue.resolveIndex(4).song.title.should.equal('autoplay1');

		queue.resolveIndex(5).from.should.equal('notFound');
	});

	it('Should advanced song from any array to advanced and set reqBy property', () => {
		const notFound = queue.advance(5);
		(typeof notFound).should.equal('undefined');

		const fromAutoplay = queue.advance(4);
		fromAutoplay.title.should.equal('autoplay1');
		fromAutoplay.reqBy.should.equal('');

		const fromQueue = queue.advance(4, 'newUser');
		fromQueue.title.should.equal('queueNew');
		fromQueue.reqBy.should.equal('newUser');

		const fromAdvanced = queue.advance(3, 'newUser');
		fromAdvanced.title.should.equal('advanced1');
		fromAdvanced.reqBy.should.equal('newUser');

		const fromPlayed = queue.advance(0, 'newUser');
		fromPlayed.title.should.equal('played1');
		fromPlayed.reqBy.should.equal('newUser');

		queue.resolveIndex(0).from.should.equal('advanced');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('played1');
		queue.resolveIndex(1).from.should.equal('advanced');
		queue.resolveIndex(1).index.should.equal(1);
		queue.resolveIndex(1).song.title.should.equal('advanced1');
		queue.resolveIndex(2).from.should.equal('advanced');
		queue.resolveIndex(2).index.should.equal(2);
		queue.resolveIndex(2).song.title.should.equal('queueNew');
		queue.resolveIndex(3).from.should.equal('advanced');
		queue.resolveIndex(3).index.should.equal(3);
		queue.resolveIndex(3).song.title.should.equal('autoplay1');
		queue.resolveIndex(4).from.should.equal('queue');
		queue.resolveIndex(4).index.should.equal(0);
		queue.resolveIndex(4).song.title.should.equal('queue1');
		queue.resolveIndex(5).from.should.equal('notFound');
	});

	it('Should clear all lists other than autoplay when clearQueue is called', () => {
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay3' }
		]);

		queue.clearQueue();

		queue.resolveIndex(0).from.should.equal('autoplay');
		queue.resolveIndex(0).index.should.equal(0);
		queue.resolveIndex(0).song.title.should.equal('autoplay3');
		queue.resolveIndex(1).from.should.equal('notFound');
	});
});

describe('Queue state getters and setters', () => {
	const guildHandlerStub = newStub();
	const queue = new Queue(guildHandlerStub);

	it('Should have repeatSong getter and setter', () => {
		queue.repeatSong = 10;
		queue.repeatSong.should.equal(10);
		queue.repeatSong = -1;
		queue.repeatSong.should.equal(-1);
		queue.repeatSong = 0;
		queue.repeatSong.should.equal(0);
		queue.repeatSong = -10;
		queue.repeatSong.should.equal(-1);
	});

	it('Should have repeatQueue getter and setter', () => {
		queue.repeatQueue = 10;
		queue.repeatQueue.should.equal(10);
		queue.repeatQueue = -1;
		queue.repeatQueue.should.equal(-1);
		queue.repeatQueue = 0;
		queue.repeatQueue.should.equal(0);
		queue.repeatQueue = -10;
		queue.repeatQueue.should.equal(-1);
	});

	it('Should have nowPlayingSong and lastPlayed getter and setter', () => {
		(typeof queue.nowPlayingSong).should.equal('undefined');
		(typeof queue.lastPlayed).should.equal('undefined');

		sinon.stub(queue, <any>'_nowPlayingSong').value({
			song: { title: 'testSong1' }, save: false
		});
		queue.nowPlayingSong.title.should.equal('testSong1');

		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'testSong2' }, save: false }
		]);
		queue.lastPlayed.title.should.equal('testSong2');

		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'testSong2' }, save: false },
			{ song: { title: 'testSong3' }, save: false }
		]);
		queue.lastPlayed.title.should.equal('testSong3');
	});

	it('Should return correct songs when nextInQueue is called', () => {
		queue.nextInQueue.length.should.equal(0);

		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' } },
			{ song: { title: 'played2' } }
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' },
			{ title: 'advanced2' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' },
			{ title: 'queue2' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' },
			{ title: 'autoplay2' }
		]);

		queue.nextInQueue.length.should.equal(3);
		queue.nextInQueue[0].song.title.should.equal('advanced1');
		queue.nextInQueue[0].index.should.equal(2);
		queue.nextInQueue[1].song.title.should.equal('advanced2');
		queue.nextInQueue[1].index.should.equal(3);
		queue.nextInQueue[2].song.title.should.equal('queue1');
		queue.nextInQueue[2].index.should.equal(4);

		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' },
			{ title: 'autoplay2' }
		]);

		queue.nextInQueue.length.should.equal(2);
		queue.nextInQueue[0].song.title.should.equal('advanced1');
		queue.nextInQueue[0].index.should.equal(2);
		queue.nextInQueue[1].song.title.should.equal('queue1');
		queue.nextInQueue[1].index.should.equal(3);
	});

	it('Should return correct songs when nextInAutoplay is called', () => {
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' } },
			{ song: { title: 'played2' } }
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' },
			{ title: 'advanced2' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' },
			{ title: 'queue2' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' },
			{ title: 'autoplay2' },
			{ title: 'autoplay3' },
			{ title: 'autoplay4' }
		]);

		queue.nextInAutoplay.length.should.equal(3);
		queue.nextInAutoplay[0].song.title.should.equal('autoplay1');
		queue.nextInAutoplay[0].index.should.equal(6);
		queue.nextInAutoplay[1].song.title.should.equal('autoplay2');
		queue.nextInAutoplay[1].index.should.equal(7);
		queue.nextInAutoplay[2].song.title.should.equal('autoplay3');
		queue.nextInAutoplay[2].index.should.equal(8);

		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' },
			{ title: 'autoplay2' }
		]);

		queue.nextInAutoplay.length.should.equal(2);
		queue.nextInAutoplay[0].song.title.should.equal('autoplay1');
		queue.nextInAutoplay[0].index.should.equal(6);
		queue.nextInAutoplay[1].song.title.should.equal('autoplay2');
		queue.nextInAutoplay[1].index.should.equal(7);

		sinon.stub(queue, <any>'_autoplay').value([]);
		queue.nextInAutoplay.length.should.equal(0);
	});
});

describe('Show queue message', () => {
	let queue: Queue;
	let lastSent: Discord.MessageOptions;
	let handler: (interaction: InteractionInfo) => Promise<boolean>;
	let deleted = false;

	before((done) => {
		(async () => {
			const guildHandlerStub = newStub();
			await guildHandlerStub.data.initData();
			sinon.stub(guildHandlerStub.ui, 'sendEmbed').callsFake((messageOptions, life, interactionHandler) => {
				lastSent = messageOptions;
				handler = interactionHandler;
				return new Promise((resolve) => resolve('testMsgId'));
			});

			sinon.stub(guildHandlerStub.ui, 'deleteMsg').callsFake(() => { deleted = true; return new Promise((resolve) => resolve(true)); });

			sinon.stub(guildHandlerStub.ui, 'updateMsg').callsFake(() => { return new Promise((resolve) => resolve(false)); });

			queue = new Queue(guildHandlerStub);
		})();
		done();
	});

	it('Should create and send a valid Discord Message embed', () => {
		// empty queue and autoplay should give empty page no matter what
		queue.showPage(0);
		lastSent.embeds[0].should.be.instanceOf(Discord.MessageEmbed);
		let lastJSON = JSON.stringify(lastSent);
		queue.showPage(1);
		lastSent.embeds[0].should.be.instanceOf(Discord.MessageEmbed);
		JSON.stringify(lastSent).should.equal(lastJSON);
		lastJSON = JSON.stringify(lastSent);

		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1longlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglong' },
			{ title: 'queue2' },
			{ title: 'queue3' },
			{ title: 'queue4' },
			{ title: 'queue5' },
			{ title: 'queue6' },
			{ title: 'queue7' },
			{ title: 'queue8' },
			{ title: 'queue9' },
			{ title: 'queue10' },
			{ title: 'queue11' },
			{ title: 'queue12' },
			{ title: 'queue13' },
			{ title: 'queue14' },
			{ title: 'queue15' },
			{ title: 'queue16' },
			{ title: 'queue17' },
			{ title: 'queue18' },
			{ title: 'queue19' },
			{ title: 'queue20' },
			{ title: 'queue21' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		// page 1 should not be the same as a page with nothing it it
		queue.showPage(1);
		lastSent.embeds[0].should.be.instanceOf(Discord.MessageEmbed);
		JSON.stringify(lastSent).should.not.equal(lastJSON);
		lastJSON = JSON.stringify(lastSent);
		// page 2 should be different from page 1
		queue.showPage(2);
		lastSent.embeds[0].should.be.instanceOf(Discord.MessageEmbed);
		JSON.stringify(lastSent).should.not.equal(lastJSON);
		lastJSON = JSON.stringify(lastSent);
		// page 3 shold be the same as page 2 since there should only be 2 pages (page 3 should become page 2)
		queue.showPage(3);
		lastSent.embeds[0].should.be.instanceOf(Discord.MessageEmbed);
		JSON.stringify(lastSent).should.equal(lastJSON);
		lastJSON = JSON.stringify(lastSent);

		// empty queue but autoplay exists should give different messages
		sinon.stub(queue, <any>'_queue').value([]);

		queue.showPage(0);
		lastSent.embeds[0].should.be.instanceOf(Discord.MessageEmbed);
		JSON.stringify(lastSent).should.not.equal(lastJSON);
		lastJSON = JSON.stringify(lastSent);

		// empty autoplay but queue exists
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([]);

		queue.showPage(0);
		lastSent.embeds[0].should.be.instanceOf(Discord.MessageEmbed);
		JSON.stringify(lastSent).should.not.equal(lastJSON);
		lastJSON = JSON.stringify(lastSent);
	});

	it('Should handle interactions property', async () => {
		queue.showPage(0);
		let success = await handler({
			authorId: 'testUser',
			customId: JSON.stringify({ type: 'unknown' }),
			parentChannelId: 'testChannel',
			parentMessageId: 'testMessage'
		});
		success.should.be.false;

		let calledPage: number;
		sinon.stub(queue, 'showPage').callsFake((page) => { calledPage = page; return new Promise((resolve) => resolve()); });
		success = await handler({
			authorId: 'testUser',
			customId: JSON.stringify({
				type: 'page',
				pageNum: 1203
			}),
			parentChannelId: 'testChannel',
			parentMessageId: 'testMessage'
		});
		success.should.be.true;
		calledPage.should.equal(1203);

		success = await handler({
			authorId: 'testUser',
			customId: JSON.stringify({ type: 'close', }),
			parentChannelId: 'testChannel',
			parentMessageId: 'testMessage'
		});
		success.should.be.true;
		deleted.should.be.true;
	});
});

describe('Queue songs', () => {
	const guildHandlerStub = newStub();
	let queue: Queue;
	let played: Song;

	before((done) => {
		(async () => {
			await guildHandlerStub.data.initData();

			sinon.stub(guildHandlerStub.vcPlayer, 'play').callsFake((song) => { played = song; });

			sinon.stub(guildHandlerStub.data.sourceManager, 'resolveRef').callsFake((ref) => {
				return [{ title: `autoplay${ref.id}` }] as Song[];
			});

			queue = new Queue(guildHandlerStub);
		})();
		done();
	});

	it('Should play through songs and stop if autoplay is off', () => {
		sinon.stub(queue, <any>'_nowPlayingSong').value({ song: undefined, save: false });
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' }, save: false }
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' },
			{ title: 'queue2' },
			{ title: 'queue3' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		const order = ['advanced1', 'queue1', 'queue2', 'queue3'];
		for (let i = 0; i < order.length; i++) {
			queue.nextSong().should.be.true;
			played.title.should.equal(order[i]);
		}
		queue.nextSong().should.be.false;
		played.title.should.equal('queue3');
	});

	it('Should repeat songs when repeat song is not zero', () => {
		sinon.stub(queue, <any>'_nowPlayingSong').value({ song: undefined, save: false });
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' }, save: false }
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' },
			{ title: 'queue2' },
			{ title: 'queue3' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		queue.repeatSong = -1;
		for (let i = 0; i < 50; i++) {
			queue.nextSong().should.be.true;
			played.title.should.equal('advanced1');
		}
		queue.repeatSong = 2;
		const order = ['advanced1', 'advanced1', 'queue1', 'queue2', 'queue3'];
		for (let i = 0; i < order.length; i++) {
			queue.nextSong().should.be.true;
			played.title.should.equal(order[i]);
		}
		queue.nextSong().should.be.false;
		played.title.should.equal('queue3');
	});

	it('Should repeat queue when repeat queue is not zero', () => {
		sinon.stub(queue, <any>'_nowPlayingSong').value({ song: undefined, save: false });
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' }, save: false }
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		queue.repeatQueue = -1;
		for (let i = 0; i < 50; i++) {
			queue.nextSong().should.be.true;
			played.title.should.equal('advanced1');
		}
		queue.repeatQueue = 2;
		const order = ['advanced1', 'advanced1', 'advanced1'];
		for (let i = 0; i < order.length; i++) {
			queue.nextSong().should.be.true;
			played.title.should.equal(order[i]);
		}
		queue.nextSong().should.be.false;
		played.title.should.equal('advanced1');
	});

	it('Should handle a mix of repeat song and repeat queue', () => {
		sinon.stub(queue, <any>'_nowPlayingSong').value({ song: undefined, save: false });
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' }, save: false }
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' },
			{ title: 'queue2' },
			{ title: 'queue3' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([
			{ title: 'autoplay1' }
		]);

		queue.repeatSong = 3;
		queue.repeatQueue = 1;
		const order = ['advanced1', 'advanced1', 'advanced1', 'advanced1', 'queue1', 'queue2', 'queue3', 'advanced1', 'queue1', 'queue2', 'queue3'];
		for (let i = 0; i < order.length; i++) {
			queue.nextSong().should.be.true;
			played.title.should.equal(order[i]);
		}
		queue.nextSong().should.be.false;
		played.title.should.equal('queue3');
	});

	it('Should play from autoplay if queue is empty and autoplay is enabled', () => {
		sinon.stub(guildHandlerStub.data, 'guildSettings').value({
			shuffle: false,
			autoplay: true,
			autoplayList: [
				{ id: 1, playlist: 1 },
				{ id: 2, playlist: 1 },
				{ id: 3, playlist: 1 }
			]
		});

		sinon.stub(queue, <any>'_nowPlayingSong').value({ song: undefined, save: false });
		sinon.stub(queue, <any>'_played').value([
			{ song: { title: 'played1' }, save: false }
		]);
		sinon.stub(queue, <any>'_advanced').value([
			{ title: 'advanced1' }
		]);
		sinon.stub(queue, <any>'_queue').value([
			{ title: 'queue1' },
			{ title: 'queue2' },
			{ title: 'queue3' }
		]);
		sinon.stub(queue, <any>'_autoplay').value([]);
		queue.refreshAutoplay();

		const order = ['advanced1', 'queue1', 'queue2', 'queue3', 'autoplay1', 'autoplay2', 'autoplay3', 'autoplay1', 'autoplay2', 'autoplay3', 'autoplay1', 'autoplay2', 'autoplay3', 'autoplay1', 'autoplay2', 'autoplay3'];
		for (let i = 0; i < order.length; i++) {
			queue.nextSong().should.be.true;
			played.title.should.equal(order[i]);
		}
	});
});