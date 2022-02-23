// Audio Processor Configuration data and defaults
export type AudioConfig = {
	name: string,
	volume: number,
	normalize: boolean,
	nightcore: boolean
}
const audioDefault = {
	name: 'Default',
	volume: 1,
	normalize: true,
	nightcore: false
};
// Audio Processor Configuration presets
const nightcore = {
	name: 'Nightcore',
	volume: 1,
	normalize: true,
	nightcore: true
};

// Audio Processor EQ Configuration data and defaults
export type EQConfig = {
	name: string,
	eq: [
		{
			//
		}
	]
};
const eqDefault: EQConfig = {
	name: 'Default',
	eq: [
		{}
	]
};
// EQ Configuration presets
const bassBoost: EQConfig = {
	name: 'Bass Boost',
	eq: [{
		// later
	}]
};

// Export presets
export const AUDIO_PRESETS = {
	default: audioDefault,
	nightcore: nightcore
};
export const EQ_PRESETS = {
	default: eqDefault,
	bassBoost: bassBoost
};