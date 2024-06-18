
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
class ModelBase {
	partner = null;
	nested = null;
	coords = {x: null, y: null};
	center = {x: null, y: null};
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
}


export {ModelBase};
