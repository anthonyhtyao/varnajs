import { bubblesort } from "../definitions";
import * as ctree from "../data/configtree";
import { intersectNodeLists } from "../intersectLevel/intersectLevelTreeNodes";
import { cfgCloneConfig, getArcAngle } from "../data/config";
import { distanceToAngle } from "../definitions";
import { getBoundingWedge } from "./boundingWedge";

const MATH_PI = Math.PI;
const MATH_TWO_PI = MATH_PI * 2;
const epsilon3 = 1e-3;

const searchStrategy = Object.freeze({
  BINARY_SEARCH: 0,
  LINEAR_SEARCH: 1
});

const increaseStrategy = Object.freeze({
  INCREASE_ALL_OTHER: 0,
  INCREASE_LEFT_NEIGHBOR: 1,
  INCREASE_RIGHT_NEIGHBOR: 2,
  INCREASE_BOTH_NEIGHBORS: 3
});

const distributionStrategy = Object.freeze({
  DISTRIBUTE_EQUALLY: 0,
  DISTRIBUTE_PROPORTIONALLY: 1
});

function checkIntersections(subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler) {
  return intersectNodeLists(subtree, sizeSubtree, subtree, sizeSubtree, puzzler)
       || intersectNodeLists(subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler);
}

/**
 * @brief shrinkLoopRadiusLinearSearch
 *    Try shrinking a loop by searching for a minimal radius in range [minRadius, maxRadius]
 *    with minRadius being the minimal possible radius for the given config and maxRadius
 *    being the radius that is currently applied (but may be too large).
 * @param node the tree node which's loop you want to optimize
 * @param allNodes
 * @param numNodes
 * @return shrinking ratio: new radius / old radius (0 < ratio <= 1)
 */
function shrinkLoopRadiusLinearSearch(node, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler) {

  let cfg = node.cfg;
  let cfgRadius = cfg.radius;

  /// we only want to adjust the radius based on the current config
  /// the current radius is valid because it is
  /// - either the result of the intersection resolution
  /// - or attained while shrinking (causing no new intersections)
  let minValidRadius = cfgRadius;

  /// setup interval for linear search for a better (smaller) radius
  let maxRadius = cfgRadius;
  let minRadius = cfg.minRadius;

  /// Check if difference is larger than a minimum
  let minAbsoluteDelta = 1.0;
  if (maxRadius - minRadius < minAbsoluteDelta) {
    /// No change . shrinkingRatio == 1.0
    return 1.0;
  }

  /// initialize linear search
  let radius = minRadius;
  let delta = 0.1 * (maxRadius - minRadius);

  /// set maximum number of steps for linear search
  let currentStep = 0;
  let maxSteps = 10;

//  let doLoop = minRadius + minRelativeDelta * maxRadius < maxRadius;
  while (currentStep < maxSteps) {
    ctree.applyChangesToConfigAndBoundingBoxes(node, null, radius, puzzler);

    let intersecting = checkIntersections(subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler);
    if (intersecting) {
      radius += delta;
    } else {
      break;
    }
    ++currentStep;
  }

  if (currentStep >= maxSteps || cfg.radius > maxRadius) {
    ctree.applyChangesToConfigAndBoundingBoxes(node, null, minValidRadius, puzzler);
  }

  /// measure shrinking
  let shrinkingRatio = cfg.radius / maxRadius;
//  printf("[%s] %c old:%f new:%f ratio:%f\n", fnName, getLoopName(node), cfgRadius, newRadius, shrinkingRatio);
  return shrinkingRatio;
}

/**
 * @brief shrinkLoopRadiusBinarySearch
 *    Try shrinking a loop by searching for a minimal radius in range [minRadius, maxRadius]
 *    with minRadius being the minimal possible radius for the given config and maxRadius
 *    being the radius that is currently applied (but may be too large).
 * @param node the tree node which's loop you want to optimize
 * @param allNodes
 * @param numNodes
 * @return shrinking ratio: new radius / old radius (0 < ratio <= 1)
 */
