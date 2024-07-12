import { RNA } from "../models/RNA";
import { getCyId } from "../utils/cy";
import { ModelBP } from "../models/modelBP";

/**
 * Genreal Multi RNA Draw class
 */
export class MultiDraw {
	rnaList = [];
	rnaLimit = null;
	auxBPs = [];
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
		if (rna.name === null) {
			rna.name = `RNA${this.getRNACount()}`;
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
	 * Compute position of each RNA
	 * @param {RNA} rna - RNA of interest
	 */
	positionOfRNA(RNA) {
		return {x: 0, y: 0};
	}

	/**
	 * Add basepair interaction between two RNAs
	 * @param {ModelBase} basei - base i in ModelBase
	 * @param {ModelBase} basej - base j in ModelBase
	 * @param {Object} opt - options to create ModelBP
	 */
	addInterBP(basei, basej, opt={}) {
		let mbp = new ModelBP(basei, basej, opt);
		this.auxBPs.push(mbp);
	}

	elOfInterBPs() {
		let res = [];
		for (let i = 0; i < this.auxBPs.length; i++) {
			let bp = this.auxBPs[i];
			let bpEl = bp.toCyEl();
			bpEl.data.id = getCyId(null, i, "aux");
			bpEl.classes.push("auxbp");
			res.push(bpEl);
		}
		return res;
	}


	/**
	 * @abstract
	 */
	createCy(container) {
		throw new Error("Method 'createCy(container)' must be implemented.");
	}
}
