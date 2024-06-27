/*--------------------------------------------------------------------------*/
/*---   create, copy, and free config   ------------------------------------*/
/*--------------------------------------------------------------------------*/

const MATH_TWO_PI = 2 * Math.PI;
const epsilon0 = 1.0;
const epsilon3 = 1e-3;
const epsilon7 = 1e-7;
/**
 * @brief cfgCreateConfig
 *      - constructor-like method for creating a config
 * @param radius
 *      - radius used for drawing that loop
 * @return
 *      - an initialized config struct
 */
function cfgCreateConfig(radius) {
    var cfg = {};

    cfg.radius = radius;
    cfg.minRadius = radius;
    cfg.defaultRadius = radius;

    cfg.cfgArcs = null;
    cfg.numberOfArcs = 0;

    return cfg;
}

/**
 * @brief cfgCreateConfigArc
 *      - constructor-like method for adding a new config entry to a given config
 * @param angle
 *      - angle (radiant) that can be found between stems 'from' and 'to' later on
 * @param numberOfArcSegments
 *      - number of arc segments between stems 'from' and 'to'
 * @return
 *      - an initialized configArc struct
 */
function cfgCreateConfigArc(angle, numberOfArcSegments) {
    var newConfigArc = {};

    newConfigArc.numberOfArcSegments = numberOfArcSegments;

    newConfigArc.arcAngle = angle;

    return newConfigArc;
}

export function cfgCloneConfig(cfg) {
    var clonedCfg = {};
    clonedCfg.radius = cfg.radius;
    clonedCfg.minRadius = cfg.minRadius;
    clonedCfg.defaultRadius = cfg.defaultRadius;
    clonedCfg.numberOfArcs = cfg.numberOfArcs;

    var numberOfArcs = cfg.numberOfArcs;
    clonedCfg.cfgArcs = new Array(numberOfArcs);
    for (let currentArc = 0; currentArc < numberOfArcs; ++currentArc) {
        clonedCfg.cfgArcs[currentArc] = {};
        clonedCfg.cfgArcs[currentArc].numberOfArcSegments = cfg.cfgArcs[currentArc].numberOfArcSegments;
        clonedCfg.cfgArcs[currentArc].arcAngle = cfg.cfgArcs[currentArc].arcAngle;
    }

    return clonedCfg;
}

function cfgFreeConfig(cfg) {
    cfg.cfgArcs = null;
    cfg = null;
}

// documentation at header file
function cfgPrintConfig(cfg) {
    var useDegree = 1;

    for (var currentArc = 0; currentArc < cfg.numberOfArcs; ++currentArc) {
        var angle = getArcAngle(cfg, currentArc);
        if (useDegree) { angle = toDegree(angle); }
        console.log("\t%6.2f%s %3.2f\n",
                angle,
                (useDegree ? "°" : ""),
                cfg.radius);
    }
}

/*--------------------------------------------------------------------------*/
/*---   access to config elements   ----------------------------------------*/
/*--------------------------------------------------------------------------*/

export function getArcAngle(cfg, currentArc) {
    return cfg.cfgArcs[currentArc].arcAngle;
}

function getArcAngleDegree(cfg, currentArc) {
    return toDegree(getArcAngle(cfg, currentArc));
}

/*--------------------------------------------------------------------------*/
/*---   radius computation   -----------------------------------------------*/
/*--------------------------------------------------------------------------*/

/**
 * Approximate the radius of a circle required to draw m base pairs
 * with a distance of 'a' to each other, and n (unpaired) consecutive
 * nucleotides with a distance of b over a specified angle.
 *
 * Uses a Newton iteration to approximate solution
 *
 * @param a paired
 * @param b unpaired
 * @param m #stems
 * @param n #backbones
 * @param angle angle
 */