function shrinkLoopRadiusBinarySearch(node, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler) {
  let cfg = node.cfg;
  let cfgRadius = cfg.radius;

  /// we only want to adjust the radius based on the current config
  /// the current radius is valid because it is
  /// - either the result of the intersection resolution
  /// - or attained while shrinking (causing no new intersections)
  let minValidRadius = cfgRadius;

  /// set abort criteria for binary search
  let searchDepth = 0;
  let maxSearchDepth = 10;
  let minAbsoluteDelta = 10.0;
//  let minRelativeDelta = 0.01; // 1%

  /// setup interval for binary search for a better (smaller) radius
  let maxRadius = cfgRadius;
  let minRadius = cfg.minRadius;

  /// initialize binary search
  let radius = minRadius;
  let delta = 0.5 * (maxRadius - minRadius);

//  let doLoop = minRadius + minRelativeDelta * maxRadius < maxRadius;
  let doLoop = minRadius + minAbsoluteDelta < maxRadius;
  while (doLoop) {
    searchDepth++;

//    printf("[%s] %c [%f, %f] r:%f\n", fnName, getLoopName(node), minRadius, maxRadius, radius);
    ctree.applyChangesToConfigAndBoundingBoxes(node, null, radius, puzzler);

    let intersecting = checkIntersections(subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler);
    if (intersecting) {
      radius += delta;
    } else {
      minValidRadius = radius;
      radius -= delta;
    }
    delta *= 0.5;

//    printf("[%s]   valid:%d minValid:%f\n", fnName, !intersecting, minValidRadius);

    let stopBySearchDepth = (searchDepth > maxSearchDepth);
    let stopByRadiusLimit = (radius < minRadius);
//    let stopByRelativeDeltaLimit = (delta < cfgRadius * minRelativeDelta);
    let stopByAbsoluteDeltaLimit = (delta < minAbsoluteDelta);
    doLoop = !stopBySearchDepth
         && !stopByRadiusLimit
//         && !stopByRelativeDeltaLimit
         && !stopByAbsoluteDeltaLimit;
//    if (!doLoop) {
//      printf("[%s] %c stop reason:", fnName, getLoopName(node));
//      if (stopBySearchDepth) { printf(" maxSearchDepth (#%d)", maxSearchDepth); }
//      if (stopByRadiusLimit) { printf(" minRadiusReached"); }
//      if (stopByRelativeDeltaLimit)  { printf(" next changes < %.2f%%", 100.0 * minRelativeDelta); }
//      if (stopByAbsoluteDeltaLimit)  { printf(" next changes < %.2f", minAbsoluteDelta); }
//      printf("\n");
//    }
  }

  if (cfg.radius > minValidRadius) {
    ctree.applyChangesToConfigAndBoundingBoxes(node, null, minValidRadius, puzzler);
  }

  /// measure shrinking
  let shrinkingRatio = minValidRadius / cfgRadius;
//  printf("[%s] %c old:%f new:%f ratio:%f\n", fnName, getLoopName(node), cfgRadius, newRadius, shrinkingRatio);
  return shrinkingRatio;
}

function shrinkLoopRadius(node, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler) {
  const strategy = searchStrategy.LINEAR_SEARCH;
  switch (strategy) {
    case searchStrategy.BINARY_SEARCH:
      /// Use binary search
      return shrinkLoopRadiusBinarySearch(node, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler);
    case searchStrategy.LINEAR_SEARCH:
      /// Use linear search
      return shrinkLoopRadiusLinearSearch(node, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler);
    default:
      return 1.0;
  }
}

/**
 * @brief getSpaces
 * @param node
 * @param configSize
 * @param pairedAngle
 * @param space
 */
