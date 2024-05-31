import { Structure } from './models/RNA';

let drawRNA = function (dbn, container) {
	console.log(dbn);
	let v = new Structure(dbn);

	v.createCy(container);
}

export {drawRNA};
