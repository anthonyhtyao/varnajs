import { Structure } from './models/RNA';

/**
 * Basic RNA draw function
 *
 * @param {string} dbn - RNA in dot-bracket notation (dbn)
 * @param {Element} container - HTML element to draw RNA
 * @param {string} layout - layout of RNA bases
 */
let drawRNA = function (dbn, container, layout='circle') {
	console.log(dbn);
	let v = new Structure(dbn);

	v.createCy(container, layout);
}

export {drawRNA};