function getSpaces(node, configSize, pairedAngle, space) {
  /// allocate memory for stuff used in calculation
  let boundsLeft  = new Array(configSize);
  let boundsRight = new Array(configSize);

  /// get all bounding wedges
  boundsLeft[0] = 0.0 + 0.5 * pairedAngle;
  let min, max;
  for (let i = 0; i < (configSize - 1); i++) {
    [min, max] = getBoundingWedge(node, i, min, max);

    boundsRight[i] = min;
    boundsLeft[i+1] = max;
  }
  boundsRight[configSize - 1] = MATH_TWO_PI - 0.5 * pairedAngle;

  for (let i = 0; i < configSize; i++) {
    space[i] = boundsRight[i] - boundsLeft[i];
  }
}

/**
 * Check if config or radius changed
 *
 * @param cfg current configuration
 * @param oldRadius
 * @param newRadius
 * @param deltas relative changes
 */
function somethingChanged(cfg, oldRadius, newRadius, deltas) {
  let changed = (newRadius - oldRadius != 0.0);

  if ((!changed) && (deltas != null)) {
    for (let i = 0; i < cfg.numberOfArcs; i++) {
      if (deltas[i] != 0.0) {
        changed = 1;
        break;
      }
    }
  }

  return changed;
}

/**
 * Apply relative relative changes (deltas) to configuration)
 * - check if changes exist
 * - apply relative changes if changes exist
 *
 * @param node current node to change
 * @param deltas relative changes
 * @param targetRadius
 * @param logTag
 * @param puzzler options to apply
 */
function applyDeltas(node, deltas, targetRadius, puzzler) {
  if (somethingChanged(node.cfg, node.cfg.radius, targetRadius, deltas)) {
    ctree.applyChangesToConfigAndBoundingBoxes(node, deltas, targetRadius, puzzler);
  }
}

/**
 * Apply new configuration.
 * - compute relative changes (deltas)
 * - apply relative changes
 *
 * @param node current node to change
 * @param targetConfig
 * @param targetRadius
 * @param puzzler options to apply
 */
function applyConfig(node, targetConfig, puzzler) {
  let cfg = node.cfg;
  const configSize = cfg.numberOfArcs;

  let deltas = new Array(configSize);
  for (let i = 0; i < configSize; i++) {
    deltas[i] = getArcAngle(targetConfig, i) - getArcAngle(cfg, i);
  }

  applyDeltas(node, deltas, targetConfig.radius, puzzler);
}

/**
 * Compute current angle alpha between two unpaired bases for all arcs of a loop
 *
 * @param cfg current loop configuration
 * @param puzzler options to apply
 */
function computeAlphas(alphas, cfg, pairedDistance) {
  let configSize = cfg.numberOfArcs;
  let pairedAngle = distanceToAngle(cfg.radius, pairedDistance);

  /// Get alphas
  for (let currentArc = 0; currentArc < configSize; currentArc++) {
    alphas[currentArc] = (getArcAngle(cfg, currentArc) - pairedAngle) / (cfg.cfgArcs[currentArc]).numberOfArcSegments;
  }
}

/**
 * Increase all arcs except the one having decrease index.
 *
 * @param increase
 * @param decreaseIndex
 * @param configSize
 */
function computeIncreasesAllOther(increase, decreaseIndex, configSize) {
  for (let i = 0; i < configSize; i++) {
    if (i != decreaseIndex) {
      increase[0]++;
      increase[increase[0]] = i;
    }
  }
}

/**
 * Increase left neighbor.
 *
 * @param increase
 * @param decreaseIndex
 * @param configSize
 */
function computeIncreasesLeftNeighbor(increase, decreaseIndex, configSize) {
  let leftNeighbor = decreaseIndex > 0 ? decreaseIndex - 1 : configSize - 1;
  increase[0]++;
  increase[increase[0]] = leftNeighbor;
}

/**
 * Increase right neighbor.
 *
 * @param increase
 * @param decreaseIndex
 * @param configSize
 */
