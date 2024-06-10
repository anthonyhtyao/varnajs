/*
 * Style configuration
 */

export const Layouts = Object.freeze({
	LINE:   'line',
	CIRCLE: 'circle',
	RADIATE:'radiate',
	NAVIEW: 'naview',
	TURTLE: 'turtle',
	PUZZLER:'puzzler'
});


export class VARNAConfig {
	layout = Layouts.RADIATE;
 	spaceBetweenBases = 1;
	
	// TODO: Check invalid argument
	constructor (opt={}) {
		Object.assign(this, opt);
	}
}