function approximateConfigArcRadius(a, b, m, n, angle) {

    const MAX_ITERATIONS = 1000;

    /// calculation:
    ///
    /// be s the length of a line at the circle (paired or unpaired / a or b)
    /// the angle over such a single line be alpha
    ///     alpha = angle / ( m + n )
    ///
    /// for such a single line the following equation holds (where r is the radius of the circle)
    ///     sin( alpha / 2 ) = ( s / 2 ) / r
    ///     r = ( s / 2 ) / sin( alpha / 2 )
    ///     r = ( s / 2 ) / sin( ( angle / ( m + n ) ) / 2 )
    ///
    /// now we replace s with a or b to get the upper or lower bound for the radius interval
    var lowerBound = ( b / 2 ) / Math.sin( ( angle / ( m + n ) ) / 2 );
    var upperBound = ( a / 2 ) / Math.sin( ( angle / ( m + n ) ) / 2 );
    var rtn = 0.5 * (lowerBound + upperBound);

    /// there is a minimum valid radius!
    /// if rtn is smaller than 0.5*a or 0.5*b than the result will become nan
    rtn = Math.max(rtn, 0.5 * a);
    rtn = Math.max(rtn, 0.5 * b);

    var j = 0;
    for (j = 0; j < MAX_ITERATIONS; j++) {
        var dx = 2 * (m * Math.asin(a / (2 * rtn)) + n * Math.asin(b / (2 * rtn)) - (angle / 2)) / 
            (-(a * m / (rtn * Math.sqrt(rtn * rtn - a * a / 4)) + b * n / (rtn * Math.sqrt(rtn * rtn - b * b / 4))));
        rtn -= dx;
        if (Math.abs(dx) < epsilon3) {
            break;
        }
    }

    if (rtn < lowerBound) {
        console.log("[WARNING] [GET RADIUS] result too small: %12.8lf < %12.8lf -> reset\n", rtn, lowerBound);
        rtn = lowerBound;
    } else if (rtn > upperBound) {
        console.log("[WARNING] [GET RADIUS] result too large: %12.8lf > %12.8lf -> reset\n", rtn, upperBound);
        rtn = upperBound;
    }

    if (j >= MAX_ITERATIONS) {
        console.log("[WARNING] [GET RADIUS] iterarion limit reached (%d)\n", MAX_ITERATIONS);
    }

    return rtn;
}

/**
*/
function approximateConfigRadius(cfg, unpaired, paired) {
    // calculate a fitting radius for each arc without compressing or stretching arc segments
    // return the maximum of those values as the radius fitting for the loop
    var r = 0;
    for (var currentArc = 0; currentArc < cfg.numberOfArcs; ++currentArc) {
        var stems = 1;
        var numberOfArcSegments = cfg.cfgArcs[currentArc].numberOfArcSegments;
        var angle = getArcAngle(cfg, currentArc);

        var tempR = approximateConfigArcRadius(paired, unpaired, stems, numberOfArcSegments, angle);

        if (tempR > r) {
            r = tempR;
        }
    }
    return r;
}

//--------------------------------------------------------------------------------------------------------------------------

/**
 * @brief cfgGenerateDefaultConfig
 *      - generates a config that resembles a drawing without any
 *        constraints given by config input for the given loop
 * @param ptable
 *      - the RNA's pairing information
 * @param start
 *      - index of the loop's first base
 * @param unpaired
 *      - default length of backbone lines
 * @param paired
 *      - default distance between paired bases
 * @param radius
 *      - radius for the given loop
 * @return
 *      - complete config for that loop
 */
