import cytoscape from 'cytoscape';
import pack from 'pack';
import { MultiDraw } from './multiDraw';
import { VARNAConfig } from "../models/config";

/**
 * Multi structures configuration extended from default config
 */
export class MultiConfig extends VARNAConfig {
	parentNodePadding=10;
	parentNodeMargin=10;

	constructor (opt={}) {
		super();
		Object.assign(this, opt);
	}
}

export class MultiStructures extends MultiDraw {
	nCols;
	nRows;
	positions = [];
	cfg = new MultiConfig();
	constructor (nCols=null, nRows=null) {
		super();
	 	this.nCols = nCols;
		this.nRows = nRows;
	}

	packRNAs() {
		let padding = this.cfg.parentNodePadding;
		let margin = this.cfg.parentNodeMargin;
		let dist = 2 * (padding + margin);
		let rnaSizes = this.rnaList.map((rna) => {
			let box = rna.getBoundingBox().getSize();
			return [box.w + dist, box.h + dist];
		})
		// minus y because of cytoscape y axis direction
		this.positions = pack(rnaSizes).boxes.map((pos) => ({x: pos.position[0] + margin, y: - pos.position[1] - margin}));
	}

	positionOfRNA(rna) {
		if (this.positions.length < this.rnaList.length) {
			packRNAs();
		}
		return this.positions[this.rnaList.indexOf(rna)];
	}

	createCy(container) {
		let cyDist = {
			'container': container,
			'elements': [],
			'style': [],
			'layout': {'name': 'preset'},
		};
		this.rnaList.forEach((rna) => {
			rna.cfg.drawParentNode = true;
			let dist = rna.createCyFormat();
			cyDist.elements.push(...dist.elements);
			cyDist.style.push(...dist.style);
		});	
		// Parent Node style
		cyDist.style.push({
		  "selector": `.parentNode`,
		  "style": {
		  	"padding": this.cfg.parentNodePadding,
				"background-opacity": 0,
				"border-opacity": 0,
		  },
		});
		this.packRNAs();
		var cy = cytoscape(cyDist);
		this.cy = cy;
		let parents = this.cy.nodes('.parentNode');
		for (let i = 0; i < parents.length; i++) {
			let bbox = this.rnaList[i].getBoundingBox();
			let r = 10;
			// we need this pos to be moved to rectangle packer result
			let pos = {
				x: bbox.xMin - this.cfg.parentNodePadding,
				y: bbox.yMax + this.cfg.parentNodePadding,
			};
			parents[i].shift({x: this.positions[i].x - pos.x, y: this.positions[i].y - pos.y});
		}
		this.cy.fit();
	}
}
