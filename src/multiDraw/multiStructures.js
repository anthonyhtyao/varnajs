import cytoscape from 'cytoscape';
import { MultiDraw } from './multiDraw';


export class MultiStructures extends MultiDraw {
	nCols;
	nRows;
	constructor (nCols=null, nRows=null) {
		super();
	 	this.nCols = nCols;
		this.nRows = nRows;
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
		var cy = cytoscape(cyDist);
		this.cy = cy;
	}
}
