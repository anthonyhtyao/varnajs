// import {BASEPAIR_COLOR_DEFAULT, BASEPAIR_THICKNESS_DEFAULT} from "./config";
import _ from "lodash";
import { ModelDefault } from "./modelDefault";

// Here we list all possible label in lower case for each edge
const WatsonCrick_List = ['w', 'wc', 'watson'];
const Hoogsteen_List = ['h', 'hoogsteen'];
const Sugar_List = ['s', 'sugar'];

const EDGE = Object.freeze({
	WC: 'W',
	S:	'S',
	H:  'H'
});

// Here we list all possible stericity in lower case
const Cis_List = ['c', 'cis'];
const Trans_List = ['t', 'trans'];

const STERICITY = Object.freeze({
	C: 'c',
	T: 't',
});

/**
 * Convert edge label to edge type
 * @private
 * @param {string} label - edge label
 */
function parseEdge(label) {
  let label2 = label.toLowerCase(); 
	if (WatsonCrick_List.indexOf(label2) > -1) {
		return EDGE.WC;
	} else if (Hoogsteen_List.indexOf(label2) > -1) {
		return EDGE.H;
	} else if (Sugar_List.indexOf(label2) > -1) {
		return EDGE.S;
	} else {
		throw new Error(`${label} is not a valid edge label`);
	}
}

/**
 * Convert stericity label to stericity type
 * @private
 * @param {string} label - stericity label
 */
function parseStericity(label) {
  let label2 = label.toLowerCase(); 
	if (Cis_List.indexOf(label2) > -1) {
		return STERICITY.C;
	} else if (Trans_List.indexOf(label2) > -1) {
		return STERICITY.T;
	} else {
		throw new Error(`${label} is not a valid stericity label`);
	}
}


/**
 * ModelBP represents a basepair
 */
export class ModelBP extends ModelDefault {
	name = "basepair";
  partner5;
	partner3;
	edge5 = EDGE.WC;
	edge3 = EDGE.WC;
	stericity = STERICITY.C;
	// Flag to not put in planar layout
	noplanar = false;
	// Style
	// thickness = BASEPAIR_THICKNESS_DEFAULT;
	// color = BASEPAIR_COLOR_DEFAULT;
	thickness = null;
	color = null;
	// ind = null;
	constructor (part5, part3, opt={}, rna=null) {
		super();
		this.partner5 = part5;
		this.partner3 = part3;
		this.group = rna;
		if ("edge5" in opt) {
			this.edge5 = parseEdge(opt.edge5);
		}
		if ("edge3" in opt) {
			this.edge3 = parseEdge(opt.edge3);
		}
		if ("stericity" in opt) {
			this.stericity = parseStericity(opt.stericity);
		}
		if ("noplaner" in opt) {
			this.noplansar = Boolean(opt.noplanar);
		}
		if ("thickness" in opt) {
			this.thickness = parseFloat(opt.thickness);
		}
		if ("color" in opt) {
			this.color = String(opt.color);
		}
	}

	/**
	 * Set color and thickness of basepair
	 * @param {Object} opt - basepair style in {color: xxx, thickness: yyy}. xxx should be a string and yyy is a float
	 */
	setStyle(opt={}) {
		if (("color" in opt) && (opt.color !== null) && (_.isString(opt.color))) {
			this.color = opt.color;
		}
		if (("thickness" in opt) && (opt.thickness !== null)) {
			this.thickness = parseFloat(opt.thickness);
		}
	}

	getType() {
		return `${this.stericity}${this.edge5}${this.edge3}`;
	}

	/**
	 * Return basepair as cytoscape edge element
	 */
	toCyEl() {
		let el = {
			"data": {
				"id": this.getId(),
				"source": this.partner5.getId(),
				"target": this.partner3.getId(),
				"label": this.getType()
			},
			"classes": ["basepair"],
		};
		let style = {};
		if (this.color !== null) {
			style["line-color"] = this.color;
		}
		if (this.thickness !== null) {
			style.width = this.thickness;
		}

		if (! _.isEmpty(style)) {
			el.style = style;
		}
	return el;
	}

	vIncrement(bpIncrement) {
		let coeff = 1;
		if (this.partner3.ind - this.partner5.ind == 1) {
			// We need a negative value due to bezier edge strange behavior for adjacent nodes
			coeff = -2;
		}
		return coeff * bpIncrement * (this.partner3.getCoords().x - this.partner5.getCoords().x);
	}
}

export class AuxBP extends ModelBP {
	name = "aux";
}

export class PlanarBP extends ModelBP {
	name = "planar";
}
