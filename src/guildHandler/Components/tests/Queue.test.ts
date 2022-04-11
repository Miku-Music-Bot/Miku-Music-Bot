import { should } from 'chai';
should();
import sinon from 'sinon';
import { newStub } from './GuildHandlerStub.test';

import Queue from '../Queue';
import type Song from '../Data/SourceData/Song';


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

describe('Queue Manipulation', () => {
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

	it('Should initialize = autoplay songs into autoplay list into autoplay array', async () => {
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
});
