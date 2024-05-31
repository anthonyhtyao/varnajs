import { Structure } from './models/RNA';

let drawRNA = function (dbn, container, layout='circle') {
	console.log(dbn);
	let v = new Structure(dbn);

	v.createCy(container, layout);
}

export {drawRNA};
