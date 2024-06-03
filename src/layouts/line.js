// Line layout


let drawLine = function (baseList) {
	var coords = [];
	let spaceBetweenBases = 10;
	for (let i = 0; i < baseList.length; i++) {
		coords[i] = {x: i * spaceBetweenBases * 20, y: 0};
	}
	return coords;
}


export {drawLine};
