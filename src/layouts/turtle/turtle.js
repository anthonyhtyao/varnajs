// Modified and converted from RNAturtle.c

import { cfgGenerateConfig, getArcAngle } from "./data/config";

const TYPE_BASE_NONE = 0;
const TYPE_EXTERIOR = 1;
const TYPE_STEM = 2;
const TYPE_BULGE = 3;
const TYPE_LOOP1 = 4;
const TYPE_LOOP2 = 5;

const EXTERIOR_Y = 100.0;
const MATH_PI_HALF = Math.PI / 2;

let drawTurtle = function(baseList) {

    const drawArcs = 1;
    const paired = 35.0;
    const unpaired = 25.0;

    // Create 1-index ptable and baseInformation
    var ptable = [];
    ptable.push(baseList.length);
	  for (let i = 0; i < baseList.length; i++) {
      ptable.push(baseList[i].getPartner() + 1);
	  }

    const length = ptable[0];

    // turtle base information
    var baseInformation = new Array(length + 1).fill(null).map(() => ({
        baseType: TYPE_BASE_NONE,
        distance: unpaired,
        angle: 0.0,
        config: null
    }));

    // generate default configuration for each loop
    cfgGenerateConfig(ptable, baseInformation, unpaired, paired);


    // compute loop angles
    computeAffineCoordinates(ptable, paired, unpaired, baseInformation);

    // transform affine coordinates into cartesian coordinates
    var myX = new Array(length).fill(0);
    var myY = new Array(length).fill(0);
    affineToCartesianCoordinates(baseInformation, length, myX, myY);

    // if (drawArcs) {
    //     // compute postscript arcs instead of lines
    //     computeAnglesAndCentersForPS(ptable, myX, myY, baseInformation, arc_coords);
    // }


    var coords = [];
    for (let i = 0; i < length; i++) {
        coords.push({x: myX[i], y: myY[i]});
    }

    return coords;
}




/**
 * Handle bases of the exterior loop
 *
 * @returns first paired base
 */
let handleExteriorBases = function (ptable, currentBase, baseInformation, direction) {
    const length = ptable[0];
    if (currentBase > 1) {
        baseInformation[currentBase].angle = baseInformation[currentBase].angle + direction * MATH_PI_HALF;
        baseInformation[currentBase].baseType = TYPE_EXTERIOR;
    }

    while (currentBase < length && ptable[currentBase] <= 0) {
        baseInformation[currentBase + 1].angle = 0.0;
        baseInformation[currentBase].baseType = TYPE_EXTERIOR;

        currentBase++;
    }

    if ((currentBase + 1) <= length) {
        baseInformation[currentBase + 1].angle = direction * MATH_PI_HALF;
        baseInformation[currentBase].baseType = TYPE_EXTERIOR;
    } else {
        baseInformation[currentBase].baseType = TYPE_EXTERIOR;
    }
    return currentBase;
}

// Count no. of base pairs and consecutive pairs on a loop
// i - last base of first stem half
// m - no. of base pairs; n - no. of consecutive pairs
let countLoopPairs = function (i, ptable) {
    const end = ptable[i++];
    var m = 1;
    var n = 1;
    while (i < end) {
        if (ptable[i] <= 0 || ptable[i] < i) {
            n++;
            i++;
        } else {
            m++;
            i = ptable[i];
        }
    }
    return [m, n];
}

let detectBulge = function (start, ptable) {
    let bulge = 0;
    let end = ptable[start];
    let iterate = 1;
    let old = 0;
    let i = start + 1;
    let side = 0;

    do {
        if (ptable[i] > 0) {
            if (iterate > 0) {
                if (ptable[i] == old) {
                    side++;
                    i++;
                } else {
                    if (start == ptable[i] || ptable[i] == end - 2) {
                        bulge = ptable[i];
                        break;
                    } else {
                        break;
                    }
                }
            } else {
                iterate++;
                old = i;
                i = ptable[i];
            }
        } else {
            if (iterate > 0) {
                iterate = 0;
                i++;
            } else {
                i++;
            }
        }
    } while (i > start);

    return bulge;
}

