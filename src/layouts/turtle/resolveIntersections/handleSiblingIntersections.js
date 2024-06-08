import * as ctree from "../data/configtree";
import { getBoundingWedge } from "./boundingWedge";
import { intersectTrees } from "../intersectLevel/intersectLevelTreeNodes";
import { calcDeltas } from "./calcDeltas";
import { checkAndApplyConfigChanges } from "./handleConfigChanges";
import { intersectionType } from "./intersectionType";
    
const MATH_PI_HALF = Math.PI / 2;
const _false     = 0x0000;
const _intersect = 0x0001;
const _changed   = 0x0002;

/**
 * @brief fixIntersectionOfSiblings
 *    Try to fix intersections of sibling subtrees at their common ancestor.
 * @param tree
 *    common ancestor of intersecting subtrees
 * @param left
 * @param right
 * @param deltaCfg
 * @param puzzler
 * @return
 *    1 if something was changed, 0 otherwise
 */
function fixIntersectionOfSiblings(tree, left, right, deltaCfg, puzzler) {
  let wedgeMin, wedgeMax;
  [wedgeMin, wedgeMax] = getBoundingWedge(tree, right, wedgeMin, wedgeMax);
  let minAngle = wedgeMin;
  [wedgeMin, wedgeMax] = getBoundingWedge(tree, left, wedgeMin, wedgeMax);
  let maxAngle = wedgeMax;
  let targetAngle = minAngle - maxAngle;

  let changed = 0;
  if (targetAngle < 0) {
    targetAngle = Math.max(targetAngle, -MATH_PI_HALF); // limit the angle to avoid malformed structures
  let changedAngle = calcDeltas(tree, ctree.getParent(tree), left, right, (-1) * targetAngle, puzzler, deltaCfg);

    if (changedAngle != 0.0) {

      let leftNode  = ctree.getChild(tree, left);
      let rightNode = ctree.getChild(tree, right);
      // if (FANCY_PS) {
      //   PS_printFancySiblings(tree, leftNode, rightNode, puzzler);
      // }

      // apply all changes
      changed = checkAndApplyConfigChanges(tree, deltaCfg, intersectionType.siblings, puzzler);

      // if (FANCY_PS) {
      //   PS_printFancySiblings(tree, leftNode, rightNode, puzzler);
      // }

      //printf("[%s] changed: %d\n", fnName, changed);
    }
  }

  return changed;
}

/**
 * @brief handleIntersectionOfSiblings
 *    Try to fix intersections of sibling subtrees at their common ancestor.
 * @param tree
 *    common ancestor of intersecting subtrees
 * @param listOfIntersections
 *    list of pairs of indices of subtrees that are intersecting.
 *    [numberOfIntersections, [i1, j1], [i2, j2], ...]
 * @return
 *    1 if something was changed, 0 otherwise
 */
function handleIntersectionOfSiblings(tree, listOfIntersections, puzzler) {
  let fnName = "FIX INTERSECTION OF SIBLINGS";

  /// idea:
  /// - measure each intersection by calculating an overlap angle
  /// - increase the spaces between intersectors and decrease spaces that are not between them
  /// - distribute the overlap angle equally to all participating spaces
  /// - check for new or remaining intersections (at the end)

  if (puzzler.numberOfChangesAppliedToConfig > puzzler.maximumNumberOfConfigChangesAllowed) {
    console.log(fnName, "Reached maximum number of changes. Abort.\n");
    return -1;
  }

  let changed = 0;
  let intersectionCount = listOfIntersections[0];

    /*
    printf("[%s] Summary: [", fnName);
    for (let i = 0; i < intersectionCount; i++) {
      let left = listOfIntersections[2*i+1];
      let right = listOfIntersections[2*i+2];
      let childLeft  = getChild(tree, left);
      let childRight = getChild(tree, right);
      if (i > 0) {
        printf("\n[%s]       ", fnName);
      }
      printf(" %d[%d]=%d vs. %d[%d]=%d"
           , getNodeID(tree), left, getID(childLeft)
           , getNodeID(tree), right, getID(childRight)
           );
    }
    printf(" ]\n");
    */

  let childCount = tree.childCount;
  let configSize = childCount + 1;

  let deltaCfg   = new Array(configSize);

  /// init deltas with zero
  for (let i = 0; i < configSize; i++) {
    deltaCfg[i] = 0.0;
  }

  /// fix intersections of siblings
  for (let k = 0; k < intersectionCount; k++) { // for all intersections - start
    let left  = listOfIntersections[2 * k + 1];
    let right = listOfIntersections[2 * k + 2];

    /*
    let childLeft  = getChild(tree, left);
    let childRight = getChild(tree, right);
    printf("[%s] %d[%d]=%d vs. %d[%d]=%d\n"
         , fnName
         , getNodeID(tree), left, getNodeID(childLeft)
         , getNodeID(tree), right, getNodeID(childRight)
         );
    */

    changed = fixIntersectionOfSiblings(tree, left, right, deltaCfg, puzzler);
    if (changed) {
      break;
    }
  }


  return changed;
}

export function checkSiblings(node, puzzler) {
  let fnName = "CHECK SIBLINGS";
  let ret = _false;

  let childCount = node.childCount;
  /// create array to store all information about overlapping neighbors
  let intersectorsBranches = new Array(childCount * childCount);
  for (let i = 0; i < childCount * childCount; i++) {
    intersectorsBranches[i] = -1;
  }

  /// actually check for those intersections ...
  for (let i = 0; i < childCount; i++) {
    let intersectorsCount = 0;
    for (let j = i+1; j < childCount; j++) {
      let childI = ctree.getChild(node, i);
      let childJ = ctree.getChild(node, j);
      if (intersectTrees(childI, childJ)) {
        intersectorsBranches[i * childCount + intersectorsCount] = j;
        intersectorsCount++;
      }
    }
  }

  /// ... and count them
  let intersectionCount = 0;
  for (let i = 0; i < (childCount * childCount); i++) {
    if (intersectorsBranches[i] != -1) {
      intersectionCount++;
    }
  }

  if (intersectionCount > 0) {
    ret |= _intersect;

    /// transform intersection information into format
    /// [ count, [intersector_a, intersector_b], [intersector_a, intersector_b], ... ]
    /// where count states how many pairs of a/b are there
    /// the i-th intersection has index a=2*i+1; b=2*i+2
    let listOfIntersections = new Array(1 + 2 * intersectionCount);
    listOfIntersections[0] = intersectionCount;

    let counter = 0;
    for (let i = 0; i < (childCount * childCount); i++) {
      if (intersectorsBranches[i] != -1) {
        // i / childCount is integer division in C
        listOfIntersections[2 * counter + 1] = Math.floor(i / childCount);
        listOfIntersections[2 * counter + 2] = intersectorsBranches[i];
        counter++;
      }
    }

    /// resolve all of those intersections for this node's subtrees
    let retFix = handleIntersectionOfSiblings(node, listOfIntersections, puzzler);
    if (retFix < 0) {
      ret = retFix;
    } else if (retFix) {
      ret |= _changed;
    }

  }


  return ret;
}