function computeIncreasesRightNeighbor(increase, decreaseIndex, configSize) {
  let rightNeighbor = decreaseIndex < configSize - 1 ? decreaseIndex + 1 : 0;
  increase[0]++;
  increase[increase[0]] = rightNeighbor;
}

/**
 * Increase both neighbors.
 *
 * @param increase
 * @param decreaseIndex
 * @param configSize
 */
function computeIncreasesBothNeighbors(increase, decreaseIndex, configSize) {
  let leftNeighbor = decreaseIndex > 0 ? decreaseIndex - 1 : configSize - 1;
  let rightNeighbor = decreaseIndex < configSize - 1 ? decreaseIndex + 1 : 0;
  increase[0]++;
  increase[increase[0]] = leftNeighbor;
  if (rightNeighbor != leftNeighbor) {
    increase[0]++;
    increase[increase[0]] = rightNeighbor;
  }
}

/**
 * Decide, which arcs to increase.
 *
 * @param increase
 * @param decreaseIndex
 * @param configSize
 */
function computeIncreases(increase, decreaseIndex, configSize) {
  const strategy = increaseStrategy.INCREASE_ALL_OTHER;
  switch (strategy) {
  case increaseStrategy.INCREASE_ALL_OTHER:
    computeIncreasesAllOther(increase, decreaseIndex, configSize);
    break;
  case increaseStrategy.INCREASE_LEFT_NEIGHBOR:
    computeIncreasesLeftNeighbor(increase, decreaseIndex, configSize);
    break;
  case increaseStrategy.INCREASE_RIGHT_NEIGHBOR:
    computeIncreasesRightNeighbor(increase, decreaseIndex, configSize);
    break;
  case increaseStrategy.INCREASE_BOTH_NEIGHBORS:
    computeIncreasesBothNeighbors(increase, decreaseIndex, configSize);
    break;
  default:
    break;
  }
}

/**
 * Compute configuration angle changes (deltas)
 * distribute changes equally among arcs
 *
 */
function computeDeltasDistributeEqually(deltas, decreaseIndex, decreaseAngle, increase) {
  let deltaPerIncrease = decreaseAngle / increase[0];
  for (let i = 1; i <= increase[0]; i++) {
    let index = increase[i];
    deltas[index] = deltaPerIncrease;
  }
  deltas[decreaseIndex] = (-1) * decreaseAngle;
}

/**
 * Compute configuration angle changes (deltas);
 * distribute changes among arcs proportionally to alpha values of the respective arc
 *
 */
function computeDeltasDistributeProportionally(deltas, decreaseIndex, decreaseAngle, cfgArcs, alphas, increase) {
  let sumIncreaseAlphas = 0.0;
  for (let i = 1; i <= increase[0]; i++) {
    let index = increase[i];
    sumIncreaseAlphas += cfgArcs[index].numberOfArcSegments * alphas[index];
  }
  for (let i = 1; i <= increase[0]; i++) {
    let index = increase[i];
    deltas[index] = ((cfgArcs[index]).numberOfArcSegments * alphas[index] / sumIncreaseAlphas) * decreaseAngle;
  }
  deltas[decreaseIndex] = (-1) * decreaseAngle;
}

/**
 * Compute configuration angle changes (deltas);
 *
 */
function computeDeltas(deltas, decreaseIndex, decreaseAngle, cfgArcs, alphas, increase) {
  const strategy = distributionStrategy.DISTRIBUTE_PROPORTIONALLY;
  switch (strategy) {
  case distributionStrategy.DISTRIBUTE_EQUALLY:
    computeDeltasDistributeEqually(deltas, decreaseIndex, decreaseAngle, increase);
    break;
  case distributionStrategy.DISTRIBUTE_PROPORTIONALLY:
    computeDeltasDistributeProportionally(deltas, decreaseIndex, decreaseAngle, cfgArcs, alphas, increase);
    break;
  default:
    break;
  }
}

