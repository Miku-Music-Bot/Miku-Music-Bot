import { should } from 'chai';
should();

import AudioSettings from './AudioSettings';
import { AUDIO_PRESETS, EQ_PRESETS } from './config/audioConfig';

describe('AudioSettings Initialization', () => {
	it('Should initialize using defaults if nothing given', () => {
		const audioSet = new AudioSettings();

		audioSet.name.should.equal(AUDIO_PRESETS.default.name);
		if (AUDIO_PRESETS.default.normalize) { audioSet.normalize.should.be.true; }
		else { audioSet.normalize.should.be.false; }
		if (AUDIO_PRESETS.default.nightcore) { audioSet.nightcore.should.be.true; }
		else { audioSet.nightcore.should.be.false; }
		audioSet.volume.should.equal(AUDIO_PRESETS.default.volume);
		audioSet.eqName.should.equal(EQ_PRESETS.default.name);
		for (let i = 0; i < audioSet.eq.length; i++) { audioSet.eq.should.equal(EQ_PRESETS.default.eq); }
	});

	it('Should initialize using given properties', () => {
		const audioSet = new AudioSettings({
			audio: {
				name: 'testAudio',
				normalize: false,
				nightcore: true,
				volume: 0.1
			},
			eq: {
				name: 'testEQ',
				eq: [{}]
			}
		});

		audioSet.name.should.equal('testAudio');
		audioSet.normalize.should.be.false;
		audioSet.nightcore.should.be.true;
		audioSet.volume.should.equal(0.1);
		audioSet.eqName.should.equal('testEQ');
	});

	it('Should initialize using given properties and fill in missing properties with default', () => {
		const audioSet = new AudioSettings({
			audio: {
				normalize: false,
				nightcore: true
			},
			eq: {
				eq: [{}]
			}
		} as any);

		audioSet.name.should.equal(AUDIO_PRESETS.default.name);
		audioSet.normalize.should.be.false;
		audioSet.nightcore.should.be.true;
		audioSet.volume.should.equal(AUDIO_PRESETS.default.volume);
		audioSet.eqName.should.equal(EQ_PRESETS.default.name);
	});
});