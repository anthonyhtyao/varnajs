// Line layout


let drawLine = function (baseList, varnaCfg) {
	var coords = [];
	let spaceBetweenBases = varnaCfg.spaceBetweenBases;
	for (let i = 0; i < baseList.length; i++) {
		coords[i] = {x: i * spaceBetweenBases * 20, y: 0};
	}
	return coords;
}


export {drawLine};
