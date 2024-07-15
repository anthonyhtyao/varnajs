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


	/**
	 * Returns object in cytoscape element format
	 * @abstract
	 */
	toCyEl() {
		throw new Error("Method 'toCyEl' must be implemented.");
	}
}

export class ModelGroupRNA extends ModelDefault {
	name = "group";
	ind = null;
	constructor(rna) {
		super();
		this.group = rna;
	}

	toCyEl() {
		let el = {
			data: {
				id: this.getId(),
			},
			classes: ["groupRNA"],
		}
		return el;
	}
}
