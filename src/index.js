import { Structure } from './models/RNA';
import { VARNAConfig } from './models/config';
import { ModelBaseStyle } from './models/modelBase';

/**
 * Basic RNA draw function
 *
 * @param {string} dbn - RNA in dot-bracket notation (dbn)
 * @param {Element} container - HTML element to draw RNA
 * @param {VARNAConfig} varnaCfg - VARNA configuration to draw
 */
let drawRNA = function (dbn, container, varnaCfg, seq=null) {
	console.log(dbn);
	let v = Structure.fromDBN(dbn, seq=seq);
	v.cfg = varnaCfg;
	let style = new ModelBaseStyle({baseNumColor: "red", baseInnerColor: "green"});
	v.applyBasesStyle(style, 0, 1, 2);
	v.createCy(container);
	return v;
}

export {drawRNA, VARNAConfig};
