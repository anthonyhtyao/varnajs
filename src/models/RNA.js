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
	createCy(container) {
		const elements = [];
		for (const base of this.baseList) {
			elements.push({data: {id: base.ind}})
		}
		// Backbone
		for (let i = 0; i < this.baseList.length - 1; ++i) {
			elements.push({data: {id: 'back'+i, source: i, target: i+1}});
		}
		// Canonical bps
		for (const base of this.baseList) {
			if (base.partner > base.ind) {
				elements.push({data: {id: 'bp'+base.ind, source: base.ind, target: base.partner}, style: { lineColor: "blue" }});
			}
		}
  	 var cy = cytoscape({
  	   container: container,
  	   elements: elements,
		layout: { name: 'circle'}
  	 });
		this.cy = cy;
	}
}

export {Structure};
