import { getArcAngle, cfgIsValid } from "../data/config";
import { getBoundingWedge } from "./boundingWedge";
import * as ctree from "../data/configtree";


const MATH_PI = Math.PI;
const MATH_TWO_PI = MATH_PI * 2;
const epsilon3 = 1e-3;

/*
function DEPRECATED_getMinOuterAngle(
  const treeNode *node
) {
  stemBox* sBox = node.sBox;
  let pStemTopCorner[2];
  pStemTopCorner[0] = sBox.c[0] + sBox.e[0] * sBox.a[0] + sBox.e[1] * sBox.b[0];
  pStemTopCorner[1] = sBox.c[1] + sBox.e[0] * sBox.a[1] + sBox.e[1] * sBox.b[1];
  let pLoopCenter[2];
  getLoopCenter(node, pLoopCenter);
  let vLoopCenterToStemTopCorner[2];
  vector(pLoopCenter, pStemTopCorner, vLoopCenterToStemTopCorner);
  let vLoopCenterToStemCenter[2] = { (-1) * sBox.a[0], (-1) * sBox.a[1] };
  let minOuterAngle = angleBetweenVectors2D(vLoopCenterToStemCenter, vLoopCenterToStemTopCorner);

  return minOuterAngle;
}
*/

function calcDeltasEquidistantIncrease(targetAngleIn,configSize,increase,deltaCfg) {
  let fnName = "CALC DELTAS EQUIDISTANT INCREASE";
  let targetAngle = targetAngleIn;

  let increaseCount = 0;
  for (let i = 0; i < configSize; i++) {
    if (increase[i]) {
      increaseCount++;
    }
  }
  let deltaPerIncrease = targetAngle / increaseCount;

  for (let i = 0; i < configSize; i++) {
//    printDebug(fnName, "deltaCfg[%d]: %5.2lf°", i, deltaCfg[i]);
    if (increase[i]) {
      deltaCfg[i] += deltaPerIncrease;
    }
//    printDebug(null, " . %5.2lf°\n", deltaCfg[i]);
  }
}

