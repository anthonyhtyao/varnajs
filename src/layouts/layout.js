import { drawRadiate } from './radiate';
import { drawNAView } from './naview/naview';
import { drawLine } from './line';
import { drawCircle } from './circle';


let layouts = {'line': drawLine, 'circle': drawCircle, 'radiate': drawRadiate, 'naview': drawNAView};
const layoutNames = Object.keys(layouts);


let drawBases = function(baseList, layout) {
	if (layoutNames.includes(layout)) {
		console.log("hi");
		return layouts[layout](baseList);
	} else {
		throw new Error("Invaled layout");
	}
}


export {drawBases};
