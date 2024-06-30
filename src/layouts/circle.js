let drawCircle = function(baseList, varnaCfg) {
	var coords = [];
	let BASE_RADIUS = 10;
	let spaceBetweenBases = varnaCfg.spaceBetweenBases;
	let l = baseList.length;
	let radius = Math.floor((3 * (l + 1) * BASE_RADIUS) / (2 * Math.PI));
	for (let i = 0; i < l; i++) {
		let angle = -((-(i + 1) * 2 * Math.PI) / (l + 1) - Math.PI / 2);
		coords[i] = {x: radius * Math.cos(angle) * spaceBetweenBases, y: radius * Math.sin(angle) * spaceBetweenBases};
	}
	return coords;
}


export {drawCircle};
