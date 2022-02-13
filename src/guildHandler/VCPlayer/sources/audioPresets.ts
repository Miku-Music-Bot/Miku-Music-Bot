type eqPreset = {
	name: string,
	eq: [
		{
			//
		}
	]
};

const defaultSettings = {
	name: 'Default',
	volume: 1,
	normalize: true,
	nightcore: false
};

const eqDefault: eqPreset = {
	name: 'Default Eq',
	eq: [
		{}
	]
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
		eqDefault: eqDefault,
		bassBoost: bassBoost
	}
};

export default presets;