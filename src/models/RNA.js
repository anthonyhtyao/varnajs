import _ from "lodash";

import { ModelBase, ModelBaseStyle } from './modelBase';
import { ModelBP } from './modelBP';
import { drawBases } from '../layouts/layout';
import { Layouts, VARNAConfig } from './config';
import { ptableFromDBN, parseSeq } from '../utils/RNA';
import { DiscontinuousBackbone } from './modelBackbone';
import { BoundingBox } from '../utils/model';
import { getCyId } from '../utils/cy';

const DBNStrandSep = "&";
const BaseRadius = 10;

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
 * Basic class to draw one RNA
 * @class
 * @constructor
 * @public
 * @property {cytoscape} cy - cytoscape drawing
 * @property {Array} baseList - Array of ModelBase
 */
export class RNA {
	name = null;
	cy;
	cfg;
	baseList = [];
	auxBPs = [];
	baseStyleList = [];
	constructor() {
	}

	// TODO: Refactor as VARNA
	/**
	 * Construct from given dbn and seq. At most one can be empty
	 * @param {string} dbn - secondary structure in dbn
	 * @param {string} seq - RNA sequence
	 */
	static fromDBN(dbn, seq) {
		if ((dbn.length == 0) && (seq.length == 0)) {
			throw new Error("At least one should be non-null!");
		}
		let rna = new this();
		let seqTmp = (seq.length == 0)? [] : parseSeq(seq);
		let sepPosLst = [];
		let dbnFinal = ""
		let seqFinal = [];
		if (dbn.length == 0) {
			dbnFinal = ".".repeat(seqTmp.length);
			seqFinal = seqTmp;
		} else {
			// Parse strands if dbn is given
			for (let i = 0; i < dbn.length; i++) {
				let c = dbn[i];
				if (c == DBNStrandSep && (seqTmp.length == 0 || seqTmp[i] == DBNStrandSep)) {
					// Find separator at both dbn and seq, or seq is empty
					sepPosLst.push(seqFinal.length - 1);
				} else {
					// Usual structural position, or separator unmatch
					seqFinal.push((_.isUndefined(seqTmp[i])) ? "" : seqTmp[i]);
					dbnFinal += c;
				}
			}
			// Add unpaired bases if sequence is longer
			for (let i = dbn.length; i < seqTmp.length; i++) {
				dbnFinal += ".";
			}
		}
		let ptable = ptableFromDBN(dbnFinal);
		// Fill baseList
		rna.baseList = new Array(ptable.length);
		for (let i = 0; i < ptable.length; i++) {
			let base = new ModelBase(i, i+1, seqFinal[i], rna);
			// Next base belongs to another strand:w
			//
			if (sepPosLst.indexOf(i) >= 0) {
				base.setBackbone(DiscontinuousBackbone);
			}
			rna.baseList[i] = base;
		}
		// Fill basepair
		for (let i = 0; i < ptable.length; i++) {
			let j = ptable[i];
			if ((j == -1) || (j < i)) {
				continue;
			} else if (dbnFinal[i] == '(') {
				rna.addBPNow(i, j);
			} else {
				rna.addBPAux(i, j);
			}
		}
		return rna;
	}


	/**
	 * Set drawing configuration
	 * @param {VARNAConfig} cfg - configuration to draw
	 */
	setConfig(cfg) {
		if (! cfg instanceof VARNAConfig) {
			throw new Error(`${cfg} is not an instance of VARNAConfig`)
		}
		this.cfg = cfg;
	}

	getSelector(inst) {
		if (this.name === null) {
			return inst;
		}
		let instNew = inst;
		["node", "edge"].forEach((t) => {
			if (inst.startsWith(t)) {
				instNew = inst.replace(t, `${t}.${this.name}`);
			}
		});
		return instNew;
	}

	getCyId(id, type) {
		let newId = (this.name === null) ? [] : [`${this.name}`];
		switch (type) {
			case "base":
				// newId += "";
				break;
			case "backbone":
				newId.push("backbone");
				break;
			case "planar":
				newId.push("planarbp");
				break;
			case "aux":
				newId.push("auxbp");
				break;
			case "parent":
				newId.push("parent");
				break;
			default:
				throw new Error(`Unknown type: ${type}`);
		}
		if (id !== null) {
			newId.push(id);
		}
		return newId.join("_");
	}

