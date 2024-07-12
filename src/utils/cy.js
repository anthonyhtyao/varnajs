// Cytoscape related function



export function	getCyId(rnaname, id, type, sep="_") {
	let newId = (rnaname === null) ? [] : [rnaname];
	switch (type) {
		case "base":
			// newId += "";
			break;
		case "backbone":
			newId.push("backbone");
			break;
		case "bp":
			newId.push("basepair");
			break;
		case "planar":
			newId.push("planarbp");
			break;
		case "aux":
			newId.push("auxbp");
			break;
		case "parent":
			newId.push("parent");
			break;
		default:
			throw new Error(`Unknown type: ${type}`);
	}
	if (id !== null) {
		newId.push(id);
	}
	return newId.join(sep);
}