/**
 * Search for the best loop configuration between
 * - the configuration with the new deltas computed applied
 * - the old configuration (best)
 *
 * @param node node to change
 * @param best best configuration
 * @param subtree subtree nodes
 * @param sizeSubtree number of subtree nodes
 * @param ancestorList top level tree nodes
 * @param sizeAncestorList number of top level tree nodes
 * @param puzzler puzzler options
 */
function searchBestConfig(node, deltas, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler) {
  /// linear search for best config between current state and desired state (with no intersections)
  let cfg = node.cfg;
  let configSize = cfg.numberOfArcs;

  /// apply the full range of changes
  applyDeltas(node, deltas, cfg.radius, puzzler);

  /// then search back for the first occuring valid state (which is then closest to the desired state)
  let numSteps = 10;
  let factor = 1.0 / numSteps;
  for (let i = 0; i < configSize; i++) {
    deltas[i] *= (-1) * factor;
  }

  let intersecting = checkIntersections(subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler);
  if (intersecting) {
    for (let currentStep = 0; currentStep < (numSteps - 1); ++currentStep) {
      applyDeltas(node, deltas, cfg.radius, puzzler);

      intersecting = checkIntersections(subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler);
      if (!intersecting) {
        // found improved config state
        // stop search
        break;
      }
    }
  }

  return (!intersecting);
}

function canShrink(alphas, numberOfArcs, unpairedAngle) {
  for (let currentArc = 0; currentArc < numberOfArcs; ++currentArc) {
    if (alphas[currentArc] <= unpairedAngle) {
      return 0;
    }
  }

  return 1;
}

/**
  * Optimize the loop of one specific node:
  * - reduce radius
  * - change config
  *
  */