	/*
	 * Get BaseModel of base
	 * Directly return if base is already an instance of BaseModel
	 * @param {int|BaseModel} base - either index in baseList or BaseModel
	 */
	getBase(base) {
		if (Number.isInteger(base)) {
			if (base >= this.baseList.length) {
			throw new Error(`${base} is larger than total amount of bases minus one`)
			}
			return this.baseList[base];
		} else if (base instanceof ModelBase) {
			return base;
		} else {
			throw new Error(`${base} is not an integer or an instance of ModelBase.`);
		}
	}
	/**
	 * Add additional basepair (i, j)
	 * The function check whether (i, j) fit planar unless the flag noplanar is set
	 *
	 * @param {int|ModelBase} i - index of ModelBase object of i
	 * @param {int|ModelBase} j - index of ModelBase object of j
	 */
	addBP(i, j, opt={}) {
		let basei = this.getBase(i), basej = this.getBase(j);
		// Create ModelBP object for basepair
		let mbp = new ModelBP(basei, basej, opt);
		let indi, indj;
		[indi, indj] = [Math.min(basei.ind, basej.ind), Math.max(basei.ind, basej.ind)]
		// Add directly to aux
		if (mbp.noplanar) {
			this.addBPAux(basei, basej, mbp);
			return;
		} else {
			// Here, we test if basepair (i, j) fit to planar
			for (let indk = indi; indk <= indj; indk++) {
				let tmp = this.baseList[indk];
				let indl = tmp.getPartnerInd();
				if (indl != -1) {
					if ((indl <= indi) || (indl >= indj)) {
						// Violate planar
						this.addBPAux(basei, basej, mbp);
						return;
					}
				}
			}
			this.addBPNow(basei, basej, mbp);
		}
	}

	/**
	 * Add aux basepair (i, j)
	 * @param {int|ModelBase} i - 
	 */
	addBPAux(i, j, mbp=null) {
		let basei = this.getBase(i), basej = this.getBase(j);
		if (mbp === null) {
			mbp = new ModelBP(basei, basej);
		}
		this.auxBPs.push(mbp);
	}


	addBPNow(i, j, mbp=null) {
		let basei = this.getBase(i), basej = this.getBase(j);
		if (mbp === null) {
			mbp = new ModelBP(basei, basej);
		}
		basei.setBP(mbp);
		basej.setBP(mbp);
	}

	/**
	 * Apply base style to given bases
	 * The function assigns a number (the order) to given ModelBaseStyle object
	 * Bases will be grouped with class `basegroup${number}`
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

	/***************/
	/*    Bases    */
	/***************/

	/**
	 * Return bases to draw in cytoscape format
	 */
	cyOfBases() {
		let elements = this.elOfBases();
		let styles = this.styleOfBases();
		return {"el": elements, "style": styles};
	}

	/**
	 * Returns bases in cytoscape node element list
	 */
	elOfBases() {
		let res = [];
		let parent = null;
		// Create compound node if needed
		if (this.cfg.drawParentNode) {
			parent = {
				data: {
					id: getCyId(this.name, null, "parent"),
				},
				classes: ["parentNode"],
			}
			res.push(parent);
		}
		
		for (let i = 0; i < this.baseList.length; ++i) {
			let base = this.baseList[i];
			let baseEl = base.toCyEl(isNumberDrawn(base, this.cfg.baseNumPeriod, this.baseList.length));
			if (parent !== null) {
				baseEl.data.parent = parent.data.id;
			}
			res.push(baseEl);
		}
		return res;
	}

	/**
	 * Returns base style in cytoscape style
	 */
	styleOfBases() {
		let cfg = this.cfg;
		// Default style for all bases
		let generalStyle = cfg.baseCyStyle(this.getSelector("node"));
		// Default style for base label
		let baseNameStyle = cfg.baseNameCyStyle(this.getSelector("node[label]"));
		let res = [generalStyle, baseNameStyle];
		// Specific base style
		this.baseStyleList.forEach((basestyle) => 
			res.push(...basestyle.toCyStyleInList(this.getSelector(`node.basegroup${basestyle.getId()}`)))
		);
		return res;
	}

	/***************/
	/* Base Number */
	/***************/

	/**
	 * Return base number to draw in cytoscape format
	 */
	cyOfBaseNum() {
		let cfg = this.cfg;

		return [{
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
    }];
	}

	/***************/
	/*  Backbone   */
	/***************/

	/**
	 * Return backbones to draw in cytoscape format
	 */
	cyOfBackbones() {
		let elements = this.elOfBackbones();
		let styles = this.styleOfBackbones();
		return {"el": elements, "style": styles};
	}

	// TODO: custom backbone style
	/**
	 * Returns backbone in cytoscape edge element list with classes set to backbone
	 */
	elOfBackbones() {
		let res = [];
		for (let i = 0; i < this.baseList.length - 1; ++i) {
			let backbone = this.baseList[i].getBackbone();
			if (backbone != DiscontinuousBackbone) {
				let el = {
					"data": {
						id: getCyId(this.name, i, 'backbone'),
						source: getCyId(this.name, i, 'base'),
						target: getCyId(this.name, i+1, 'base')
					},
					"classes": ["backbone"]
				};
				if (this.name !== null) {
					el.classes.push(this.name);
				}
				res.push(el);
			}
		}
		return res;
	}

