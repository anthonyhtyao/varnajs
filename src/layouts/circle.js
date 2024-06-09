let drawCircle = function(baseList) {
	var coords = [];
	let BASE_RADIUS = 10;
	let spaceBetweenBases = 1;
	let l = baseList.length;
	let radius = Math.round(3 * (l + 1) * BASE_RADIUS) / (2 * Math.PI) * spaceBetweenBases;
	for (let i = 0; i < l; i++) {
		let angle = - (-(i + 1) * 2 * Math.PI) / ((l + 1) - Math.PI / 2);
		coords[i] = {x: radius * Math.cos(angle), y: radius * Math.sin(angle)};
	}
	return coords;
}


export {drawCircle};
