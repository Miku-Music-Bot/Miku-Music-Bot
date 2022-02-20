export type AudioConfig = {
	name?: string,
	volume?: number,
	normalize?: boolean,
	nightcore?: boolean
}

export type EQConfig = {
	name?: string,
	eq?: [
		{
			//
		}
	]
};

const audioDefault = {
	name: 'Default',
	volume: 1,
	normalize: true,
	nightcore: false
};

const eqDefault: EQConfig = {
	name: 'Default',
	eq: [
		{}
	]
};

const bassBoost: EQConfig = {
	name: 'Bass Boost',
	eq: [{
		// later
	}]
};

export const AUDIO_PRESETS = {
	default: audioDefault,
};

export const EQ_PRESETS = {
	default: eqDefault,
	bassBoost: bassBoost
};