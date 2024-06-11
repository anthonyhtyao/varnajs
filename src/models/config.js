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
	// Layout related
	layout = Layouts.RADIATE;
 	spaceBetweenBases = 1;
	
	// Inner base
	baseInnerColor = "rgb(242, 242, 242)";
	// Base Outline
	baseOutlineColor = "rgb(91, 91, 91)";
	baseOutlineThickness = 1.5;
	// Backbone
	backboneColor = "rgb(91, 91, 91)";
	backboneThickness = 1;
	// (Canonical) basepair
	bpColor = "blue";
	bpThickness = 1;
	
	
	// TODO: Check invalid argument
	constructor (opt={}) {
		Object.assign(this, opt);
	}
}
