import cytoscape from 'cytoscape';

let parseDBN = function(dbn){
	let indx = [];
	let bps = [];
	for (let i = 1; i <= dbn.length; ++i) {
		if (dbn[i-1] == "(") {
			indx.push(i);
		} else if (dbn[i-1] == ")") {
			bps.push([indx.pop(),i]);
		} else {
			//pass;
		}
	}
	return bps;
};
let drawRNA = function (dbn, container) {
	console.log(dbn);
	const elements = [];
	for (let i = 1; i <= dbn.length; ++i) {
		elements.push({data: {id: i}})
	}
	// Backbone
	for (let i = 1; i < dbn.length; ++i) {
		elements.push({data: {id: 'back'+i, source: i, target: i+1}});
	}
	const bps = parseDBN(dbn);
	for (let i = 1; i <= bps.length; ++i) {
		elements.push({data: {id: 'bp'+i, source: bps[i-1][0], target: bps[i-1][1]}});
	}
   var cy = cytoscape({
     container: container,
     elements: elements,
	layout: { name: 'circle'}
   });
	return cy;
};

export {drawRNA, parseDBN};
