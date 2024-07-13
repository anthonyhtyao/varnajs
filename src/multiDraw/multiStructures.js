import _ from 'lodash';
import cytoscape from 'cytoscape';
import pack from 'pack';
import { RNA } from '../models/RNA';
import { MultiDraw } from './multiDraw';
import { VARNAConfig } from "../models/config";
import { toFactor } from '../utils/factor';

/**
 * Multi structures configuration extended from default config
 */
export class MultiConfig extends VARNAConfig {
	autoGroupPos=true;
	groupNodePadding=10;
	groupNodeMargin=10;

	constructor (opt={}) {
		super();
		Object.assign(this, opt);
	}
}

export class MultiStructures extends MultiDraw {
	positions = [];
	cfg = new MultiConfig();

	// TODO: Implement a more sophistic one
	/**
	 * Compute each RNA position using simple rectangle packing algorithm with pack (npm)
	 */
	packRNAs() {
		let padding = this.cfg.groupNodePadding;
		let margin = this.cfg.groupNodeMargin;
		let dist = 2 * (padding + margin);
		let rnaSizes = this.rnaList.map((rna) => {
			let box = rna.getBoundingBox().getSize();
			return [box.w + dist, box.h + dist];
		})
		// minus y because of cytoscape y axis direction
		this.positions = pack(rnaSizes).boxes.map((pos) => ({x: pos.position[0] + margin, y: - pos.position[1] - margin}));
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

	createCy(container) {
		let cyDist = {
			'container': container,
			'elements': [],
			'style': this.cfg.generalCyStyle(),
			'layout': {'name': 'preset'},
		};
		this.rnaList.forEach((rna) => {
			let dist = rna.createCyFormat();
			cyDist.elements.push(...dist.elements);
			cyDist.style.push(...dist.style);
		});	
		// Group Node style
		cyDist.style.push({
		  "selector": `.groupNode`,
		  "style": {
		  	"padding": this.cfg.groupNodePadding,
				"background-opacity": 0,
				"border-opacity": 0,
		  },
		});
		if (this.cfg.autoGroupPos) {
			this.packRNAs();
		}
		cyDist.elements.push(...this.elOfInterBPs());
		var cy = cytoscape(cyDist);
		this.cy = cy;
		let groups = this.cy.nodes('.groupNode');
		for (let i = 0; i < groups.length; i++) {
			let end = this.getPosOfRNA(i);
			// no shift
			if (_.isUndefined(end)) {
				continue;
			}
			let bbox = this.rnaList[i].getBoundingBox();
			// we need this pos to be moved to rectangle packer result
			let start = {
				x: bbox.xMin - this.cfg.groupNodePadding,
				y: bbox.yMax + this.cfg.groupNodePadding,
			};
			groups[i].shift(toFactor(start, end));
		}
		this.cy.fit();
	}
}
