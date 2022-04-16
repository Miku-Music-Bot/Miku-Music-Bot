import { should } from 'chai';
should();

import AudioSettings from './AudioSettings';
import { AUDIO_PRESETS, EQ_PRESETS } from './config/audioConfig';

describe('AudioSettings Initialization', () => {
	it('Should initialize using defaults if nothing given and emit events', (done) => {
		const audioSet = new AudioSettings();
		let newSetEmitted = false;
		let restartProcessorEmitted = false;
		let calledDone = false;
		audioSet.events.on('newSettings', () => {
			newSetEmitted = true;
			if (newSetEmitted && restartProcessorEmitted && !calledDone) { calledDone = true; done(); }
		});

		audioSet.events.on('restartProcessor', () => {
			restartProcessorEmitted = true;
			if (newSetEmitted && restartProcessorEmitted) { calledDone = true; done(); }
		});

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
				eq: []
			}
		});

		audioSet.name.should.equal('testAudio');
		audioSet.normalize.should.be.false;
		audioSet.nightcore.should.be.true;
		audioSet.volume.should.equal(0.1);
		audioSet.eqName.should.equal('testEQ');
		audioSet.eq.length.should.equal(0);
	});

	it('Should initialize using given properties and fill in missing properties with default', () => {
		const audioSet = new AudioSettings({
			audio: {
				normalize: false,
				nightcore: true
			},
			eq: {
				name: 'testEQ',
				eq: []
			}
		} as any);

		audioSet.name.should.equal(AUDIO_PRESETS.default.name);
		audioSet.normalize.should.be.false;
		audioSet.nightcore.should.be.true;
		audioSet.volume.should.equal(AUDIO_PRESETS.default.volume);
		audioSet.eqName.should.equal('testEQ');
		audioSet.eq.length.should.equal(0);
	});
});

describe('Setting new audio and eq settings', () => {
	it('Should apply new audio settings and emit events', (done) => {
		const audioSet = new AudioSettings();

		let newSetEmitted = false;
		let restartProcessorEmitted = false;
		let calledDone = false;
		audioSet.events.on('newSettings', () => {
			newSetEmitted = true;
			if (newSetEmitted && restartProcessorEmitted && !calledDone) { calledDone = true; done(); }
		});

		audioSet.events.on('restartProcessor', () => {
			restartProcessorEmitted = true;
			if (newSetEmitted && restartProcessorEmitted && !calledDone) { calledDone = true; done(); }
		});

		audioSet.newSettings({ name: 'testSet', normalize: false, nightcore: true } as any);

		audioSet.name.should.equal('testSet');
		audioSet.normalize.should.be.false;
		audioSet.nightcore.should.be.true;
		audioSet.volume.should.equal(AUDIO_PRESETS.default.volume);
		audioSet.eqName.should.equal(EQ_PRESETS.default.name);
	});

	it('Should apply new eq settings and emit events', (done) => {
		const audioSet = new AudioSettings();

		let newSetEmitted = false;
		let restartProcessorEmitted = false;
		let calledDone = false;
		audioSet.events.on('newSettings', () => {
			newSetEmitted = true;
			if (newSetEmitted && restartProcessorEmitted && !calledDone) { calledDone = true; done(); }
		});

		audioSet.events.on('restartProcessor', () => {
			restartProcessorEmitted = true;
			if (newSetEmitted && restartProcessorEmitted && !calledDone) { calledDone = true; done(); }
		});

		audioSet.newEQ({ name: 'testSet', eq: [] });

		audioSet.name.should.equal(AUDIO_PRESETS.default.name);
		if (AUDIO_PRESETS.default.normalize) { audioSet.normalize.should.be.true; }
		else { audioSet.normalize.should.be.false; }
		if (AUDIO_PRESETS.default.nightcore) { audioSet.nightcore.should.be.true; }
		else { audioSet.nightcore.should.be.false; }
		audioSet.volume.should.equal(AUDIO_PRESETS.default.volume);

		audioSet.eqName.should.equal('testSet');
		audioSet.eq.length.should.equal(0);
	});
});

describe('Export audio settings', () => {
	it('Should export audio settings in the correct database format', () => {
		const audioSet = new AudioSettings();

		const exported = audioSet.export();

		exported.audio.name.should.equal(AUDIO_PRESETS.default.name);
		if (AUDIO_PRESETS.default.normalize) { exported.audio.normalize.should.be.true; }
		else { exported.audio.normalize.should.be.false; }
		if (AUDIO_PRESETS.default.nightcore) { exported.audio.nightcore.should.be.true; }
		else { exported.audio.nightcore.should.be.false; }
		exported.audio.volume.should.equal(AUDIO_PRESETS.default.volume);
		exported.eq.name.should.equal(EQ_PRESETS.default.name);
		for (let i = 0; i < audioSet.eq.length; i++) { exported.eq.eq.should.equal(EQ_PRESETS.default.eq); }
	});
});