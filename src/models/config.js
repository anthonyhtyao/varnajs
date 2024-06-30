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

/** Default base label color */
export const BASE_NAME_COLOR_DEFAULT = "rgb(64, 64, 64)";
/** Default inner base color */
export const BASE_INNER_COLOR_DEFAULT = "rgb(242, 242, 242)";
/** Default base outline color */
export const BASE_OUTLINE_COLOR_DEFAULT = "rgb(91, 91, 91)";
/** Default base outline thickness */
export const BASE_OUTLINE_THICKNESS_DEFAULT = 1.5;
/** Default base number color */
export const BASE_NUMBER_COLOR_DEFAULT = "rgb(64, 64, 64)";
/** Default basepair color */
export const BASEPAIR_COLOR_DEFAULT = "blue";
/** Default basepair thickness */
export const BASEPAIR_THICKNESS_DEFAULT = 1;

/**
 * VARNAConfig defines the style of drawing
 * @class
 * @public
 * @property {string} layout - base layout (default: Layouts.RADIATE)
 * @property {int} spaceBetweenBases - multiplier for base spacing
 * @property {int} bpDistance - distance between paired bases (length of canonical basepair)
 * @property {int} backboneLoop - backbone distance within a loop (radiate, turtle, puzzler)
 * @property {int} backboneMultiLoop - backbone distance within a multiloop for radiate layout
 * @property {bool} flatExteriorLoop - draw flat exterior loop in radiate mode
 * @property {string} baseNameColor - color of base name, i.e. nucleotide (default: rgb(64, 64, 64))
 * @property {string} baseInnerColor - color to fill base (default: rgb(242, 242, 242))
 * @property {string} baseOutlineColor - color of base border (default: rgb(91, 91, 91))
 * @property {float} baseOutlineThickness - base border thickness (default: 1.5)
 * @property {string} baseNumColor - color of base number (default: rgb(64, 64, 64))
 * @property {int} baseNumPeriod - base number period. Non positive value means hiding base number (default: 10)
 * @property {string} backboneColor - color of backbone (default: rgb(91, 91, 91))
 * @property {int} backboneThickness - backbone thickness (default: 1)
 * @property {string} bpColor - basepair color (default: blue)
 * @property {int} bpThickness - basepair thickness (default: 1)
 * @property {bool} bpLowerPlane - draw basepair in lower plane in linear layout (default: false)
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
	flatExteriorLoop = false;
	
	// Base label
	baseNameColor = BASE_NAME_COLOR_DEFAULT;
	// Inner base
	baseInnerColor = BASE_INNER_COLOR_DEFAULT;
	// Base Outline
	baseOutlineColor = BASE_OUTLINE_COLOR_DEFAULT;
	baseOutlineThickness = BASE_OUTLINE_THICKNESS_DEFAULT;
	// Base number
	baseNumColor = BASE_NUMBER_COLOR_DEFAULT;
	baseNumPeriod = 10;
	// Backbone
	backboneColor = "rgb(91, 91, 91)";
	backboneThickness = 1;
	// (Canonical) basepair
	bpColor = BASEPAIR_COLOR_DEFAULT;
	bpThickness = BASEPAIR_THICKNESS_DEFAULT;
	bpLowerPlane = false;
	
	// Visibility 
	drawBases = true;
	drawBackbone = true;
	// RNApuzzler config
	puzzler = new Puzzler();
	
	// TODO: Check invalid argument
	constructor (opt={}) {
		Object.assign(this, opt);
	}

	set (opt={}) {
		Object.assign(this, opt);
	}

	/**
	 * Create general cytoscape style for bases
	 * @param {string} selector - base selector (default: "node")
	 */
	baseCyStyle(selector="node") {
		let style = {
		  "selector": `${selector}`,
		  "style": {
		  	"width": 20,
		  	"height": 20,
		  	"background-color": this.baseInnerColor,
		  	"border-width": this.baseOutlineThickness,
		  	"border-color": this.baseOutlineColor,
		  	"visibility": this.drawBases ? "visible" : "hidden",
		  },
		}
		return style;
	}

	/**
	 * Create general cytoscape style for base names
	 * @param {string} selector - base name selector (default: "node[label]")
	 */
	baseNameCyStyle(selector="node[label]") {
		let style = {
    	"selector": `${selector}`,
    	"style": {
      	"label": "data(label)",
				"text-valign": "center",
      	"text-halign": "center",
				"color": this.baseNameColor,
    	}
		}
		return style;
	}

	/**
	 * Create general cytoscape style for backbone
	 * @param {string} selector - backbone selector (default: "edge.backbone")
	 */
	backboneCyStyle(selector="edge.bacbone") {
		let style = {
    	"selector": `${selector}`,
			"style": {
				"line-color": this.backboneColor,
				"width": this.backboneThickness,
				"visibility": this.drawBackbone? "visible" : "hidden",
			}
		}
		return style;
	}

	/**
	 * Create general cytoscape style forbasepair 
	 * @param {string} selector - basepair selector (default: "edge.basepair")
	 */
	bpCyStyle(selector="edge.bacbone") {
		let style = {
    	"selector": `${selector}`,
			"style": {
				"line-color": this.bpColor,
				"width": this.bpThickness,
			}
		}
		return style;
	}
}


/**
 * Special configuration for RNApuzzler
 * @class
 * @private
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
