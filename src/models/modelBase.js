
/**
 * ModelBase represents one base in RNA
 * @class
 * @constructor
 * @public
 * @property {int} ind - index of base in baseList
 * @property {int} realInd - real index of base to show
 * @property {int} partner - index of canonical bp partner, -1 means unpaired
 */
class ModelBase {
	partner = -1;
	constructor(ind, realInd) {
		this.ind = ind;
		this.realInd = realInd;
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
}


export {ModelBase};
