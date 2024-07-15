import _ from 'lodash';
import cytoscape from 'cytoscape';
import pack from 'pack';
import { RNA, RNASuper } from "../models/RNA";
import { getCyId } from "../utils/cy";
import { AuxBP } from "../models/modelBP";
import { VARNAConfig } from "../models/config";
import { toFactor } from '../utils/factor';
import { BaseClass, mix } from '../utils/mixin';

/**
 * Panel superclass for multiple inheritance
 */
export const PanelSuper = (superclass) => class extends superclass {
	name = null;
	rnaList = [];
	rnaLimit = null;
	cfg = new VARNAConfig();
	auxBPs = [];
	cy = null;

	/**
	 * Set object name
	 * @param {string} name - object name
	 */
	setName(name) {
		this.name = name;
	}

	/**
	 * Get object name
	 */
	getName(name) {
		if (this.name === null) {
			return null
		}
		return this.name;
	}

	/**
	 * Add RNA into draw
	 * @param {RNA} rna - RNA to add
	 */
	addRNA(rna) {
		if (!(rna instanceof RNA)) {
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
		rna.group = this;
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
	 * Get parent node position of given RNA
	 * @param {RNA|int} rna - RNA or index of interest
	 */
	getPosOfRNA(rna) {
		let ind;
		if (Number.isInteger(rna)) {
			ind = rna;
		} else if (rna instanceof RNA) {
		  ind = this.rnaList.indexOf(rna);
		} else {
			throw new Error("Input should be either an integer or an instance of RNA");
		}

		// Note: this could be undefined
		return this.positions[ind];
	}

	/**
	 * Add basepair interaction between two RNAs
	 * @param {ModelBase} basei - base i in ModelBase
	 * @param {ModelBase} basej - base j in ModelBase
	 * @param {Object} opt - options to create ModelBP
	 */
	addBPAux(basei, basej, opt={}) {
		let mbp = new AuxBP(basei, basej, opt);
		mbp.group = this;
		this.auxBPs.push(mbp);
	}

	elOfAuxBPs() {
		let res = [];
		for (let i = 0; i < this.auxBPs.length; i++) {
			let bp = this.auxBPs[i];
			bp.ind = i;
			let bpEl = bp.toCyEl();
			bpEl.classes.push("auxbp");
			res.push(bpEl);
		}
		return res;
	}


	/**
	 * Returns cytoscape elements and styles of all RNAs
	 */
	createCyFormat() {
		let res = {'elements': [], 'style': []};
		this.rnaList.forEach((rna) => {
			let dist = rna.createCyFormat();
			res.elements.push(...dist.elements);
			res.style.push(...dist.style);
		});	
		res.elements.push(...this.elOfAuxBPs());
		return res;
	}

	// TODO: Implement a more sophistic one
	/**
	* Compute each RNA position using simple rectangle packing algorithm with pack (npm)
	*/
	packRNAs() {
		let padding = this.cfg.groupRNAPadding;
		let margin = this.cfg.groupRNAMargin;
		let dist = 2 * (padding + margin);
		let rnaSizes = this.rnaList.map((rna) => {
			let box = rna.getBoundingBox().getSize();
			return [box.w + dist, box.h + dist];
		})
		// minus y because of cytoscape y axis direction
		this.positions = pack(rnaSizes).boxes.map((pos) => ({x: pos.position[0] + margin, y: - pos.position[1] - margin}));
	}
 
	/**
	 * Create cytoscape object
	 */
	draw(container) {
		let cyDist = {
			'container': container,
			'layout': {'name': 'preset'},
			'elements': [],
			'style': [...this.cfg.generalCyStyle()],
		}
		let t = this.createCyFormat();
		cyDist.elements.push(...t.elements);
		cyDist.style.push(...t.style);
		var cy = cytoscape(cyDist);
		this.cy = cy;
		if (this.rnaList.length > 1) {
			// Shift each RNA to their position
			if (this.cfg.autoGroupPos) {
				this.packRNAs();
			}
			let groups = this.cy.nodes('.groupRNA');
			for (let i = 0; i < groups.length; i++) {
				let end = this.getPosOfRNA(i);
				// no shift
				if (_.isUndefined(end)) {
					continue;
				}
				let bbox = this.rnaList[i].getBoundingBox();
				// we need this pos to be moved to rectangle packer result
				let start = {
					x: bbox.xMin - this.cfg.groupRNAPadding,
					y: bbox.yMax + this.cfg.groupRNAPadding,
				};
				groups[i].shift(toFactor(start, end));
			}
			this.cy.fit();
		}
	}
}

/**
 * General Draw Panel class
 */
export class Panel extends mix(BaseClass).with(PanelSuper) {}
