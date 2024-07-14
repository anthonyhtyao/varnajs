import cytoscape from 'cytoscape';
import { Layouts } from '../models/config';
import { MultiDraw } from './multiDraw';
import { drawBases } from '../layouts/layout';

export class PlaneCompare extends MultiDraw {
	rnaLimit = 2;
	constructor (rna1, rna2) {
		super();
		// Set RNA name if not set yet
		if (rna1.name === null) {
			rna1.name = "rnaupper";
		}
		if (rna2.name === null) {
			rna2.name = "rnalower";
		}
		this.addRNA(rna1);
		this.addRNA(rna2);
	}

	createCy(container) {
		let rna1 = this.getRNA(0);
		let rna2 = this.getRNA(1);
		// Force RNA1 is in upper plane and RNA2 in lower plane
		rna1.cfg.set({bpLowerPlane: false, layout: Layouts.LINE});
		rna2.cfg.set({bpLowerPlane: true, layout: Layouts.LINE});

		let cyBase = rna1.createCyFormat();
		cyBase["container"] = container;
		// We only need bp from the second RNA and need to modify source and target
		drawBases(rna2.baseList, rna1.cfg);
		let rna2BP = rna2.cyOfBPs();
		rna2BP.el.forEach((bp) => {
			bp.data.source = bp.data.source.replace(rna2.name, rna1.name);
			bp.data.target = bp.data.target.replace(rna2.name, rna1.name);
		});
		rna2BP.style.forEach((bp) => {
			if (bp.data.layout == Layouts.LINE) { 
			  bp.style["source-endpoint"] = "0 10";
			  bp.style["target-endpoint"] = "0 10";
			  console.log(bp);
			}
		});
		cyBase.elements.push(...rna2BP.el);
		cyBase.style.push(...rna2BP.style);
		// Group Node style
		cyBase.style.push({
		  "selector": `.groupNode`,
		  "style": {
				"background-opacity": 0,
				"border-opacity": 0,
		  },
		});

		var cy = cytoscape(cyBase);
		this.cy = cy;
	}
}