let handleLoop = function (i, ptable, paired, unpaired, baseInformation, direction) {
    let start = i;
    const end = ptable[i];
    let [m, n] = countLoopPairs(i, ptable);

    let bulge = detectBulge(i, ptable);

    if (bulge > 0 && n - m == 1) {
        let length = (unpaired * (n - m + 1)) / 2;
        let alpha = Math.acos(unpaired / (2 * length));

        if (ptable[i + 1] == 0) {
            baseInformation[i + 1].angle = baseInformation[i + 1].angle + direction * alpha;
            baseInformation[i].baseType = TYPE_BULGE;
            baseInformation[ptable[i]].baseType = TYPE_BULGE;
            i++;
            baseInformation[i + 1].angle = -direction * alpha * 2;
            baseInformation[i].baseType = TYPE_BULGE;
            i++;
            baseInformation[i + 1].angle = direction * alpha;
            baseInformation[i].baseType = TYPE_BULGE;
            baseInformation[ptable[i]].baseType = TYPE_BULGE;

            handleStem(ptable, i, paired, unpaired, baseInformation, direction);

            i = ptable[i];
        } else {
            baseInformation[i + 1].angle = baseInformation[i + 1].angle + 0.0;
            baseInformation[i].baseType = TYPE_BULGE;
            i++;
            baseInformation[i + 1].angle = baseInformation[i + 1].angle + 0.0;
            baseInformation[i + 1].baseType = TYPE_BULGE;
            baseInformation[i + 2].angle = baseInformation[i + 2].angle + 0.0;
            baseInformation[i + 1].baseType = TYPE_BULGE;

            handleStem(ptable, i, paired, unpaired, baseInformation, direction);

            i = ptable[i];
            baseInformation[i + 1].angle = baseInformation[i + 1].angle + direction * alpha;
            baseInformation[i].baseType = TYPE_BULGE;
            i++;
            baseInformation[i + 1].angle = -direction * alpha * 2;
            baseInformation[i].baseType = TYPE_BULGE;
            i++;
            baseInformation[i + 1].angle = direction * alpha;
            baseInformation[i].baseType = TYPE_BULGE;
        }
    } else {
        const cfg = baseInformation[start].config;
        let currentArc = 0;

        let r = cfg.radius;

        let angle_over_paired = 2 * Math.asin(paired / (2 * r));
        let current_angle = getArcAngle(cfg, currentArc);
        let current_bb_angle = (current_angle - angle_over_paired) / cfg.cfgArcs[currentArc].numberOfArcSegments;
        let current_distance = Math.sqrt(2 * r * r * (1 - Math.cos(current_bb_angle)));
        let current_delta_ab = 0.5 * (Math.PI + angle_over_paired + current_bb_angle);
        let current_delta_bb = Math.PI + current_bb_angle;
        ++currentArc;

        baseInformation[i + 1].angle = baseInformation[i + 1].angle + direction * (Math.PI - current_delta_ab);

        baseInformation[i].distance = current_distance;

        let current_stem_count = 0;

        if (baseInformation[i].baseType == TYPE_LOOP1) {
            baseInformation[i].baseType = TYPE_LOOP2;
        } else {
            baseInformation[i].baseType = TYPE_LOOP1;
        }
        i++;

        while (i < end) {
            if (ptable[i] <= 0) {
                baseInformation[i + 1].angle = -direction * (current_delta_bb - Math.PI);
                baseInformation[i].distance = current_distance;

                baseInformation[i].baseType = TYPE_LOOP1;
                i++;
            } else if (ptable[i] > i) {
                baseInformation[i + 1].angle = direction * (Math.PI - current_delta_ab);
                current_stem_count++;

                baseInformation[i].baseType = TYPE_LOOP1;

                handleStem(ptable, i, paired, unpaired, baseInformation, direction);

                i = ptable[i];
            } else {
                if (current_stem_count == 1) {
                    current_stem_count = 0;
                    current_angle = getArcAngle(cfg, currentArc);
                    current_bb_angle = (current_angle - angle_over_paired) / cfg.cfgArcs[currentArc].numberOfArcSegments;
                    current_distance = Math.sqrt(2 * r * r * (1 - Math.cos(current_bb_angle)));
                    current_delta_ab = 0.5 * (Math.PI + angle_over_paired + current_bb_angle);
                    current_delta_bb = Math.PI + current_bb_angle;
                    ++currentArc;
                }

                baseInformation[i + 1].angle = baseInformation[i + 1].angle + direction * (Math.PI - current_delta_ab);
                baseInformation[i].distance = current_distance;

                baseInformation[i].baseType = TYPE_LOOP1;

                i++;
            }
        }

        if ((i + 1) <= ptable[0]) {
            baseInformation[i + 1].angle = direction * (Math.PI - current_delta_ab);
        }

        baseInformation[i].baseType = TYPE_LOOP1;
    }

    return;
}

