import cytoscape from 'cytoscape';

import { ModelBase } from './modelBase';
import { ModelBP } from './modelBP';
import { drawBases } from '../layouts/layout';
import { Layouts } from './config';
import { ptableFromDBN } from '../utils/RNA';

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
	cfg;
	baseList = [];
	auxBPs = [];
	constructor() {
	}

	// TODO: Refactor as VARNA
	/**
	 * Construct from given dbn and seq. At most one can be null
	 * @param {string|null} dbn - secondary structure in dbn
	 * @param {string|null} seq - RNA sequence
	 */
	static fromDBN(dbn=null, seq=null) {
		let rna = new Structure();
		let ptable;
		if ((dbn === null) && (seq === null)) {
			throw new Error("At least one should be non-null!");
		} else if (dbn === null) {
			ptable = new Array(seq.length).fill(-1);
		} else {
			ptable = ptableFromDBN(dbn);
			if (seq === null) {
				seq = " ".repeat(ptable.length);
			}
		}
		// Fill baseList
		rna.baseList = new Array(ptable.length);
		for (let i = 0; i < ptable.length; i++) {
			rna.baseList[i] = new ModelBase(i, i+1, seq[i]);
		}
		// Fill basepair
		for (let i = 0; i < ptable.length; i++) {
			let j = ptable[i];
			if ((j == -1) || (j < i)) {
				continue;
			} else if (dbn[i] == '(') {
				rna.addBPNow(i, j);
			} else {
				rna.addBPPK(i, j);
			}
		}
		return rna;
	}

	addBPPK(i, j) {
		let basei = this.baseList[i], basej = this.baseList[j];
		this.auxBPs.push(new ModelBP(basei, basej));	
	}

	addBPNow(i, j) {
		let basei = this.baseList[i], basej = this.baseList[j];
		basei.setPartner(basej);
		basej.setPartner(basei);
	}

	/*
	 * Returns bases in cytoscape node element list
	 */
	basesToEl() {
		let res = [];
		for (let i = 0; i < this.baseList.length; ++i) {
			let base = this.baseList[i];
			let baseEl = {data: {id: base.ind}};
			baseEl['position'] = base.getCoords();
			res.push(baseEl);
		}
		return res;
	}

	// TODO: implement discontinuity
	/*
	 * Returns backbone in cytoscape edge element list with classes set to backbone
	 */
	backboneToEl() {
		let res = [];
		for (let i = 0; i < this.baseList.length - 1; ++i) {
			res.push({data: {id: 'back'+i, source: i, target: i+1}, "classes": "backbone"});
		}
		return res;
	}

	/*
	 * Returns canonical basepair in cytoscape edge element list with classes set to cbp
	 */
	cbpToEl() {
		let cfg = this.cfg;
		let res = [];
		// Nested bp
		for (const base of this.baseList) {
			let j = base.getPartnerInd();
			if (j > base.ind) {
				let edgeEl = {"data": {"id": "cbp"+base.ind, "source": base.ind, "target": j}, "classes": "cbp"};
				if (cfg.layout == Layouts.LINE) {
					edgeEl["style"] = {"control-point-distance": -(j-base.ind)*20};
				}
				res.push(edgeEl);
			}
		}
		for (const bp of this.auxBPs) {
			let edgeEl = {"data": {"id": "cbp"+bp.partner5.ind, "source": bp.partner5.ind, "target": bp.partner3.ind}, "classes": "cbp"};
			if (cfg.layout == Layouts.LINE) {
				edgeEl["style"] = {"control-point-distance": -(bp.partner3.ind-bp.partner5.ind)*20};
			}
			res.push(edgeEl);
		}
		return res;
	}
	/**
	 *	Create cytoscape drawing
	 *	@param {DOM element} container - where to draw cytoscape
	 */
	createCy(container) {
		let cfg = this.cfg;
		let styles = [];
		// Bases
		var coords = drawBases(this.baseList, cfg);
		// if (layout == 'radiate') {
		// 	var coords = drawRadiate(this.baseList);
		// } else if (layout == 'naview') {
		// 	var coords = drawNAView(this.baseList);
		// }
		let baseElLst = this.basesToEl();
		let backboneElLst = this.backboneToEl();
		let cbpElLst = this.cbpToEl();

		let elements = [...baseElLst, ...backboneElLst, ...cbpElLst];

		let baseStyle = {
			"selector": "node",
			"style": {
				"width": 20,
				"height": 20,
				"background-color": cfg.baseInnerColor,
				"border-width": cfg.baseOutlineThickness,
				"border-color": cfg.baseOutlineColor,
				"visibility": cfg.drawBases ? "visible" : "hidden",
			},
		}

		let backboneStyle = {
			"selector": "edge.backbone",
			"style": {
				"line-color": cfg.backboneColor,
				"width": cfg.backboneThickness,
				"visibility": cfg.drawBackbone? "visible" : "hidden",
			}
		}
		
		let cbpStyle = {
			"selector": "edge.cbp",
			"style": {
				"line-color": cfg.bpColor,
				"width": cfg.bpThickness,
			}
		}

		if (cfg.layout == Layouts.LINE) {
			cbpStyle["style"]["curve-style"] = "unbundled-bezier";
			cbpStyle["style"]["control-point-weight"] = 0.5;
		}
		styles.push(baseStyle);
		styles.push(backboneStyle);
		styles.push(cbpStyle);

		// Set layout (base position)
		let layoutDict = {'name': 'preset'};
		let cyDist = {
  		container: container,
  	  elements: elements,
			layout: layoutDict,
			style: styles
  	 };

		var cy = cytoscape(cyDist);
		this.cy = cy;
	}
}


export {Structure};
