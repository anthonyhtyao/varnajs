export * from "./models/index";
export * from "./panel/index";
import pack from "pack";
import { VARNAConfig } from "./models/config";
import { Structure } from "./panel/singleDraw";

/**
 * Basic RNA draw function
 *
 * @param {Element} container - HTML element to draw RNA
 * @param {string} dbn - RNA in dot-bracket notation (dbn)
 * @param {string} seq - RNA sequence
 * @param {VARNAConfig} varnaCfg - VARNA configuration to draw
 */
export function drawRNA(container, dbn, seq="", varnaCfg=(new VARNAConfig())) {
	let v = Structure.fromDBN(dbn, seq);
	v.setConfig(varnaCfg);
	v.draw(container);
	return v;
}

