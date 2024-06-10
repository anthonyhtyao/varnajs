import { Structure } from './models/RNA';
import { VARNAConfig } from './models/config';

/**
 * Basic RNA draw function
 *
 * @param {string} dbn - RNA in dot-bracket notation (dbn)
 * @param {Element} container - HTML element to draw RNA
 * @param {string} layout - layout of RNA bases
 */
let drawRNA = function (dbn, container, varnaCfg) {
	console.log(dbn);
	let v = new Structure(dbn);

	v.createCy(container, varnaCfg);
}

export {drawRNA, VARNAConfig};