function calcDeltasMaximumFirstDecrease(targetAngleIn,indexLeft,indexRight,configSize,deltaCfg,currentAngles,minAngleHalf) {
  let fnName = "CALC DELTAS MAXIMUM FIRST DECREASE";
  let targetAngle = targetAngleIn;
//  console.log("[%s] iLeft: %d iRight: %d\n", fnName, indexLeft , indexRight);

  let i;

  let doLoop = 1;

  while (doLoop) {
    let maxSpace = 0.0;
    let maxSpaceIndex = -1;

    if (indexLeft == -1) {
//      console.log("[%s] behavior: iterate right\n", fnName);

      let sumAngles = 0.0;
      i = -1;
      while (i != indexRight) {
        i++;
        let cfg = currentAngles[i] + deltaCfg[i] - 2 * minAngleHalf;
        sumAngles += cfg;
      }
      while (i != configSize-1) {
        i++;
        let cfg = currentAngles[i] + deltaCfg[i] - 2 * minAngleHalf;
        if (sumAngles < MATH_PI) {
          if (cfg > maxSpace) {
            maxSpace = cfg;
            maxSpaceIndex = i;
          }
        } else {
          break;
        }
        /// sum increase happens afterwards to allow bending the arc containing 180°
        sumAngles += cfg;
      }

    } else if (indexRight == -1) {
//      console.log("[%s] behavior: iterate left\n", fnName);

      let sumAngles = 0.0;
      i = configSize - 1;
      while (i != indexLeft) {
        let cfg = currentAngles[i] + deltaCfg[i] - 2 * minAngleHalf;
        sumAngles += cfg;
        i--;
      }
      while (i != -1) {
//        console.log("[%s] i: %d size: %d\n", fnName, i, configSize);
        let cfg = currentAngles[i] + deltaCfg[i] - 2 * minAngleHalf;
        if (sumAngles < MATH_PI) {
          if (cfg > maxSpace) {
            maxSpace = cfg;
            maxSpaceIndex = i;
          }
        } else {
          break;
        }
        /// sum increase happens afterwards to allow bending the arc containing 180°
        sumAngles += cfg;
        i--;
      }

    } else {
      // default behavior
//      console.log("[%s] behavior: default\n", fnName);

      i = indexRight;
      if (i == configSize-1) { i = -1; }
      while (i != indexLeft) {
//        console.log("[%s] i: %d size: %d\n", fnName, i+1, configSize);
        let cfg = currentAngles[i+1] + deltaCfg[i+1] - 2 * minAngleHalf;
        if (cfg > maxSpace) {
          maxSpace = cfg;
          maxSpaceIndex = i+1;
//          console.log("[%s] newMax: %+7.2f°[%d] (cfg: %+7.2f° delta: %+7.2f° space: %+7.2f°)\n", fnName, maxSpace, maxSpaceIndex, toDegree(currentAngles[maxSpaceIndex]), deltaCfg[maxSpaceIndex], (-2) * minAngleHalf);
        }
        i++;
        if (i == configSize-1) { i = -1; }
      }
    }

    /// using spaces
//    for (i = 0; i < configSize; i++) {
//      if (decrease[i]) {
//        if (currentAngles[i] > maxSpace) {
//          maxSpace = currentAngles[i];
//          maxSpaceIndex = i;
//        }
//      }
//    }

//    maxSpace = toDegree(maxSpace);

    let diff = 0.0;
    if (maxSpaceIndex != -1) {
      let factor = (targetAngle < 0.1 * targetAngleIn) ? 1.0 : 0.5;
      diff = (-1) * Math.min(factor * maxSpace, targetAngle);
//      console.log("[%s] diff: %+7.2f = (-1) * Math.min(%+7.2f, %+7.2f)\n", fnName, diff, (factor * maxSpace), targetAngle);
//      console.log("[%s] cfg[%d]: %+7.2f° (+ %+7.2f°) diff: %+7.2f°\n", fnName, maxSpaceIndex, toDegree(currentAngles[maxSpaceIndex]), deltaCfg[maxSpaceIndex], diff);
      deltaCfg[maxSpaceIndex] += diff;
      targetAngle += diff;
    }

    doLoop = targetAngle > 0.0 && Math.abs(diff) > epsilon3;
  }



  return targetAngle;
}

function calcDeltasNearestNeighborsFirstDecrease(targetAngleIn,indexLeft,indexRight,configSize,decrease,space,deltaCfg) {
  let fnName = "CALC DELTAS NEAREST NEIGHBOR FIRST DECREASE";
  let targetAngle = targetAngleIn;

  /// count the number of possible iteration steps
  let startIndex = indexRight + 1;
  if (startIndex == configSize) { startIndex = -1; }
  let stopIndex = indexLeft + 1;
  if (stopIndex == configSize) { stopIndex = -1; }
//  console.log("[%s] start: %d stop: %d\n", fnName, startIndex, stopIndex);
  let steps = 0;
  let stemIt = indexRight;
  while (stemIt != indexLeft) {
    stemIt++;
    if (stemIt == configSize) { stemIt = -1; }

    steps++;
//    console.log("[%s] stemIt: %d steps: %d\n", fnName, stemIt, steps);
  }
  let numIt = steps / 2; // implicit floor() operation
//  console.log("[%s] indexL: %d indexR: %d steps: %d numItFloat: %f numItInt: %d\n", fnName, indexLeft, indexRight, steps, 0.5 * steps, numIt);

  let index = new Array(steps);
  let changed = 1;
  while (changed) {
    changed = 0;
    let count = 0;

    let iL = indexLeft;
    if (iL == -1) { iL = configSize - 1; }
    let iR = indexRight + 1;
    if (iR == configSize) { iR = 0; }

    for (let i = 0; i < numIt; i++) {
      if (decrease[iL]) {
        index[count] = iL;
        count++;
      }
      if (decrease[iR]) {
        index[count] = iR;
        count++;
      }
      iL--;
      if (iL == -1) { iL = configSize - 1; }
      iR++;
      if (iR == configSize) { iR = 0; }
    }
    if (numIt < 0.5 * steps) {
      index[count] = iL;
      count++;
      iL--;
      if (iL == -1) { iL = configSize - 1; }
    }

//    console.log("[%s] index queue:", fnName);
//    for (i = 0; i < count; i++) {
//      console.log(" %d", index[i]);
//    }
//    console.log("\n");

    if (count > 0) {
      let partAngle = targetAngle / count;
      for (let k = 0; k < count; k++) {
        let j = index[k];
        if (decrease[j]) {
          let diff = (-1) * Math.min(space[j] + deltaCfg[j], partAngle);
          deltaCfg[j] += diff;
          targetAngle += diff;
          changed = changed || (diff != 0.0);
        }
      }
    }

  }

//  console.log("[%s] return: %+7.2f°\n", fnName, targetAngle);

  return targetAngle;
}