function cfgGenerateDefaultConfig(ptable, start, unpaired, paired, radius) {
    /// create loop configuration
    var cfg = cfgCreateConfig(radius);

    /// compute angles for paired and unpaired bases
    var anglePaired   = 2 * Math.asin(paired   / (2 * radius));    // angle over paired
    var angleUnpaired = 2 * Math.asin(unpaired / (2 * radius));    // angle over unpaired

    /// initialize values for first arc
    var arcUnpaired = 0;
    var angleArc; // alpha + numBackbones * beta

    /// pointer to first arc
    //configArc **currentArc = NULL;
    //currentArc = &(cfg->first);

    /// start with first base after parent stem
    var i = start + 1;
    while (i <= ptable[start]) {
        /// until last base at parent stem
        if (ptable[i] == 0) {
            /// arc
            i++;
        } else {
            /// increment number of arcs
            ++(cfg.numberOfArcs);

            if (i != ptable[start]) {
                /// skip subtree at stem
                i = ptable[i] + 1;
            } else {
                /// parent stem -> finish
                break;
            }
        }
    }

    cfg.cfgArcs = new Array(cfg.numberOfArcs);

    /// start with first base after parent stem
    i = start + 1;
    var currentArc = 0;
    var numberOfArcSegments = 0;
    while (i <= ptable[start]) {
        /// until last base at parent stem
        if (ptable[i] == 0) {
            /// arc
            arcUnpaired++;
            i++;
        } else {
            /// stem: create arc
            angleArc = anglePaired + (arcUnpaired + 1) * angleUnpaired;
            numberOfArcSegments = arcUnpaired + 1;
            cfg.cfgArcs[currentArc] = cfgCreateConfigArc(angleArc, numberOfArcSegments);
            ++currentArc;

            if (i != ptable[start]) {
                /// initialize values for next arc
                arcUnpaired = 0;

                /// skip subtree at stem
                i = ptable[i] + 1;
            } else {
                /// parent stem -> finish
                break;
            }
        }
    }

    return cfg;
}

function cfgGenHandleStem(baseNr, ptable, baseInformation, unpaired, paired) {
    var continueStem = 1;
    var i = baseNr;
    while ( continueStem ) {
        if (ptable[i+1] == ptable[i] - 1) {
            i++;
        } else {
            // found unpaired above stem
            cfgGenHandleLoop(i, ptable, baseInformation, unpaired, paired);
            continueStem = 0;
        }
    }
}

/**
 * @brief cfgGenHandleLoop
 *      - recursively iterates through the RNA and generates default configurations.
 *        Alternates with corresponding handleStem method.
 * @param baseNr
 *      - index of the loop's first base
 * @param ptable
 *      - the RNA's pairing information
 * @param baseInformation
 *      - array of tBaseInformation annotations (to save config)
 */
function cfgGenHandleLoop(baseNr, ptable, baseInformation, unpaired, paired) {
    var start = baseNr;
    var end = ptable[baseNr];

    var unpairedCount = 0;
    var stemCount = 1;

    // count stems and unpaired bases to use for bulge detection
    var i = start + 1;
    while ( i < end ) {
        if (ptable[i] == 0) {
            // unpaired base
            unpairedCount++;
            i++;
        } else if (ptable[i] > i) {
            // found new stem
            stemCount++;
            i = ptable[i];
        } else {
            // returned from stem
            i++;
        }
    }

    var isBulge = (stemCount == 2 && unpairedCount == 1);
    if (isBulge) {
        if (ptable[start + 1] == 0) {
            // unpaired on left strand
            cfgGenHandleStem(start + 2, ptable, baseInformation, unpaired, paired);
        } else {
            // unpaired on the right strand
            cfgGenHandleStem(start + 1, ptable, baseInformation, unpaired, paired);
        }
    } else {
        var m = stemCount;                     // compare RNApuzzler.c -> f_handle_loop
        var n = unpairedCount + stemCount;    // compare RNApuzzler.c -> f_handle_loop
        var defaultRadius = approximateConfigArcRadius(paired, unpaired, m, n, MATH_TWO_PI);
        var cfgLoop = cfgGenerateDefaultConfig(ptable, start, unpaired, paired, defaultRadius);
        baseInformation[start].config = cfgLoop;

        var i = start + 1;
        while ( i < end ) {
            if (ptable[i] == 0) {
                // unpaired base
                i++;
            } else if (ptable[i] > i) {
                // found new stem
                cfgGenHandleStem(i, ptable, baseInformation, unpaired, paired);
                i = ptable[i];
            } else {
                // returned from stem
                i++;
            }
        }
    }
}

