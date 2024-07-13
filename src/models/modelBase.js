import _ from "lodash";

import { ModelDefault } from './modelDefault';
import { ModelBP } from './modelBP';
import { ModelBackbone, DefaultBackbone } from './modelBackbone';

/**
 * ModelBase represents one base in RNA
 * @class
 * @constructor
 * @public
 * @property {int} ind - index of base in baseList
 * @property {int} baseNum - base number to show
 * @property {string} c - Character (nucleobase) of base
 * @property {ModelBase} partner - index of canonical bp partner, -1 means unpaired
 * @property {bool|null} nested - true if basepair is nested
 */
export class ModelBase extends ModelDefault {
	name = "base";
	bp = null;
	nested = null;
	coords = {x: null, y: null};
	center = {x: null, y: null};
	style = null;
	backbone = null;
	classes = [];
	constructor(ind, bn, label, rna=null) {
		super();
		this.ind = ind;
		this.realInd = bn;
		this.c = label;
		this.group = rna;
	}


	/**
	 * Set planar basepair
	 * @param {ModelBP} mbp - planar basepair
	 */
	setBP(mbp) {
		this.bp = mbp;
	}

	getBP() {
		return this.bp;
	}

	getPartner() {
		if (this.bp === null) {
			return null;
		} else {
			if (this.bp.partner5 == this) {
				return this.bp.partner3.ind;
			} else {
				return this.bp.partner5.ind;
			}
		}
	}

	getPartnerInd() {
		let ind = this.getPartner();
		if (ind === null) {
			return -1;
		}
		return ind;
	}

	setBaseNum(bn) {
		this.realInd = bn;
	}

	getBaseNum() {
		return this.realInd;
	}

	setCoords(coords) {
		this.coords.x = coords.x;
		this.coords.y = coords.y;
	}

	getCoords(coords) {
		return {x: this.coords.x, y: this.coords.y};
	}


	setStyle(style) {
		this.style = style;
	}

	getStyle() {
		return this.style;
	}

	setBackbone(backbone) {
		if (!(backbone instanceof ModelBackbone)) {
			throw new Error("Input needs to be an instance of ModelBackbone");
		}
		backbone.ind = this.ind;
		backbone.group = this.group;
		this.backbone = backbone;
	}

	getBackbone() {
		// Create default backbone missing
		if (this.backbone === null) {
			this.setBackbone(new DefaultBackbone());
		}
		return this.backbone;
	}

	addCustomClass(inst) {
		this.classes.push(inst);
	}

	toCyEl(withNum) {
		let el = {
			data: {
				id: this.getId(),
				label: this.c,
				num: this.getBaseNum()
			}
		};
		// Set base classes
		el['classes'] = [...this.classes];
		if (this.group.getName() !== null) {
			el['classes'].push(this.group.getName());
		}
		// Add baseNum class for node to draw base number
		if (withNum) {
			el["classes"].push("baseNum");
		}
		// Add class for base style
		if (this.style !== null) {
			el["classes"].push(`basegroup${this.style.getId()}`);
			el["data"]["baseNumColor"] = this.style.baseNumColor;
		}
		el['position'] = this.getCoords();
		return el;
	}
}


/**
 * Class object for base style
 * @class
 * @constructor
 * @public
 * @property {string} baseNameColor        - color of base name (default: rgb(64, 64, 64))
 * @property {string} baseInnerColor       - color to fill base (default: rgb(242, 242, 242))
 * @property {string} baseOutlineColor     - color of base border (default: rgb(91, 91, 91))
 * @property {float}  baseOutlineThickness - base border thickness (default: 1.5)
 * @property {string} baseNumColor         - color of base number (default: rgb(64, 64, 64))
 */
export class ModelBaseStyle {
	id = null;
	baseNameColor = null;
	baseInnerColor = null;
	baseOutlineColor = null;
	baseOutlineThickness = null;
	baseNumColor = null;

	constructor(opt={}) {
		Object.assign(this, opt);
	}

	/**
	 * Set style id
	 */
	setId(id) {
		this.id = id;
	}

	/**
	 * Return style id
	 */
	getId() {
		return this.id;
	}

	/**
	 * Return in cytoscape style format
	 * @param {string} selector - cytoscape selector
	 */
  toCyStyle(selector) {
		let style = {node: {}, label: {}};
		// For base node
		let tmp = {};
		if (this.baseInnerColor !== null) {
		  tmp["background-color"] = this.baseInnerColor;
		}
		if (this.baseOutlineThickness !== null) {
			tmp["border-width"] = this.baseOutlineThickness;
		}
		if (this.baseOutlineColor !== null) {
			tmp["border-color"] = this.baseOutlineColor;
		}
		if (! _.isEmpty(tmp)) {
			style.node = {
				"selector": `${selector}`,
				"style": tmp,
			}
		}
		
		// For base label
		if (this.baseNameColor !== null) {
			style.label = {
	  			"selector": `${selector}[label]`,
	  			"style": {
					"color": this.baseNameColor,
				},
			};
		}
		return style;
	}

	/**
	 * Similar to toCyStyle, but return non empty styles in a list
	 * @param {string} selector - cytoscape selector
	 */
  toCyStyleInList(selector) {
		let lst = Object.values(this.toCyStyle(selector));
		return _.filter(lst, (s) => (! _.isEmpty(s)));
	}
}


