import cytoscape from 'cytoscape';

import { ModelBase } from './modelBase';

/**
 * Simple dot-bracket notation parser
 * @param {string} dbn - secondary structure in dbn
 * @return {Array} An array of basepairs, each is an array of two integers
 */
let parseDBN = function(dbn){
	let indx = [];
	let bps = [];
	for (let i = 0; i < dbn.length; ++i) {
		if (dbn[i] == "(") {
			indx.push(i);
		} else if (dbn[i] == ")") {
			bps.push([indx.pop(),i]);
		} else {
			//pass;
		}
	}
	return bps;
};

/**
 * Structure is a basic class for RNA
 * @class
 * @constructor
 * @public
 * @property {cytoscape} cy - cytoscape drawing
 * @property {Array} baseList - Array of ModelBase
 */
class Structure {
	cy;
	constructor(dbn) {
		this.baseList = [];
		for (let i = 0; i < dbn.length; ++i) {
			this.baseList.push(new ModelBase(i, i+1));
		}
		const bps = parseDBN(dbn);
		for (const bp of bps) {
			this.baseList[bp[0]].setPartner(bp[1]);
			this.baseList[bp[1]].setPartner(bp[0]);
		}

	}

	/**
	 *	Create cytoscape drawing
	 *	@param {DOM element} container - where to draw cytoscape
	 */
	createCy(container, layout) {
		const elements = [];
		const styles = [];
		for (const base of this.baseList) {
			elements.push({data: {id: base.ind}})
		}
		// Backbone
		for (let i = 0; i < this.baseList.length - 1; ++i) {
			elements.push({data: {id: 'back'+i, source: i, target: i+1}, "classes": "backbone"});
		}
		// Canonical bps
		for (const base of this.baseList) {
			if (base.partner > base.ind) {
				let edgeEl = {"data": {"id": "bp"+base.ind, "source": base.ind, "target": base.partner}, "classes": "cbp"};
				if (layout == "line") {
					edgeEl["style"] = {"control-point-distance": -(base.partner-base.ind)*20};
				}
				elements.push(edgeEl);
			}
		}
		let cbpStyle = {
			"selector": "edge.cbp",
			"style": {
				"line-color": "blue"
			}
		}
		if (layout == "line") {
			cbpStyle["style"]["curve-style"] = "unbundled-bezier";
			cbpStyle["style"]["control-point-weight"] = 0.5;
		}
		styles.push(cbpStyle);
		console.log(styles);

		// Set layout (base position)
		let layoutDict = {};
		if (layout == 'circle') {
			layoutDict = {'name': 'circle'};
		} else if (layout == 'line') {
			layoutDict = {'name': 'grid', 'rows': 1};
		} else {
			layoutDict = {};
		}
  	var cy = cytoscape({
  		container: container,
  	  elements: elements,
			layout: layoutDict,
			style: styles
  	 });
		this.cy = cy;
	}
}

export {Structure};
