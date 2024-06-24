import cytoscape from 'cytoscape';
import { Layouts } from '../models/config';

export class PlaneCompare {
	rna1;
	rna2;
	constructor (rna1, rna2) {
		this.rna1 = rna1;
		this.rna2 = rna2;
	}

	createCy(container) {
		// Force RNA1 is in upper plane and RNA2 in lower plane
		this.rna1.cfg.set({bpLowerPlane: false, layout: Layouts.LINE});
		this.rna2.cfg.set({bpLowerPlane: true, layout: Layouts.LINE});
		// Set RNA name if not set yet
		if (this.rna1.name === null) {
			this.rna1.name = "rnaupper";
		}
		if (this.rna2.name === null) {
			this.rna2.name = "rnalower";
		}

		let cyBase = this.rna1.createCyFormat();
		cyBase["container"] = container;
		// We only need bp from the second RNA and need to modify source and target
		let rna2BP = this.rna2.cyOfBPs();
		rna2BP.el.forEach((bp) => {
			bp.data.source = bp.data.source.replace(this.rna2.name, this.rna1.name);
			bp.data.target = bp.data.target.replace(this.rna2.name, this.rna1.name);
		});
		cyBase.elements.push(...rna2BP.el);
		cyBase.style.push(...rna2BP.style);

		var cy = cytoscape(cyBase);
		this.cy = cy;
	}
}