/**
 * @brief calcDeltas
 *    The area between stems indexLeft and indexRight
 *    (by traversing the loop clockwise starting at indexLeft-stem)
 *    will be enlarged in degree as given via deltaAngle.
 *    All other areas will be used to compensate that increase
 *    (i.e. by decreasing those area's angles).
 * @param node
 * @param recursiveEnd
 * @param indexLeft
 * @param indexRight
 * @param deltaAngle
 * @param deltas
 * @return the amount of change (in positive degree) that can be accomplished with calculated deltas
 */
export function calcDeltas(node,recursiveEnd,indexLeft,indexRight,deltaAngle,puzzler,deltas) {
  let fnName = "CALC DELTAS";

  /// Check: valid angle >= 0.0
  if (deltaAngle < 0.0) {
    console.log(fnName, "cannot handle negative angles! grant proper input! (deltaAngle: %+7.2f°)\n", deltaAngle);
    return 0.0;
  }

  /// Check: valid range
  if (indexLeft == indexRight) {
    console.log(fnName, "non-sense input. indices have to be different. (left: %d right%d)\n", indexLeft, indexRight);
  }

  let childCount = node.childCount;
  let configSize = childCount + 1;

  /// get the current node's stem's bounding wedge
  //let minOuterAngle = getMinOuterAngle(node);
  //let minOuterAngle = 0.5 * getPairedAngle(node);
  let minOuterAngle = Math.asin(puzzler.paired / (2 * node.cfg.radius));
//  printDebug(fnName, "%d minOuterAngle:%f\n", getNodeID(node), minOuterAngle);

  /// allocate memory for stuff used in calculation
  let anglesMin     = new Array(childCount);
  let anglesMax     = new Array(childCount);
  let space         = new Array(configSize);
  let deltaCfg      = new Array(configSize);
  let increase      = new Array(configSize);
  let decrease      = new Array(configSize);
  let currentAngles = new Array(configSize);

  /// Initialization currentAngles
  let cfg = node.cfg;
  for (let currentArc = 0; currentArc < cfg.numberOfArcs; ++currentArc) {
    currentAngles[currentArc] = getArcAngle(cfg, currentArc);
  }

  /// get all bounding wedges (minAngle, maxAngle)
  let min, max;
  for (let currentChild = 0; currentChild < childCount; currentChild++) {
    [min, max] = getBoundingWedge(node, currentChild, min, max);
//    printDebug(fnName, "wedge[%d]  min:%5.2lf  max:%5.2lf\n",
//           currentChild, min, max);

    anglesMin[currentChild] = min;
    anglesMax[currentChild] = max;
  }

  /// convert bounding wedges to "free" areas that can be used for compensation of changes
  space[0] = anglesMin[0] - (0 + minOuterAngle);
//  printDebug(fnName, "space[%d] = %+11.6lf : %+11.6lf - %+11.6lf\n", 0, space[0], anglesMin[0], minOuterAngle);
  for (let i = 1; i < (configSize - 1); i++) {
    space[i] = anglesMin[i] - anglesMax[i-1];
//    printDebug(fnName, "space[%d] = %+11.6lf : %+11.6lf - %+11.6lf\n", i, space[i], anglesMin[i], anglesMax[i]);
  }
  space[configSize - 1] = (MATH_TWO_PI - minOuterAngle) - anglesMax[configSize - 2];
//  printDebug(fnName, "space[%d] = %+11.6lf : %+11.6lf - %+11.6lf\n", configSize - 1, space[configSize - 1], (MATH_TWO_PI - minOuterAngle), anglesMax[configSize - 2]);

  // fix too big spaces (may become bigger than config for very large loops)
  for (let i = 0; i < configSize; i++) {
    space[i] = Math.min(space[i], getArcAngle(node.cfg, i) - 2 * minOuterAngle);
  }

//  // debug
//  for (let i = 0; i < configSize; i++) {
//    printDebug(fnName, "space[%d] = %+11.6lf\n", i, space[i]);
//  }

  /// Initialization: calculation values (deltaCfg, increase, decrease)
  for (let i = 0; i < configSize; i++) {
    deltaCfg[i] = 0.0;
    increase[i] = -1;
    decrease[i] = -1;
  }

//  console.log("[%s] iLeft: %d iRight: %d angle: %+7.2f°\n", fnName, indexLeft, indexRight, deltaAngle);

  /// Mark increase and decrease areas
  let currentIndex = indexLeft; // stemIndex
  while (currentIndex != indexRight) {
//    console.log("[%s] (1) currentIndex: %d size: %d\n", fnName, currentIndex+1, configSize);
    increase[currentIndex+1] = 1;
    decrease[currentIndex+1] = 0;
    currentIndex++;
    if (currentIndex == configSize-1) { currentIndex = -1; }
  }
  while (currentIndex != indexLeft) {
//    console.log("[%s] (2) currentIndex: %d size: %d\n", fnName, currentIndex+1, configSize);
    increase[currentIndex+1] = 0;
    decrease[currentIndex+1] = (space[currentIndex+1] > 0.0);
    currentIndex++;
    if (currentIndex == configSize-1) { currentIndex = -1; }
  }

  /// ------------------------
  /// --- ^        ^ ---
  /// --- | preparations | ---
  /// --- |        | ---
  /// ------------------------

  /// ------------------------
  /// --- |        | ---
  /// --- | calculation  | ---
  /// --- v        v ---
  /// ------------------------

//  console.log("[%s] [SIGNS] %d", fnName, getNodeID(node));
//  for (let i = 0; i < configSize; i++) {
//    if (increase[i]) {
//      console.log(" %d:+", i);
//    }
//    if (decrease[i]) {
//      console.log(" %d:-", i);
//    }
//    if (!increase[i] && !decrease[i]) {
//      console.log(" %d:#", i);
//    }
//  }
//  console.log("\n");

  let targetAngle = deltaAngle;

  /// Step 1: equidistant increase
  calcDeltasEquidistantIncrease(targetAngle, configSize, increase, deltaCfg);

  /// Step 2: nearest neighbor first decrease
  targetAngle = calcDeltasNearestNeighborsFirstDecrease(targetAngle, indexLeft, indexRight, configSize, decrease, space, deltaCfg);

  /// Step 3: check if intersections are fixed
  let notFixedYet = (targetAngle != 0.0);
  if (notFixedYet) {
    /// if the intersection is not yet fixed

//    printDebug(fnName, "remaining target: %+7.2f°\n", targetAngle);

    /// check if there is a loop on a higher level that can be bend instead of this one
    /// if this is the case we can apply methods using spaces
    /// otherwise we need to use drastical measures (e.g. maximumFirstDecrease using cfg instead of spaces)

    let parent = ctree.getParent(node);
    let canGoHigher = 0;
    while (parent != recursiveEnd && !ctree.isExterior(parent)) {
//      console.log("[%s] parent: %d\n", fnName, getNodeID(parent));
      let parentIsMultiLoop = ctree.isMultiLoop(parent);
      if (parentIsMultiLoop) {
//        console.log("[%s] is multi loop\n", fnName);
        canGoHigher = 1;
        break;
      } else {
        // parent is interior loop
        let childAngle = getArcAngle(parent.cfg, 0);
        if (Math.abs(childAngle - MATH_PI) < epsilon3) {
          // no op
        } else
        if (childAngle > MATH_PI) {
          if (indexLeft == 0) {
//            console.log("[%s] can bend left\n", fnName);
            canGoHigher = 1;
            break;
          }
        } else
        if (childAngle < MATH_PI) {
          if (indexLeft == -1) {
//            console.log("[%s] can bend right\n", fnName);
            canGoHigher = 1;
            break;
          }
        }
      }

      /// if current parent node can not be adapted check its parent
      parent = ctree.getParent(parent);
    }

//    console.log("[%s] canGoHigher: %d\n", fnName, canGoHigher);
    if (!canGoHigher) {
      targetAngle = calcDeltasMaximumFirstDecrease(targetAngle, indexLeft, indexRight, configSize, deltaCfg, currentAngles, minOuterAngle);
    }
  }

  /// Step 4: equidistant increase with negative remaining target angle
  calcDeltasEquidistantIncrease((-1) * targetAngle, configSize, increase, deltaCfg);

  if (!cfgIsValid(cfg, deltaCfg)) {
    console.log(fnName, "Deltas invalid 3\n");
    // printConfigError(fnName, node, deltaCfg);
//  } else {
//    printDebug(fnName, "Deltas valid 3\n");
  }

  /// Fix deltas if changes are too small.
  /// This is necessary because sometimes the calculation results in micro changes.
  /// These micro changes go along with an increase of the loops radius which causes
  /// new problems as the changes being too small to get enough distance to the
  /// changed loop and the intersector being stuck in collision (again).
  ///
  /// multiplying by factor 2.0 we always get a resulting angle between 0.1° and 0.2°
  /// don't use factor 10 as the impact of doing so is way too strong and often causes crashes
  /// in term of applicability of the changes
  let fixTooSmallChanges = 0;
  if (fixTooSmallChanges) {
    for (let cntr = 0; cntr < 100; cntr++) {
      let valid = 0;
      for (let currentArc = 0; currentArc < configSize; currentArc++) {
        if (Math.abs(deltaCfg[currentArc]) >= epsilon3) {
          valid = 1;
          break;
        }
      }
      if (valid) {
        break;
      } else {
        for (let currentArc = 0; currentArc < configSize; currentArc++) {
          deltaCfg[currentArc] = 2.0 * deltaCfg[currentArc];
        }
      }
    }
//    if (LOG_FLAG && cntr > 0) {
//      console.log("[ LOG ] fixing... (%d)\n", cntr);
//    }
  }

  /// transfer calculated deltas to return area
  for (let currentArc = 0; currentArc < configSize; currentArc++) {
    deltas[currentArc] = deltaCfg[currentArc];
//    console.log("[%s] delta[%d]: %+7.2f° (space[%d]: %+7.2f°)\n", fnName, currentArc, deltas[currentArc], currentArc, space[currentArc]);
  }

  /// free allocated memory

  /// check if all deltas sum up to zero
  let checkSum = 0.0;
  for (let currentArc = 0; currentArc < configSize; currentArc++) {
    checkSum += deltas[currentArc];
  }
  if (Math.abs(checkSum) > epsilon3) {
    console.log("[%s] config broke ... abort and reset\n", fnName);
    for (let currentArc = 0; currentArc < configSize; currentArc++) {
//      console.log("[%s] delta[%d]: %+7.2f° (space[%d]: %+7.2f°)\n", fnName, currentArc, deltas[currentArc], currentArc, space[currentArc]);
      deltas[currentArc] = 0.0;
    }
    targetAngle = deltaAngle;
  }

  if (!cfgIsValid(cfg, deltas)) {
    // printConfigError(fnName, node, deltas);

    for (let currentArc = 0; currentArc < configSize; currentArc++) {
//      console.log("[%s] delta[%d]: %+7.2f° (space[%d]: %+7.2f°)\n", fnName, currentArc, deltas[currentArc], currentArc, space[currentArc]);
      deltas[currentArc] = 0.0;
    }
    targetAngle = deltaAngle;
//  } else {
//    printDebug(fnName, "Deltas valid\n");
  }

//  for (let currentArc = 0; currentArc < configSize; ++currentArc) {
//    printDebug(fnName, "delta[%d] = %05.2f°\n", currentArc, deltas[currentArc]);
//  }

  /// return the difference that can be accomplished using these deltas
  let changedAngle = deltaAngle - targetAngle;
//  console.log("[%s] %+7.2f° = %+7.2f° - %+7.2f°\n", fnName, changedAngle, deltaAngle, targetAngle);
  return changedAngle;
}

