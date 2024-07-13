// Cytoscape related function
import _ from "lodash";

/**
 * Return cytoscape id for given object, base, basepair, backbone etc
 */
export function	getCyId(obj) {
	// user defined id
	if (! _.isUndefined(obj.id)) {
		return obj.id;
	}

	if (_.isUndefined(obj.ind)) {
		throw new Error("Object index in undefined");
	}
	
	let res = [];
	// Object (multi) RNA group
	if (obj.group.getName() !== null) {
		res.push(obj.group.getName());
	}
	// Object type
	res.push(obj.name);
	// Object index	
	if (obj.ind !== null) {
		res.push(obj.ind);
	}
	return res.join("_");
}
