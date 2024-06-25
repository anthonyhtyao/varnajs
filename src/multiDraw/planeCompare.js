import cytoscape from 'cytoscape';
import { Layouts } from '../models/config';
import { MultiDraw } from './multiDraw';

export class PlaneCompare extends MultiDraw {
	rnaLimit = 2;
	constructor (rna1, rna2) {
		super();
		this.addRNA(rna1);
		this.addRNA(rna2);
	}

	createCy(container) {
		let rna1 = this.getRNA(0);
		let rna2 = this.getRNA(1);
		// Force RNA1 is in upper plane and RNA2 in lower plane
		rna1.cfg.set({bpLowerPlane: false, layout: Layouts.LINE});
		rna2.cfg.set({bpLowerPlane: true, layout: Layouts.LINE});
		// Set RNA name if not set yet
		if (rna1.name === null) {
			rna1.name = "rnaupper";
		}
		if (rna2.name === null) {
			rna2.name = "rnalower";
		}

		let cyBase = rna1.createCyFormat();
		cyBase["container"] = container;
		// We only need bp from the second RNA and need to modify source and target
		let rna2BP = rna2.cyOfBPs();
		rna2BP.el.forEach((bp) => {
			bp.data.source = bp.data.source.replace(rna2.name, rna1.name);
			bp.data.target = bp.data.target.replace(rna2.name, rna1.name);
		});
		cyBase.elements.push(...rna2BP.el);
		cyBase.style.push(...rna2BP.style);

		var cy = cytoscape(cyBase);
		this.cy = cy;
	}
}