let handleStem = function (ptable, i, paired, unpaired, baseInformation, direction) {
    let end = ptable[i] + 1;
    baseInformation[i].baseType = TYPE_STEM;
    i++;

    // First position of stem, continue!, Detect bulges on opposite strand
    while (ptable[i] > 0 && (ptable[i] == end - 1 || ptable[i] + 1 == ptable[i - 1])) {
        baseInformation[i + 1].angle = 0.0;
        baseInformation[i].baseType = TYPE_STEM;
        i++;
    }

    if (ptable[i] == end - 1) {
        //        printf("Kaboom");
    } else {
        // i - last base of first stem half
        handleLoop(--i, ptable, paired, unpaired, baseInformation, direction);
    }
    // set i as base pairing partner of last stem base
    i = ptable[i];
    baseInformation[i].baseType = TYPE_STEM;
    i++;

    while (i < end && i < ptable[0]) {
        baseInformation[i].baseType = TYPE_STEM;
        i++;
    }

    return;
}

/**
 * Compute angles for all loops
 */
let computeAffineCoordinates = function (ptable, paired, unpaired, baseInformation) {
    const length = ptable[0];
    let currentBase = 1;
    const direction = -1;
    baseInformation[0].angle = 0.0;

    if (2 <= length) {
        baseInformation[1].angle = baseInformation[0].angle;
        baseInformation[2].angle = baseInformation[1].angle;
    }

    let dangle_count = 0;
    while (currentBase < length) {
        if (ptable[currentBase] <= 0) {
            if (currentBase > 1) {
                baseInformation[currentBase - 1].baseType = TYPE_EXTERIOR;
            }
            currentBase = handleExteriorBases(ptable, currentBase, baseInformation, direction);
            // returns first paired base currentBase
            dangle_count++;
        }

        if (currentBase < length) {
            if (ptable[currentBase] - ptable[currentBase - 1] != 1 && ptable[currentBase] != 0 && ptable[currentBase - 1] != 0) {
                if (currentBase == 1) {
                    if (dangle_count < 1) {
                        baseInformation[0].angle = baseInformation[1].angle = baseInformation[2].angle = -MATH_PI_HALF;
                        baseInformation[currentBase].baseType = TYPE_EXTERIOR;
                    }
                    handleStem(ptable, currentBase, paired, unpaired, baseInformation, direction);
                    currentBase = ptable[currentBase] + 1;

                    if (currentBase == length) {
                        baseInformation[currentBase - 1].baseType = TYPE_EXTERIOR;
                        baseInformation[currentBase].baseType = TYPE_EXTERIOR;
                        baseInformation[currentBase].angle = -MATH_PI_HALF;
                    }
                    continue;
                } else {
                    baseInformation[currentBase].angle = baseInformation[currentBase].angle + direction * MATH_PI_HALF;
                    baseInformation[currentBase + 1].distance = unpaired;
                    baseInformation[currentBase - 1].baseType = TYPE_EXTERIOR;
                    baseInformation[currentBase + 1].angle = baseInformation[currentBase + 1].angle + direction * MATH_PI_HALF;
                    baseInformation[currentBase].baseType = TYPE_EXTERIOR;

                    dangle_count++;
                }
            }

            handleStem(ptable, currentBase, paired, unpaired, baseInformation, direction);
            // currentBase is the next base after stem
            currentBase = ptable[currentBase] + 1

            if (currentBase == length) {
                baseInformation[currentBase - 1].baseType = TYPE_EXTERIOR;
                currentBase = handleExteriorBases(ptable, currentBase, baseInformation, direction);
            }
        }
    }

    baseInformation[length].baseType = TYPE_EXTERIOR;

}

/**
 * Calculate the coordinates for the drawing with the given angle angles
 */
let affineToCartesianCoordinates = function (baseInformation, length, x, y) {
    if (length < 1) {
        return;
    }

    let angle = 0.0;
    x[0] = y[0] = EXTERIOR_Y;
    for (let i = 1; i < length; i++) {
        angle = angle - baseInformation[i + 1].angle;

        x[i] = x[i - 1] + baseInformation[i].distance * Math.cos(angle);
        y[i] = y[i - 1] + baseInformation[i].distance * Math.sin(angle);
    }
    return;
}


export {drawTurtle, computeAffineCoordinates, affineToCartesianCoordinates };
