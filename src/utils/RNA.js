// RNA related helper functions
//
//
import _ from "lodash";

const OPENING = "([{<ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CLOSING = ")]}>abcdefghijklmnopqrstuvwxyz";
export const DBNStrandSep = "&";

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

/**
 * Convert RNA sequence into list
 */
export function parseSeq(seq) {
	let analyzedSeq = [];
	let i = 0;
	while (i < seq.length) {
		if (seq[i] == '{') {
			let found = false;
			let buf = "";
			i++;
			while (!found && (i < seq.length)) {
				if (seq[i] != '}') {
					buf += seq[i];
					i++;
				} else {
					found = true
				}
			}
			analyzedSeq.push(buf);
		} else {
			analyzedSeq.push(seq[i]);
		}
		i++;
	}
	return analyzedSeq;
}

/**
 * Get indices where separator presents
 */
export function getSepPos(dbn) {
	return _.filter(_.range(dbn.length), (i) => dbn[i] === DBNStrandSep);
}
