import cytoscape from 'cytoscape';
import htmlLabel from 'cytoscape-html-label';
htmlLabel( cytoscape );

import { RNA } from "../models/RNA";
import { ModelBP } from "../models/modelBP";


export class Structure extends RNA {


	/**
	 * Create Drawing from ebi basepair interaction json
	 * @param {int} n - RNA length
	 * @param {json} data - basepair interaction produced by FR3D
	 * @param {string} seq - sequence
	 */
	static fromEBIJson(n, data, seq="") {
		let v = super.fromDBN(" ".repeat(n), seq);
	  data["annotations"].forEach((bp) => {
			if (bp['crossing'] == 0) {
			  v.addBPNow(parseInt(bp['seq_id1'], 10) - 1, parseInt(bp['seq_id2'], 10) - 1)
			} else {
				let type = bp["bp"];	
				v.addBP(parseInt(bp['seq_id1'], 10) - 1, parseInt(bp['seq_id2'], 10) - 1, {noplanar: true, stericity: type[0], edge5: type[1], edge3: type[2], color: "green"});
			}
		});
		return v;
	}

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
