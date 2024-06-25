import { RNA } from "../models/RNA";

/**
 * Genreal Multi RNA Draw class
 */
export class MultiDraw {
	rnaList = [];
	rnaLimit = null;
	constructor () {
	}

	/**
	 * Add RNA into draw
	 * @param {RNA} rna - RNA to add
	 */
	addRNA(rna) {
		if (! rna instanceof RNA) {
			throw new Error("Input is not an instance of RNA");
		}
		if ((this.rnaLimit !== null) && (this.rnaLimit <= this.rnaList.length)) {
			// RNA limit reached, reject require of adding
			// TODO: add warning
			return -1;
		}
		this.rnaList.push(rna);
		return this.getRNACount() - 1;
	}

	/**
	 * Get RNA in the draw by given index
	 */
	getRNA(ind) {
		return this.rnaList[ind];
	}

	/**
	 * Return RNA number in the draw
	 */
	getRNACount() {
		return this.rnaList.length;
	}

	/**
	 * @abstract
	 */
	createCy(container) {
		throw new Error("Method 'createCy(container)' must be implemented.");
	}
}
