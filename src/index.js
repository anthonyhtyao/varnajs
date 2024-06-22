export * from "./models/index";
import * as models from "./models/index";

/**
 * Basic RNA draw function
 *
 * @param {string} dbn - RNA in dot-bracket notation (dbn)
 * @param {Element} container - HTML element to draw RNA
 * @param {VARNAConfig} varnaCfg - VARNA configuration to draw
 */
export function drawRNA(dbn, container, varnaCfg, seq="") {
	console.log(dbn);
	let v = models.RNA.fromDBN(dbn, seq=seq);
	v.cfg = varnaCfg;
	v.createCy(container);
	console.log(v);
	return v;
}

