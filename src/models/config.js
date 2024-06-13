/*
 * Style configuration
 */

/**
 * Enum for RNA base layout
 * @property {string} LINE - linear layout
 * @property {string} CIRCLE - circular layout
 * @property {string} RADIATE - radiate layout
 * @property {string} NAVIEW - NAView layout
 * @property {string} TURTLE - RNAturtle layout (Wiegreffe et al. 2018)
 * @property {string} PUZZLER - RNApuzzler layout (Wiegreffe et al. 2018)
 * @readonly
 */
export const Layouts = Object.freeze({
	LINE:   'line',
	CIRCLE: 'circle',
	RADIATE:'radiate',
	NAVIEW: 'naview',
	TURTLE: 'turtle',
	PUZZLER:'puzzler'
});


/**
 * VARNAConfig defines the style of drawing
 * @class
 * @public
 * @property {string} layout - base layout (default: Layouts.RADIATE)
 * @property {int} spaceBetweenBases - multiplier for base spacing
 * @property {int} bpDistance - distance between paired bases (length of canonical basepair)
 * @property {int} backboneLoop - backbone distance within a loop (radiate, turtle, puzzler)
 * @property {int} backboneMultiLoop - backbone distance within a multiloop for radiate layout
 * @property {string} baseInnerColor - color to fill base (default: rgb(242, 242, 242))
 * @property {string} baseOutlineColor - color of base border (default: rgb(91, 91, 91))
 * @property {float} baseOutlineThickness - base border thickness (default: 1.5)
 * @property {string} backboneColor - color of backbone (default: rgb(91, 91, 91))
 * @property {int} backboneThickness - backbone thickness (default: 1)
 * @property {string} bpColor - basepair color (default: blue)
 * @property {int} bpThickness - basepair thickness (default: 1)
 * @property {bool} drawBases - base visibility (default: true)
 * @property {bool} drawBacbone - backbone visibility (default: true)
 * @property {Puzzler} puzzler - puzzler setting
 */
export class VARNAConfig {
	// Layout related
	layout = Layouts.RADIATE;
 	spaceBetweenBases = 1;
	bpDistance = 65;
	backboneLoop = 40;
	backboneMultiLoop = 35;
	
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
	
	// Visibility 
	drawBases = true;
	drawBackbone = true;
	// RNApuzzler config
	puzzler = new Puzzler();
	
	// TODO: Check invalid argument
	constructor (opt={}) {
		Object.assign(this, opt);
	}
}


/**
 * Special configuration for RNApuzzler
 * @class
 * @public
 * @property {bool} checkExteriorIntersections - flag for no interaction with exterior loop (default: true)
 * @property {bool} checkSiblingIntersections - flag for no interaction with sibling loops default: true)
 * @property {bool} checkAncestorIntersections - flag for no interaction with ancestor loops (default: true)
 * @property {bool} optimize - flag to optimize layout (default: true)
 */
export class Puzzler{

  // drawing behavior
  drawArcs = 1;

  // intersection resolution behavior
  checkExteriorIntersections = true;
  checkSiblingIntersections = true;
  checkAncestorIntersections = true;
  optimize = true;

  // import behavior - unused for now
  config = null;

  // other stuff
  filename = null;

  numberOfChangesAppliedToConfig = 0;
  psNumber = 0;
  maximumNumberOfConfigChangesAllowed = null;

	constructor (opt={}) {
		Object.assign(this, opt);
	}
}
