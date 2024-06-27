import { drawRadiate } from './radiate';
import { drawNAView } from './naview/naview';
import { drawLine } from './line';
import { drawCircle } from './circle';
import { drawTurtle } from './turtle/turtle';
import { drawPuzzler } from './turtle/puzzler';


let layouts = {'line': drawLine,
							 'circle': drawCircle,
							 'radiate': drawRadiate,
	             'naview': drawNAView,
							 'turtle': drawTurtle,
							 'puzzler': drawPuzzler,
							};

const layoutNames = Object.keys(layouts);


let drawBases = function(baseList, varnaCfg) {
	let layout = varnaCfg.layout;
	if (layoutNames.includes(layout)) {
		let coords = layouts[layout](baseList, varnaCfg);
		for (let i = 0; i < baseList.length; i++) {
			baseList[i].setCoords(coords[i]);
		}
		return coords;
	} else {
		throw new Error("Invaled layout");
	}
}


export {drawBases};