
// Here we list all possible label in lower case for each edge
const WatsonCrick_List = ['w', 'wc', 'watson'];
const Hoogsteen_List = ['h', 'hoogsteen'];
const Sugar_List = ['s', 'sugar'];

const EDGE = Object.freeze({
	WC: 'W',
	S:	'S',
	H:  'H'
});

// Here we list all possible stericity in lower case
const Cis_List = ['c', 'cis'];
const Trans_List = ['t', 'trans'];

const STERICITY = Object.freeze({
	C: 'c',
	T: 't',
});

/**
 * Convert edge label to edge type
 * @param {string} label - edge label
 */
function parseEdge(label) {
  let label2 = label.toLowerCase(); 
	if (WatsonCrick_List.indexOf(label2) > -1) {
		return EDGE.WC;
	} else if (Hoogsteen_List.indexOf(label2) > -1) {
		return EDGE.H;
	} else if (Sugar_List.indexOf(label2) > -1) {
		return EDGE.S;
	} else {
		throw new Error(`${label} is not a valid edge label`);
	}
}

/**
 * Convert stericity label to stericity type
 * @param {string} label - stericity label
 */
function parseStericity(label) {
  let label2 = label.toLowerCase(); 
	if (Cis_List.indexOf(label2) > -1) {
		return STERICITY.C;
	} else if (Trans_List.indexOf(label2) > -1) {
		return STERICITY.T;
	} else {
		throw new Error(`${label} is not a valid stericity label`);
	}
}


/**
 * ModelBP represents a basepair
 */
export class ModelBP {
  partner5;
	partner3;
	edge5;
	edge3;
	stericity;
	style=null;
	constructor (part5, part3, edge5=EDGE.WC, edge3=EDGE.WC, stericity=STERICITY.C) {
		this.partner5 = part5;
		this.partner3 = part3;
		this.edge5 = parseEdge(edge5);
		this.edge3 = parseEdge(edge3);
		this.stericity = parseStericity(stericity);
	}

	getType() {
		return `${this.stericity}${this.edge5}${this.edge3}`;
	}
}