// documentation at header file
export function cfgGenerateConfig(ptable, baseInformation, unpaired, paired) {
    var length = ptable[0];
    var i = 1;
    while (i < length) {
        if (ptable[i] == 0) {
            // unpaired at exterior loop
            i++;
        } else if (ptable[i] > i) {
            // found stem
            cfgGenHandleStem(i, ptable, baseInformation, unpaired, paired);
            i = ptable[i];
        } else {
            // returned from stem
            i++;
        }
    }
}

/*--------------------------------------------------------------------------*/
/*---   set and update config elements   -----------------------------------*/
/*--------------------------------------------------------------------------*/

// documentation at header file
/**
 * @brief cfgSetRadius
 *      - changes the value of radius for a config to the given value
 * @param config
 *      - config that is being altered
 * @param radius
 *      - new radius
 */
function cfgSetRadius(cfg, radius) {
    cfg.radius = radius;
}

/**
 * @brief cfgUpdateMinRadius
 *      - updates the minimum possible radius for the given config
 * @param config
 * @param unpaired
 * @param paired
 */
function cfgUpdateMinRadius(cfg, unpaired, paired) {
    var minRadius = approximateConfigRadius(cfg, unpaired, paired);
    cfg.minRadius = minRadius;
}

export function cfgApplyChanges(cfg, loopName, deltaCfg, radiusNew, puzzler) {
    /// - start with adjusting config angles; if applicable
    if (deltaCfg != null) {
        for (var currentArc = 0; currentArc < cfg.numberOfArcs; currentArc++) {
            cfg.cfgArcs[currentArc].arcAngle += deltaCfg[currentArc];
        }
    }

    /// - then, adjust config radius
    var oldRadius = cfg.radius;
    var newRadius = -1.0;
    if (radiusNew > 0.0) {
        /// in case the input is a positive value
        /// we set the minimum of valid and input as new radius
        cfgUpdateMinRadius(cfg, puzzler.unpaired, puzzler.paired);
        newRadius = Math.max(radiusNew, cfg.minRadius);
        cfgSetRadius(cfg, newRadius);
    } else
    if (radiusNew == 0.0) {
        /// set the minRadius as new value
        /// (this allows to shrink a loop)
        cfgUpdateMinRadius(cfg, puzzler.unpaired, puzzler.paired);
        newRadius = cfg.minRadius;
        cfgSetRadius(cfg, newRadius);
    } else
    if (radiusNew == -1.0) {
        /// set the minRadius as new value
        /// (this forbidds to shrink a loop)
        cfgUpdateMinRadius(cfg, puzzler.unpaired, puzzler.paired);
        if (cfg.minRadius - epsilon0 > oldRadius) {
            newRadius = cfg.minRadius;
        } else {
            var defaultIncrease = 1.05;
            newRadius = oldRadius * defaultIncrease;
        }
        cfgSetRadius(cfg, newRadius);
    } else {
        /// all unhandled inputs result in errors
        console.log("[ERROR] set %c's new radius to -1.0 because of invalid input %10.8lf.\n", loopName, radiusNew);
        newRadius = -1.0;
    }

    return newRadius;
}

export function cfgIsValid(cfg, deltaCfg) {
    if (deltaCfg == null) {
        return 0;
    }

    var sumAngles = 0.0;
    var validSingleAngles = 1;
    for (var currentArc = 0; currentArc < cfg.numberOfArcs; currentArc++) {
        var angle = getArcAngle(cfg, currentArc) + deltaCfg[currentArc];
        sumAngles += angle;

        var validAngle = 0.0 < angle && angle < MATH_TWO_PI;
        validSingleAngles = validSingleAngles && validAngle;
    }

    var validSumAngles = (Math.abs(sumAngles - MATH_TWO_PI) < epsilon3);

    return validSingleAngles && validSumAngles;
}


