import cytoscape from 'cytoscape';
import htmlLabel from 'cytoscape-html-label';
htmlLabel( cytoscape );

import { ModelBase, ModelBaseStyle } from './modelBase';
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
	baseStyleList = [];
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
		}
		// Fill baseList
		rna.baseList = new Array(ptable.length);
		for (let i = 0; i < ptable.length; i++) {
			let c = "";
			try {
				c = seq[i];
			} catch (e) {
				c = "";
			}
			rna.baseList[i] = new ModelBase(i, i+1, c);
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
		console.log(rna);
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

	/**
	 * Apply base style to given bases
	 *
	 * @param {ModelBaseStyle} style - base style to apply
	 * @param {ModelBase|int}  bases - bases (could be either ModelBase object or the index in baseList) to apply on
	 */
	applyBasesStyle(style, ...bases) {
		if (style instanceof ModelBaseStyle) {
			// Set style index as its id
			if (bases.length > 0) {
				style.setId(this.baseStyleList.length);
				this.baseStyleList.push(style);
			}
			for (let i = 0; i < bases.length; i++) {
				let element = bases[i];
				let base;
				if (Number.isInteger(element)) {
						base = this.baseList[element];
				} else if (element instanceof ModelBase) {
						base = element;
				} else {
						throw new Error(`${element} is not an instance of int nor ModelBase.`);
				}
				base.setStyle(style);
			};
		} else {
			throw new Error("The style should be an instance of ModelBaseStyle.");
		}
	}

	/**
	 * Returns bases in cytoscape node element list
	 */
	basesToEl() {
		let res = [];
		for (let i = 0; i < this.baseList.length; ++i) {
			let base = this.baseList[i];
			let baseEl = {data: {id: base.ind, label: base.c, num: base.getBaseNum()}}
			baseEl['classes'] = [];
			// Add baseNum class for node to draw base number
			if (isNumberDrawn(base, this.cfg.baseNumPeriod, this.baseList.length)) {
				baseEl["classes"].push("baseNum");
			}
			// Add class for base style
			if (base.style !== null) {
				baseEl["classes"].push(`baseStyle${base.style.getId()}`);
				baseEl["data"]["baseNumColor"] = base.style.baseNumColor;
			}
			baseEl['position'] = base.getCoords();
			res.push(baseEl);
		}
		return res;
	}

	// TODO: implement discontinuity
	/**
	 * Returns backbone in cytoscape edge element list with classes set to backbone
	 */
	backboneToEl() {
		let res = [];
		for (let i = 0; i < this.baseList.length - 1; ++i) {
			res.push({data: {id: 'back'+i, source: i, target: i+1}, "classes": "backbone"});
		}
		return res;
	}

	/**
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

	// TODO: should we hard code all style in node element?	
	/**
	 * Returns base style in cytoscape style
	 */
	baseStyleToCy() {
		let res = [];
		this.baseStyleList.forEach((style) => {
			// For base node
			res.push({
				"selector": `node.baseStyle${style.getId()}`,
				"style": {
					"background-color": style.baseInnerColor,
					"border-width": style.baseOutlineThickness,
					"border-color": style.baseOutlineColor,
				},
			});
			// For base label
			res.push({
    		"selector": `node.baseStyle${style.getId()}[label]`,
    		"style": {
					"color": style.baseNameColor,
				},
			});
		});
		return res;
	}

	/**
	 * Draw base number on cy
	 */
	drawBaseNum() {
		let cy = this.cy;
		let cfg = this.cfg;

		cy.htmlLabel([{
    	query: '.baseNum',
      valign: "center",
      halign: "left",
      valignBox: "center",
      halignBox: "left",
      tpl: function(data) {
				let color;
				if (data.baseNumColor) {
					color = data.baseNumColor;
				} else {
					color = cfg.baseNumColor;
				}
				return `<p style="color: ${color}">${data.num}</p>`;
      }
    }]);
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

		let baseNameStyle = {
    	"selector": "node[label]",
    	"style": {
      	"label": "data(label)",
				"text-valign": "center",
      	"text-halign": "center",
				"color": cfg.baseNameColor,
    	}
  	}

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
		styles.push(baseNameStyle);
		styles.push(backboneStyle);
		styles.push(cbpStyle);
		styles.push(...this.baseStyleToCy());

		
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

		this.drawBaseNum();
		console.log(cy);
	}
}

/**
 * Return true to show number of given base
 *
 * @param {ModelBase} mb - base in ModelBase
 * @param {int} period - base number period
 * @param {int} total - total base number
 */
function isNumberDrawn(mb, period, total) {
	if (period <= 0) {
		return false;
	}
	return (mb.ind == 0) || (mb.getBaseNum() % period == 0) || (mb.ind == total -1);
}

export {Structure};