function optimizeNode(node, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler) {
  if (node.childCount <= 0) {
    /// nothing to do for hairpin loops
//    printf("[%s] %c is hairpin-loop.\n", fnName, getNodeID(node));
    return 1.0;
  }

  let cfg = node.cfg;
  if (cfg.radius - cfg.defaultRadius < 5.0) {
    /// nothing to do if radius increase is small
//    printDebug(fnName, "%d is almost in default state. no operation.\n", getNodeID(node));
    return 1.0;
  }

  // configuration variables
  let minMultiple = 2;

  let configSize = cfg.numberOfArcs;

  /// Save initial loop configuration
  let initialConfig = cfgCloneConfig(cfg);

  /// Save best configuration so far
  let bestConfig = cfgCloneConfig(initialConfig);

  /// Save radius of initial loop configuration
  let initialRadius = cfg.radius;

  // Loop characteristics that do change with config changes
  let alphas = new Array(configSize);
  let spaces = new Array(configSize);
  let deltas = new Array(configSize);

  // Index arrays
  let sorted = new Array(configSize);
  let increase = new Array(configSize+1);

  // minimal index that has largest space available
  let minSortedIndex = 0;

  // Number of runs
  let runNr = 0;
  let runNrMax = 100 * configSize; // just in case ...

  let configChanged = 1;
  let unpairedAngle;
  while (minSortedIndex < configSize && runNr < runNrMax) {
    runNr++;

//    printDebug(fnName, "%d [%d] min sorted index: %d\n", getNodeID(node), runNr, minSortedIndex);

    /// save the number of (valid) entries at index 0 of increase
    increase[0] = 0;

    if (configChanged) {
      /// get current unpaired angle
      unpairedAngle = distanceToAngle(cfg.radius, puzzler.unpaired);

      /// compute current angle alpha between two unpaired bases for all arcs of a loop
      computeAlphas(alphas, cfg, puzzler.paired);

      if (canShrink(alphas, configSize, unpairedAngle)
        && shrinkLoopRadius(node, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler) < 1.0) {
//        printDebug(fnName, "%d (%d) shrinkLoopRadius: %16.12lf -- %16.12lf (%16.12lf)\n", getNodeID(node), runNr, cfg.radius, initialRadius, (cfg.radius / bestConfig.radius));
        /// save current config as best configuration
        // cfgFreeConfig(bestConfig);
        bestConfig = cfgCloneConfig(cfg);

        /// start process again
        minSortedIndex = 0;

        /// get current unpaired angle
        unpairedAngle = distanceToAngle(cfg.radius, puzzler.unpaired);

        /// compute current angle alpha between two unpaired bases for all arcs of a loop
        computeAlphas(alphas, cfg, puzzler.paired);
      } else {
        /// No improvement
        /// - reapply best config found so far
        applyConfig(node, bestConfig, puzzler);
      }

      if (minSortedIndex == 0) {
        /// Compute for each arc the available space between two wedges
        let pairedAngle = distanceToAngle(cfg.radius, puzzler.paired);
        getSpaces(node, configSize, pairedAngle, spaces);

        /// Sort alphas by size decreasing
//      for (let currentArc = minSortedIndex; currentArc < configSize; currentArc++) {
//        let index = currentArc;
//        printDebug(fnName, "%d unsorted arc[%d] alpha: %16.12lf space: %16.12lf\n", getNodeID(node), index, alphas[index], spaces[index]);
//      }
        bubblesort(configSize, alphas, spaces, sorted);
//      for (let currentArc = minSortedIndex; currentArc < configSize; currentArc++) {
//        let index = sorted[currentArc];
//        printDebug(fnName, "%d sorted arc[%d] alpha: %16.12lf space: %16.12lf\n", getNodeID(node), index, alphas[index], spaces[index]);
//      }
      }
    } else {
      /// apply best configuration found so far
      applyConfig(node, bestConfig, puzzler);
    }

    /// Find first arc with sufficient space based on alphas and spaces
    let decreaseIndex = -1;
    for (let index = minSortedIndex; index < configSize; index++) {
      let currentArc = sorted[index];
//      printDebug(fnName, "%d arc[%d] alpha: %16.12lf space: %16.12lf\n", getNodeID(node), currentArc, alphas[currentArc], spaces[currentArc]);
      let space = spaces[currentArc];
      if (space > MATH_PI) {
        space = MATH_PI;
      }
      /// having some space available is nice and sweet
      /// but does not suffice justifying such expensive actions
      /// therefore we claim a minimum distance to throw away in the drawing area

      let minSpace = minMultiple * unpairedAngle;
      if (space > minSpace) {
        decreaseIndex = currentArc;
        minSortedIndex = index + 1;
        break;
      }
    }

    if (decreaseIndex < 0) {
//      printDebug(fnName, "%d no valid arcs for shrinking.\n", getNodeID(node));
      /// No arc found: leave
      break;
    }

    /// Check if current arc has sufficient space
    let space = spaces[decreaseIndex];
    let minNecessarySpace = (cfg.cfgArcs[decreaseIndex]).numberOfArcSegments * unpairedAngle;
    let currentNecessarySpace = (cfg.cfgArcs[decreaseIndex]).numberOfArcSegments * alphas[decreaseIndex];

    const factor = 0.5;
    // const let factor = 1.0;
    let decreaseAngle = factor * Math.min((currentNecessarySpace - minNecessarySpace), space);
    if (decreaseAngle < epsilon3) {
      /// decreaseAngle too small: leave
      continue;
    }

    /// Mark arcs for increase
    computeIncreases(increase, decreaseIndex, configSize);

    /// Compute configuration angle changes (deltas)
    computeDeltas(deltas, decreaseIndex, decreaseAngle, cfg.cfgArcs, alphas, increase);

//    printDebug(fnName, "%d hook 1\n", getNodeID(node));

    /// Apply changes as far as possible (start):
    /// linear search for best config between current state and desired state (with no intersections)
//      printDebug(fnName, "%d searchBestConfig\n", getNodeID(node));
    configChanged = searchBestConfig(node,
                     deltas,
                     subtree,
                     sizeSubtree,
                     ancestorList,
                     sizeAncestorList,
                     puzzler
                     );
  }

  /// apply best configuration found so far
  applyConfig(node, bestConfig, puzzler);

  if (runNr >= runNrMax) {
    // Check if improvement search ran out of attempts . bad sign
    console.log("run number exceeded during node optimization\n");
  }

  /// Finished improvements
//  printDebug(fnName, "%d radii: %16.12lf -- %16.12lf\n", getNodeID(node), bestConfig.radius, initialConfig.radius);
  if (bestConfig.radius < initialConfig.radius) {
    // if (FANCY_PS) {
    //   applyConfig(node, initialConfig, puzzler);
    //   PS_printFancyTree(node, puzzler);
    //   applyConfig(node, bestConfig, puzzler);
    // }

    /// best radius smaller than initial radius: log changes
    for (let i = 0; i < configSize; i++) {
      deltas[i] = getArcAngle(bestConfig, i) - getArcAngle(initialConfig, i);
    }
    (puzzler.numberOfChangesAppliedToConfig)++;
    // logConfigChanges(getNodeID(node), cfg, deltas, initialConfig.radius, bestConfig.radius, "OPT", puzzler);

    // if (FANCY_PS) {
    //   PS_printFancyTree(node, puzzler);
    // }
  } else {
    /// otherwise revert to initial state
    applyConfig(node, initialConfig, puzzler);
  }


  /// compute and return gain in radius size
  let shrinkRatio = cfg.radius / initialRadius;

//  printDebug(fnName, "%d radius: %12.8f . %12.8f (%12.8f%%)\n", getNodeID(node), radiusBeforeShrinking, radiusAfterShrinking, shrinkRatio * 100.0);

  return shrinkRatio;
}

