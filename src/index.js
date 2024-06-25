export * from "./models/index";
export * from "./singleDraw/index";
export * from "./multiDraw/index";
import { VARNAConfig } from "./models/config";
import { Structure } from "./singleDraw/structure";

/**
 * Basic RNA draw function
 *
 * @param {string} dbn - RNA in dot-bracket notation (dbn)
 * @param {Element} container - HTML element to draw RNA
 * @param {VARNAConfig} varnaCfg - VARNA configuration to draw
 */
export function drawRNA(container, dbn, seq="", varnaCfg=(new VARNAConfig())) {
	let v = Structure.fromDBN(dbn, seq);
	v.setConfig(varnaCfg);
	v.createCy(container);
	return v;
}

