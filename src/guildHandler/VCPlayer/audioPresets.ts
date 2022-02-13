type eqPreset = {
	name: string,
	eq: [
		{
			// do this later
		}
	]
};

const defaultSettings = {
	name: 'Default',
	volume: 1,
	normalize: true,
	nightcore: false
};

const bassBoost: eqPreset = {
	name: 'Bass Boost',
	eq: [{
		// later
	}]
};

const presets = {
	default: defaultSettings,

	eqPresets: {
		bassBoost: bassBoost
	}
};

export default presets;