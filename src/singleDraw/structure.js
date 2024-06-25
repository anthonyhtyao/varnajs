import cytoscape from 'cytoscape';
import htmlLabel from 'cytoscape-html-label';
htmlLabel( cytoscape );

import { RNA } from "../models/RNA";


export class Structure extends RNA {
	/**
	 *	Create cytoscape drawing
	 *	@param {DOM element} container - where to draw cytoscape
	 */
	createCy(container) {
		let cfg = this.cfg;
		let cyDist = this.createCyFormat();
  	cyDist["container"] = container;

		var cy = cytoscape(cyDist);
		this.cy = cy;

		// HTML label
		let baseNumLabel = this.cyOfBaseNum();
		let htmlLabel = [...baseNumLabel];
		if (htmlLabel.length != 0) {
			cy.htmlLabel([...baseNumLabel]);
		}
	}
}
