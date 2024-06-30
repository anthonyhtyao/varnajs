// Modified from drawrnajs and VARNA


let drawRadiate = function(baseList, varnaCfg){
  //This function calculates the coordinates for each nucleotide
	//according to the radiate layout
	var coords = [];
	var centers = [];
	var angles = [];
	let dirAngle = -1;
	let spaceBetweenBases = varnaCfg.spaceBetweenBases;
	let BASE_PAIR_DISTANCE = varnaCfg.bpDistance;
	let MULTILOOP_DISTANCE = varnaCfg.backboneMultiLoop;

	for (let i = 0; i < baseList.length; i++) {
		coords[i] = {x: 0, y: 0};
		centers[i] = {x: 0, y: 0};
	}
	console.log(varnaCfg);
	if (varnaCfg.flatExteriorLoop) {
		dirAngle += 1 - Math.PI / 2.0;
		let i = 0;
		let x = 0.0, y = 0.0;
		let vx = - Math.sin(dirAngle), vy = Math.cos(dirAngle);
		while (i < baseList.length) {
			coords[i].x = x;
			coords[i].y = y;
			centers[i].x = x + BASE_PAIR_DISTANCE * vy;
			centers[i].y = y + BASE_PAIR_DISTANCE * vx;
			let j = baseList[i].getPartnerInd();
			if (j > i) {
				drawLoop(i, j, x + (BASE_PAIR_DISTANCE * vx / 2.0), y + (BASE_PAIR_DISTANCE * vy / 2.0),
					dirAngle, coords, centers, angles, baseList, varnaCfg);
				centers[i].x = coords[i].x + BASE_PAIR_DISTANCE * vy;
				centers[i].y = y - BASE_PAIR_DISTANCE * vx;
				i = j;
				x += BASE_PAIR_DISTANCE * vx;
				y += BASE_PAIR_DISTANCE * vy;
				centers[i].x = coords[i].x + BASE_PAIR_DISTANCE * vy;
				centers[i].y = y - BASE_PAIR_DISTANCE * vx;
			}
			x += MULTILOOP_DISTANCE * vx;
			y += MULTILOOP_DISTANCE * vy;
			i += 1;
		}
	} else {
		drawLoop(0, baseList.length - 1, 0, 0, dirAngle, coords, centers, angles, baseList, varnaCfg);
	}

	for (let i = 0; i < coords.length; i++) {
		coords[i].x *= spaceBetweenBases;
		coords[i].y *= spaceBetweenBases;
	}
	return coords;
}

let drawLoop = function(i, j, x, y, dirAngle, coords, centers, angles, baseList, varnaCfg){
	//Calculates loop coordinates
	if (i > j) {
		return;
	}

	let BASE_PAIR_DISTANCE = varnaCfg.bpDistance;
	let LOOP_DISTANCE = varnaCfg.backboneLoop;
	let MULTILOOP_DISTANCE = varnaCfg.backboneMultiLoop;
	let straightBulges = true;
	// BasePaired
	if (baseList[i].getPartnerInd() == j) {
		let normalAngle = Math.PI / 2.0;
		centers[i] = {x: x, y: y};
		centers[j] = {x: x, y: y};
		coords[i].x = (x + BASE_PAIR_DISTANCE * Math.cos(dirAngle - normalAngle) / 2.0);
		coords[i].y = (y + BASE_PAIR_DISTANCE * Math.sin(dirAngle - normalAngle) / 2.0);
		coords[j].x = (x + BASE_PAIR_DISTANCE * Math.cos(dirAngle + normalAngle) / 2.0);
		coords[j].y = (y + BASE_PAIR_DISTANCE * Math.sin(dirAngle + normalAngle) / 2.0);
		drawLoop(i + 1, j - 1, x + LOOP_DISTANCE * Math.cos(dirAngle), y + LOOP_DISTANCE * Math.sin(dirAngle), dirAngle, coords, centers, angles, baseList, varnaCfg);
	} else {
		// Multiloop
		let k = i;
		let basesMultiLoop = [];
		let helices = [];
		let l;
		while (k <= j) {
			l = baseList[k].getPartnerInd();
			if (l > k) {
				basesMultiLoop.push(k);
				basesMultiLoop.push(l);
				helices.push(k);
				k = l + 1;
			} else {
				basesMultiLoop.push(k);
				k++;
			}
		}
		let mlSize = basesMultiLoop.length + 2;
		let numHelices = helices.length + 1;
		let totalLength = MULTILOOP_DISTANCE * (mlSize - numHelices) + BASE_PAIR_DISTANCE * numHelices;
		let multiLoopRadius;
		let angleIncrementML;
		let angleIncrementBP;
		if (mlSize > 3) {
			multiLoopRadius = determineRadius(numHelices, mlSize - numHelices, (totalLength) / (2.0 * Math.PI), BASE_PAIR_DISTANCE, MULTILOOP_DISTANCE);
			angleIncrementML = -2.0 * Math.asin(MULTILOOP_DISTANCE / (2.0 * multiLoopRadius));
			angleIncrementBP = -2.0 * Math.asin(BASE_PAIR_DISTANCE / (2.0 * multiLoopRadius));
		} else {
			multiLoopRadius = 35.0;
			angleIncrementBP = -2.0 * Math.asin(BASE_PAIR_DISTANCE / (2.0 * multiLoopRadius));
			angleIncrementML = (-2.0 * Math.PI - angleIncrementBP) / 2.0;
		}
		let centerDist = Math.sqrt(Math.max(Math.pow(multiLoopRadius, 2) - Math.pow(BASE_PAIR_DISTANCE / 2.0, 2), 0.0)) - LOOP_DISTANCE;
		let mlCenter = {x: x + (centerDist * Math.cos(dirAngle)),
						y: y + (centerDist * Math.sin(dirAngle))}
		// Base directing angle for (multi|hairpin) loop, from the center's
		// perspective
		let baseAngle = dirAngle
				// U-turn
				+ Math.PI
				// Account for already drawn supporting base-pair
				+ 0.5 * angleIncrementBP
				// Base cannot be paired twice, so next base is at
				// "unpaired base distance"
				+ 1.0 * angleIncrementML;

		let currUnpaired = [];
		let currInterval = {el1: 0, el2: baseAngle - 1.0 * angleIncrementML};
		let intervals = [];

		for (k = basesMultiLoop.length - 1; k >= 0; k--) {
			l = basesMultiLoop[k];
			centers[l] = mlCenter;
			let isPaired = (baseList[l].getPartnerInd() != -1);
			let isPaired3 = isPaired && (baseList[l].getPartnerInd() < l);
			let isPaired5 = isPaired && !isPaired3;
			if (isPaired3) {
				if ((numHelices == 2) && straightBulges) {
					baseAngle = dirAngle-angleIncrementBP/2.;
				} else {
					baseAngle = correctHysteresis(baseAngle + angleIncrementBP / 2.) - angleIncrementBP / 2.;
				}
				currInterval.el1 = baseAngle;
				intervals.push({el1: currUnpaired, el2: currInterval});
				currInterval = {el1: -1.0, el2: -1.0};
				currUnpaired = [];
			} else if (isPaired5) {
				currInterval.el2 = baseAngle;
			}	else {
				currUnpaired.push(l);
			}
			angles[l] = baseAngle;
			if (isPaired3) {
				baseAngle += angleIncrementBP;
			} else {
				baseAngle += angleIncrementML;
			}
		}
		currInterval.el1 = dirAngle - Math.PI - 0.5 * angleIncrementBP;
		intervals.push( {el1: currUnpaired, el2: currInterval } );

		for (let z = 0; z < intervals.length; z++) {
			let mina = intervals[z].el2.el1;
			let maxa = normalizeAngle(intervals[z].el2.el2, mina);

			for (let n = 0; n < intervals[z].el1.length; n++){
				let ratio = (1. + n)/(1. + intervals[z].el1.length);
				let b = intervals[z].el1[n];
				angles[b] = mina + (1.-ratio)*(maxa-mina);
			}
		}

		for (k = basesMultiLoop.length - 1; k >= 0; k--) {
			l = basesMultiLoop[k];
			coords[l].x = mlCenter.x + multiLoopRadius * Math.cos(angles[l]);
			coords[l].y = mlCenter.y + multiLoopRadius * Math.sin(angles[l]);
		}

		let newAngle;
		let m, n;
		for (k = 0; k < helices.length; k++) {
			m = helices[k];
			n = baseList[m].getPartnerInd();
			newAngle = (angles[m] + angles[n]) / 2.0;
			drawLoop(m + 1, n - 1, (LOOP_DISTANCE * Math.cos(newAngle)) + (coords[m].x + coords[n].x) / 2.0, 
						(LOOP_DISTANCE * Math.sin(newAngle))
								+ (coords[m].y + coords[n].y) / 2.0, newAngle,
						coords, centers, angles, baseList, varnaCfg);
			}
		}
}

