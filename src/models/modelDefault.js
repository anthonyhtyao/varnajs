// Default model object used in varnajs
// The object defines basic property for base, basepair etc

import { getCyId } from '../utils/cy';

export class ModelDefault {
	name = "default";
	group = null;

	/**
	 * Define base id
	 * @param {string} id - base id
	 */
	setId(id) {
		this.id = id;
	}

	/**
	 * Get base id
	 * returns default id if base id is undefined
	 */
	getId() {
		return getCyId(this);
	}
}

export class ModelParent extends ModelDefault {
	name = "parent";
	ind = null;
	constructor(rna) {
		super();
		this.group = rna;
	}
}
