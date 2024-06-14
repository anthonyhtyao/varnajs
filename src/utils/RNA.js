// RNA related helper functions
//
//

const OPENING = "([{<ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CLOSING = ")]}>abcdefghijklmnopqrstuvwxyz";

// TODO: Add check for well balanced dbn
/**
 * Convert a given dbn to ptable format (0-index)
 * Unlike ViennaRNA the first element is not the length
 * All non-bracket charackters are treated as unpaired
 * @param {string} dbn - secondary structure in dbn
 * @return {Array} ptable
 */
export function ptableFromDBN(dbn) {
	let ptable = new Array(dbn.length).fill(-1);
	let stack = {}
	
	for (let i = 0; i < dbn.length; i++) {
		let c = dbn[i];
		let openIdx = OPENING.indexOf(c);
		let closeIdx = CLOSING.indexOf(c);
		if (openIdx >= 0) {
			// Opening bracket
			if (!(c in stack)) {
				stack[c] = [];
			}
			stack[c].push(i);
		} else if (closeIdx >= 0) {
			// Closing bracket
			let c2 = OPENING[closeIdx];
			let j = stack[c2].pop();
			ptable[i] = j;
			ptable[j] = i;
		} else {
			// pass
		}
	}
	return ptable;

}