let determineRadius = function(nbHel, nbUnpaired, startRadius, bpdist, multidist) {
	let xmin = bpdist / 2.0;
	let xmax = 3.0 * multidist + 1;
	let x = (xmin + xmax) / 2.0;
	let y = 10000.0;
	let ymin = -1000.0;
	let ymax = 1000.0;
	let numIt = 0;
	let precision = 0.00001;
	while ((Math.abs(y) > precision) && (numIt < 10000)) {
		x = (xmin + xmax) / 2.0;
		y = objFun(nbHel, nbUnpaired, x, bpdist, multidist);
		ymin = objFun(nbHel, nbUnpaired, xmax, bpdist, multidist);
		ymax = objFun(nbHel, nbUnpaired, xmin, bpdist, multidist);
		if (ymin > 0.0) {
			xmax = xmax + (xmax - xmin);
		} else if ((y <= 0.0) && (ymax > 0.0)) {
			xmax = x;
		} else if ((y >= 0.0) && (ymin < 0.0)) {
			xmin = x;
		} else if (ymax < 0.0) {
			xmin = Math.max(xmin - (x - xmin),
					Math.max(bpdist / 2.0, multidist / 2.0));
			xmax = x;
		}
		numIt++;
	}
	return x;
}

function objFun(n1, n2, r, bpdist, multidist) {
	return ( n1 * 2.0 * Math.asin(bpdist / (2.0 * r)) + n2 * 2.0
				* Math.asin( multidist / (2.0 * r)) - (2.0 * Math.PI));
}

function correctHysteresis(angle) {
	let hystAttr = [ 0.0, Math.PI/4.0, Math.PI/2.0, 3.0*Math.PI/4.0, Math.PI, 5.0*(Math.PI)/4.0, 3.0*(Math.PI)/2.0, 7.0*(Math.PI)/4.0];
	let result = normalizeAngleSec(angle);
	for (let i = 0; i < hystAttr.length; i++){
		let att = hystAttr[i];
		if (Math.abs(normalizeAngle(att-result,-Math.PI)) < 0.15){
			result = att;
		}
	}
	return result;
}

function normalizeAngleSec(angle) {
	return normalizeAngle(angle, 0.0);
}

function normalizeAngle(angle, fromVal) {
	let toVal = fromVal + 2.0 * Math.PI;
	let result = angle;
	while (result < fromVal) {
		result += 2.0 * Math.PI;
	}
	while (result >= toVal) {
		result -= 2.0  *Math.PI;
	}
	return result;
}

export {drawRadiate};
