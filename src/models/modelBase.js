import * as config from './config';

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
export class ModelBase {
	partner = null;
	nested = null;
	coords = {x: null, y: null};
	center = {x: null, y: null};
	style = null;
	constructor(ind, bn, label) {
		this.ind = ind;
		this.realInd = bn;
		this.c = label;
	}

	/**
	 * Set canonical bp partner of base
	 * @param {int} partner - index of partner
	 */
	setPartner(partner) {
		this.partner = partner;
	}

	getPartner() {
		return this.partner;
	}

	getPartnerInd() {
		if (this.partner === null) {
			return -1;
		}
		return this.partner.ind;
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
	baseNameColor = config.BASE_NAME_COLOR_DEFAULT;
	baseInnerColor = config.BASE_INNER_COLOR_DEFAULT;
	baseOutlineColor = config.BASE_OUTLINE_COLOR_DEFAULT;
	baseOutlineThickness = config.BASE_OUTLINE_THICKNESS_DEFAULT;
	baseNumColor = config.BASE_NUMBER_COLOR_DEFAULT;

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
}