	/**
	 * Return backbone style in cytoscape format
	 */
	styleOfBackbones() {
		let cfg = this.cfg;
		let res = [];
		let generalStyle = cfg.backboneCyStyle(this.getSelector("edge.backbone"));
		res.push(generalStyle);
		return res;
	}

	/***************/
	/*     BPs     */
	/***************/

	/**
	 * Return basepair to draw in cytoscape format
	 */
	cyOfBPs() {
		let cfg = this.cfg;
		let elements = [...this.elOfPlanarBPs(), ...this.elOfAuxBPs()];
		let styles = this.styleOfBPs();
		return {"el": elements, "style": styles};
	}


	/**
	 * Returns cytoscape edge element for one single bp
	 */
	elOfSingleBP(bp) {
		let edgeEl = bp.toCyEl();
		if (this.name !== null) {
			edgeEl.classes.push(this.name);
		}
		return edgeEl;
	}

	/**
	 * Returns planar basepair in cytoscape edge element list with classes set to basepair and planarbp
	 */
	elOfPlanarBPs() {
		let cfg = this.cfg;
		let res = [];
		// Nested bp
		for (const base of this.baseList) {
			let j = base.getPartnerInd();
			if (j > base.ind) {
				let bp = base.getBP();
				let edgeEl = this.elOfSingleBP(bp);
				edgeEl.data.id = getCyId(this.name, base.ind, "planar");
				edgeEl.classes.push("planarbp");
				if (cfg.layout == Layouts.LINE) {
					if (_.isUndefined(edgeEl.style)) {
						edgeEl.style = {};
					}
					let factor = (cfg.bpLowerPlane) ? 1 : -1;
					edgeEl.style["control-point-distance"] = factor * bp.vIncrement(cfg.bpIncrement);  
				}
				res.push(edgeEl);
			}
		}
		return res;
	}

	/**
	 * Returns aux basepair in cytoscape edge element list with classes set to basepair and auxbp
	 */
	elOfAuxBPs() {
		let cfg = this.cfg;
		let res = [];
		for (let i = 0; i < this.auxBPs.length; i++) {
			let bp = this.auxBPs[i];
			let edgeEl = this.elOfSingleBP(bp);
			edgeEl.data.id = getCyId(this.name, i, "aux");
			edgeEl.classes.push("auxbp");
			if (cfg.layout == Layouts.LINE) {
				if (_.isUndefined(edgeEl.style)) {
					edgeEl.style = {};
				}
				let factor = (cfg.bpLowerPlane) ? 1 : -1;
				edgeEl.style["control-point-distance"] = factor * bp.vIncrement(cfg.bpIncrement);
			}
			res.push(edgeEl);
		}
		return res;
	}

	/**
	 * Return basepair style in cytoscape format
	 */
	styleOfBPs() {
		let cfg = this.cfg;
		let res = [];
		let generalStyle = cfg.bpCyStyle(this.getSelector("edge.basepair"));
		res.push(generalStyle);
		return res;
	}


	customStyle() {
		return [];
	}
	

	createCyFormat() {
		let cfg = this.cfg;
		var coords = drawBases(this.baseList, cfg);

		let basesCy = this.cyOfBases();
		let backbonesCy = this.cyOfBackbones();
		let bpsCy= this.cyOfBPs();

		let elements = [...basesCy.el, ...backbonesCy.el, ...bpsCy.el];
		let styles = [...basesCy.style, ...backbonesCy.style, ...bpsCy.style, ...this.customStyle()];
		
		// Set layout (base position)
		let layoutDict = {'name': 'preset'};
		let cyDist = {
  	  elements: elements,
			layout: layoutDict,
			style: styles
  	 };
		return cyDist;	
	}

	/**
	 * Return RNA drawing bounding box
	 * Make sure each base coords is computed in prior
	 */
	getBoundingBox() {
		let r = BaseRadius;
		let c = this.baseList[0].getCoords();
		let bbox = new BoundingBox(c.x - r, c.x + r, c.y - r, c.y + r);
		this.baseList.forEach((base) => bbox.updateFromCoords(base.getCoords(), r));
		return bbox;
	}
}

/**
 * Return true to show number of given base
 * @private
 *
 * @param {ModelBase} mb - base in ModelBase
 * @param {int} period - base number period
 * @param {int} total - total base number
 */
function isNumberDrawn(mb, period, total) {
	if ((period <= 0) || (mb.getBaseNum() === null)) {
		return false;
	}
	return (mb.ind == 0) || (mb.getBaseNum() % period == 0) || (mb.ind == total -1);
}

