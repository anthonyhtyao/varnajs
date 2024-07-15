import cytoscape from 'cytoscape';
import { Layouts, VARNAConfig } from '../models/config';
import { Panel } from './panel';
import { drawBases } from '../layouts/layout';

export class PlaneCompare extends Panel {
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

	addBP(basei, basej, opt={}) {
		throw new Error("PlaneCompare object does not support addBP. Use RNA.addBP instead.");
	}

	createCyFormat() {
		let rna1 = this.getRNA(0);
		let rna2 = this.getRNA(1);
		let res = {'elements': [], 'style': []};
		let cyRNA1 = rna1.createCyFormat();
		res.elements.push(...cyRNA1.elements);
		res.style.push(...cyRNA1.style);
		// We only need bp from the second RNA and need to modify source and target
		// Make sure RNA2 bases are same as RNA1
		rna2.baseList.forEach((base, ind) => {
			base.setCoords(rna1.getBase(ind).getCoords());
		});
		let rna2BP = rna2.cyOfBPs();
		rna2BP.el.forEach((bp) => {
			bp.data.source = bp.data.source.replace(rna2.name, rna1.name);
			bp.data.target = bp.data.target.replace(rna2.name, rna1.name);
		});
		res.elements.push(...rna2BP.el);
		res.style.push(...rna2BP.style);
		return res;
	}

	draw(container) {
		let rna1 = this.getRNA(0);
		let rna2 = this.getRNA(1);
		// Force RNA1 is in upper plane and RNA2 in lower plane
		rna1.cfg.set({bpLowerPlane: false, layout: Layouts.LINE});
		rna2.cfg.set({bpLowerPlane: true, layout: Layouts.LINE});
		super.draw(container);
	}
}
