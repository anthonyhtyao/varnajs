import { Structure } from './models/RNA';
import { VARNAConfig } from './models/config';

/**
 * Basic RNA draw function
 *
 * @param {string} dbn - RNA in dot-bracket notation (dbn)
 * @param {Element} container - HTML element to draw RNA
 * @param {VARNAConfig} varnaCfg - VARNA configuration to draw
 */
let drawRNA = function (dbn, container, varnaCfg) {
	console.log(dbn);
	let v = Structure.fromDBN(dbn);
	v.cfg = varnaCfg;

	v.createCy(container);
	return v;
}

export {drawRNA, VARNAConfig};