function optimizeTreeRecursive(node, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler) {
  let shrinkingRatio = 1.0;

  let ratio = 1.0;
  let minRatio = 1.0;
  do {
    if (puzzler.numberOfChangesAppliedToConfig > puzzler.maximumNumberOfConfigChangesAllowed) {
      console.log("Reached maximum number of changes. Abort.\n");
      minRatio = 1.0;
      break;
    }

    minRatio = 1.0;
    /// do loop until nothing improves further
    /// recursive optimization of all children
    for (let currentChild = 0; currentChild < node.childCount; currentChild++) {
      let child = ctree.getChild(node, currentChild);
      ratio = optimizeTreeRecursive(child, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler);
      minRatio = Math.min(ratio, minRatio);
      shrinkingRatio *= ratio;
    }

    if (minRatio < 1.0) {
      continue;
    }

    if (!ctree.isExterior(node)) {
      /// shrink current node
      ratio = optimizeNode(node, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler);
      minRatio = Math.min(ratio, minRatio);
      shrinkingRatio *= ratio;
    }
  } while (minRatio < 1.0);

  return shrinkingRatio;
}

export function optimizeTree(node, puzzler) {

  if (!puzzler.optimize) {
    return 1.0;
  }

  let shrinkingRatio = 1.0;

  /// Collect subtree and ancestor tree nodes for intersection tests
  let sizeSubtree = ctree.countSubtreeNodes(node);
  let subtree = new Array(sizeSubtree);
  ctree.collectSubtreeNodes(node, subtree, 0);

  let sizeAncestorList = ctree.countAncestorNodes(node);
  let ancestorList = new Array(sizeAncestorList);
  ctree.collectAncestorNodes(node, ancestorList);

  if (!checkIntersections(subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler)) {
    /// Only start if subtree does not intersect with ancestor tree
    shrinkingRatio = optimizeTreeRecursive(node, subtree, sizeSubtree, ancestorList, sizeAncestorList, puzzler);
  } else {
    /// nothing to do if children are intersecting
    console.log("Optimization called while %d's subtree intersecting with itself or ancestors!\n", ctree.getNodeID(node));
  }

  return shrinkingRatio;
}
