import cytoscape from 'cytoscape';
import htmlLabel from 'cytoscape-html-label';
htmlLabel( cytoscape );
import { BaseClass, mix } from '../utils/mixin';
import { RNASuper } from "../models/RNA";
import { PanelSuper } from "./panel";
// Here we create a special panel that only takes one RNA by multi inheritance (mixin)

export class SingleDraw extends mix(BaseClass).with(PanelSuper, RNASuper) {
	rnaList = [this];
	rnaLimit = 1;
}



/**
 * Draw a structure
 * @extends SingleDraw
 */
export class Structure extends SingleDraw {

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
	draw(container) {
		super.draw(container);
		// HTML label
		// TODO: drop htmllabel by using cytoscape node for basenum
		let baseNumLabel = this.cyOfBaseNum();
		let htmlLabel = [...baseNumLabel];
		if (htmlLabel.length != 0) {
			this.cy.htmlLabel([...baseNumLabel]);
		}
	}
}
