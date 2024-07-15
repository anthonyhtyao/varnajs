import _ from "lodash";
import { VARNAConfig } from "../models/config";
import { ModelBaseStyle } from "../models/modelBase";
import { SingleDraw } from "./singleDraw";


/**
 * Motif configuration extended from default config
 */
export class MotifConfig extends VARNAConfig {
	baseNumPeriod = 0;
	rootBaseStyle = new ModelBaseStyle({baseInnerColor: "#606060", baseOutlineColor: "white"});
	dummyBaseStyle = new ModelBaseStyle({baseInnerColor: "#DDDDDD", baseOutlineColor: "white"});
	rootBPStyle = {color: "black", thickness: 2};
	dummyBPStyle = {color: "#DDDDDD"};
}

/**
 * Motif drawing class
 */
export class Motif extends SingleDraw {
	cfg = new MotifConfig();

	static fromDBN(dbn, seq="") {
		let newSeq = (seq.length == 0) ? "" : seq.split("&").map((x) => " " + x + " ").join("*"); 
		let newdbn = "(";
		let offset = 1;
		// Base number list for new dbn
		let baseNumLst = [null];
		let dummyBPLst = [];
		for (let i = 0; i < dbn.length; i++) {
			if (dbn[i] == '*') {
				newdbn += "(&)";
				dummyBPLst.push([offset + i, offset + i + 1]);
				offset += 1;
				baseNumLst.push(null, null);
			} else {
				newdbn += dbn[i];
				baseNumLst.push(i - offset + 2);
			}
		}
		// Complete the rest
		newdbn += ")";
		baseNumLst.push(null);
		let motif = super.fromDBN(newdbn, newSeq);
		dummyBPLst.push([0, motif.baseList.length - 1]);
		// Set dummy
		_.flatten(dummyBPLst).forEach((i) => motif.baseList[i].addCustomClass("dummy"));
		dummyBPLst.forEach((bp) => motif.baseList[bp[0]].getBP().setStyle(motif.cfg.dummyBPStyle));
		// Set root
		motif.baseList[1].addCustomClass("root");
		motif.baseList[1].getBP().setStyle(motif.cfg.rootBPStyle);
		motif.baseList[motif.baseList.length - 2].addCustomClass("root");
		// Set base number
		_.zip(motif.baseList, baseNumLst).forEach(([base, num]) => base.setBaseNum(num));
		return motif;
	}


	createCyFormat() {
		let res = super.createCyFormat();
		let dummy = this.cfg.dummyBaseStyle.toCyStyleInList(this.getSelector(`node.dummy`));
		let root = this.cfg.rootBaseStyle.toCyStyleInList(this.getSelector(`node.root`));
		res.style.push(...dummy, ...root);
		return res;
	}
}
