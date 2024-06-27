import * as ctree from "../data/configtree";
import * as vmath from "../vector_math";
import { intersectionType } from "./intersectionType";
import { createStemBox, createLoopBox } from "../data/boundingBoxes";
import { intersectNodeNode, intersectNodeExterior } from "../intersectLevel/intersectLevelTreeNodes";
import { getRotationAngle } from "./rotationAngle";
import { calcDeltas } from "./calcDeltas";
import { checkAndApplyConfigChanges } from "./handleConfigChanges";

const MATH_PI = Math.PI;
const MATH_PI_HALF = MATH_PI / 2;
const EXTERIOR_Y = 100.0;

/**
 * - -1 if rotation is counter-clockwise
 * - 1 if rotation is clockwise
 * - 0 else
 */
function TENTATIVE3_getRotationSign(path, pathLength, it) {
  let result = 0;

  if (pathLength < 2) {
    console.log("[CRITICAL] path length: %d\n", pathLength);
    return result;
  }

  /// Compute rotation angle
  let angle = 0.0;
  let currentNode = path[0];
  let childNode;
  for (let i = 1; i < pathLength; i++) {
    childNode = path[i];
    angle += ctree.getChildAngle(currentNode, childNode);
//    printInformation(fnName, "child angle %d:  %12.8lf\n", i, angle);
    angle -= MATH_PI;
//    printInformation(fnName, "turtle angle %d: %12.8lf\n", i, angle);
    currentNode = childNode;
  }
//  printInformation(fnName, "angle: %12.8lf\n", angle);

  /// add bulge angle to angle sum
  switch(it) {
  case intersectionType.BxL:
    if (vmath.isToTheRightPointPoint(path[0].sBox.c, path[0].lBox.c, path[pathLength-1].sBox.c)) {
      angle += MATH_PI_HALF;
    } else {
      angle -= MATH_PI_HALF;
    }
    break;
  case intersectionType.LxB:
    if (vmath.isToTheRightPointPoint(path[pathLength-1].sBox.c, path[pathLength-1].lBox.c, path[0].sBox.c)) {
      angle += MATH_PI_HALF;
    } else {
      angle -= MATH_PI_HALF;
    }
    break;
  }

  /// Determine return value
  if (angle < 0.0) {
    result = 1;
  } else if (angle > 0.0) {
    result = -1;
  } else {
    result = 0;
  }

//  printDebug(fnName, "return: %d (%12.8lf°)\n", result, angle);
  return result;
}

/**
 * - -1 if rotation is counter-clockwise
 * - 1 if rotation is clockwise
 * - 0 else
 */
function TENTATIVE2_getRotationSign(path, pathLength) {
  let result = 0;

  if (pathLength < 2) {
    console.log("[CRITICAL] path length: %d\n", pathLength);
    return result;
  }

  /// Compute rotation angle
  let angle = 0.0;
  let currentNode = path[0];
  let childNode;
  for (let i = 1; i < pathLength; i++) {
    childNode = path[i];
    angle += ctree.getChildAngle(currentNode, childNode);
//    printInformation(fnName, "child angle %d:  %12.8lf\n", i, angle);
    angle -= MATH_PI;
//    printInformation(fnName, "turtle angle %d: %12.8lf\n", i, angle);
    currentNode = childNode;
  }
//  printInformation(fnName, "angle: %12.8lf\n", angle);

  /// Determine return value
  if (angle < 0.0) {
    result = 1;
  } else if (angle > 0.0) {
    result = -1;
  } else {
    result = 0;
  }

//  printDebug(fnName, "return: %d (%12.8lf°)\n", result, angle);
  return result;
}

/**
 * - -1 if rotation is counter-clockwise
 * - 1 if rotation is clockwise
 * - 0 else
 */
function getRotationSign(path, pathLength) {

  let result = 0;

  if (pathLength < 2) {
    console.log("[CRITICAL] path length: %d\n", pathLength);
    return result;
  }

  let angle = 0.0;

  if (pathLength == 2) {
    /// path has length 2
    /// . only one loop and intersector
    /// . get angle of child of this loop
//    printDebug(fnName, "[PATH LENTH 2] [%s %5d] %d elements\n", puzzler.filename, puzzler.numberOfChangesAppliedToConfig, pathLength);
//    printPath(fnName, path, pathLength, -1);
//    PS_printPath(path[0], path[pathLength - 1], puzzler);
    angle = ctree.getChildAngle(path[0], path[1]);
    angle -= MATH_PI;
  } else {
    /// path has more than two usable loops

    /// center of the angle calculation
    let center = [];
    ctree.getLoopCenter(path[1], center);

    /// reference polet for the axis center.refPoint
    let refPoint = [];
    refPoint[0] = center[0] + 1000 * path[1].sBox.a[0];
    refPoint[1] = center[1] + 1000 * path[1].sBox.a[1];

    /// initial axis equals 0°
    /// left  rotations get negative angles
    /// right rotations get positive angles

    for (let i = 2; i < pathLength; i++) {
      /// get the next node's center ...
      let point = [];
      ctree.getLoopCenter(path[i], point);

      /// update angle
      let diffAngle = vmath.anglePtPtPt2D(refPoint, center, point);
      if (!vmath.isToTheRightPointPoint(center, refPoint, point)) {
        diffAngle *= -1;
      }
      angle += diffAngle;

      /// update the reference axis
      refPoint[0] = point[0];
      refPoint[1] = point[1];
    }
  }

//  printDebug(fnName, "angle: %+7.2f\n", angle);

  if (angle > 0.0) {
    result = -1;
  }
  if (angle < 0.0) {
    result = 1;
  }
//  printDebug(fnName, "return: %d\n", result);

  if (result == 0) {
    console.log("[CRITICAL] there should always be a non-zero rotation sign. Maybe non-intersecting call?\n");
  }

  return result;
}

function fixIntersectionWithAncestor(ancestor, rotationNode, intersector, rotationIndex, rotationSign, it, puzzler) {

  if (rotationNode == ancestor && (it == intersectionType.LxL || it == intersectionType.LxS || it == intersectionType.LxB)) {
//    printf("[%s] [%d %d %d] no-op at ancestor with type %s\n", fnName, getNodeID(ancestor), getNodeID(rotationNode), getNodeID(intersector), intersectionTypeToString(it));
    return 0;
  }

  let interiorChildAngle;
  if (ctree.isInteriorLoop(rotationNode)) {
    /// prevent interior loops from increasing the distance to their "straight" state
    /// We only allow rotations towards straight.
    interiorChildAngle = ctree.getChildAngleByIndex(rotationNode, 0);
    let allowedRotationSign = 0;
    if (interiorChildAngle > MATH_PI) {
      allowedRotationSign = -1;
    } else if (interiorChildAngle < MATH_PI) {
      allowedRotationSign = 1;
    }
    if (rotationSign != allowedRotationSign) {
      return 0;
    }
  }

  /// get the rotation angle depending on the intersection type
  let rotationAngle = getRotationAngle(ancestor, rotationNode, intersector, it, rotationSign);

  if (ctree.isInteriorLoop(rotationNode)) {
    /// prevent interior loops from rotating over their "straight" state
    /// If necessary we limit the rotation so that this interior loop becomes straight.
    let diffToStraight = MATH_PI - interiorChildAngle;
    if (Math.abs(rotationAngle) > Math.abs(diffToStraight)) {
      rotationAngle = diffToStraight;
    }
  }

  let changed = 0;
  if (rotationAngle != 0.0) {
    /// compute the deltas for changing the configuration of this loop
    let deltas = new Array(rotationNode.childCount + 1);
    let deltaAngle = Math.abs(rotationAngle);
    let indexLeft = -2;
    let indexRight = -2;
    if (rotationAngle > 0.0) {
      indexLeft = -1;
      indexRight = rotationIndex;
    } else {
      indexLeft = rotationIndex;
      indexRight = -1;
    }

    calcDeltas(rotationNode, ancestor, indexLeft, indexRight, deltaAngle, puzzler, deltas);

    /// check and apply the computed changes to the configuration of this loop
    let itLog = (ctree.isExterior(ancestor) ? intersectionType.exterior : it);
    changed = checkAndApplyConfigChanges(rotationNode, deltas, itLog, puzzler);

    // if (FANCY_PS) {
      // PS_printFancyPath(ancestor, intersector, rotationNode, puzzler);
    // }

  }

  if (changed) {
    return rotationNode;
  } else {
    return null;
  }
}

/**
 * check if loop is interior and straight
 */
function isStraightInteriorLoop(node) {
  return (ctree.isInteriorLoop(node) && (ctree.getChildAngleByIndex(node, 0) == MATH_PI));
}


/**
 * compute intersection path from ancestor to intersector
 * skipping straight interior loops that can not be used for rotations
 * . improves rotation angle and rotation loop computations
 */
function constructReducedIntersectionPath(ancestor, intersector, it) {
  /// - compute path length
  let pathLength = 1;
  let node = intersector;
  while (node != ancestor) {
    node = ctree.getParent(node);
    if (!isStraightInteriorLoop(node)) {
      /// skip straight interior loops
      ++pathLength;
    }
  }

  switch (it) {
    case intersectionType.LxL:
    case intersectionType.LxS:
    case intersectionType.LxB:
      /// - start at the child of the ancestor node for Lx? intersections
      if (!isStraightInteriorLoop(ancestor)) {
        /// exclude ancestor from reduced path
        --pathLength;
      }
      break;
    default:
      /// - include ancestor node for all other intersections (if not straight interior loop)
      ;
  }

  /// - construct path
  let path = new Array(pathLength);
  node = intersector;
  for (let i = pathLength - 1; i >= 0; node = ctree.getParent(node)) {
    if ((i == pathLength - 1) || !isStraightInteriorLoop(node)) {
      path[i] = node;
      i--;
    }
  }

  return path;
}

/**
 */
function handleIntersectionWithAncestor(ancestor, intersector, recursionDepth, puzzler) {

  /// Determine intersection type
  let it = intersectNodeNode(ancestor, intersector);
  if (it == intersectionType.noIntersection) {
    /// Early termination for no intersection.
    console.log("wrong input. there is no intersection for %d and %d. [%s_DEBUG_PATH_%05d_%04d_vs_%04d.ps]\n",
           ctree.getNodeID(ancestor),
           ctree.getNodeID(intersector),
           puzzler.filename,
           puzzler.numberOfChangesAppliedToConfig,
           ctree.getNodeID(ancestor),
           ctree.getNodeID(intersector));
    return null;
  }

  /// construct path from ancestor to intersector
  //treeNode** path = constructIntersectionPath(ancestor, intersector, it, &pathLength);
  let path = constructReducedIntersectionPath(ancestor, intersector, it);
  let pathLength = path.length;

  /// at each node determine child to follow
  let childIndex = new Array(pathLength-1);
  for (let i = 0; i < pathLength - 1; i++) {
    childIndex[i] = ctree.getChildIndex(path[i], ctree.getNodeID(path[i+1]));
  }

  /// node changed by trying to fix intersection
  let changedNode = null;

  /// Compute orientation of reduced path
  //let rotationSign = getRotationSign(path, pathLength);
  let rotationSign = TENTATIVE2_getRotationSign(path, pathLength);
  //let tentative_rotationSign = TENTATIVE2_getRotationSign(path, pathLength, it);

  /* DZ: check
  if (rotationSign != tentative_rotationSign && !isExterior(ancestor)) {
    printWarning(fnName,
           "Old rotation sign != new rotation sign: %d != %d; child : %d\n",
           rotationSign,
           tentative_rotationSign,
           getChildIndex(ancestor, getNodeID(intersector))
          );
    PS_printFancyPath(ancestor, intersector, null, puzzler);
  }
  */

  if (rotationSign == 0) {
    /// path is straight . no intersection
    console.log("[FAILED] invalid rotation sign (zero) for %04d and %04d. [%s_DEBUG_PATH_%05d_%04d_vs_%04d.ps]\n",
           ctree.getNodeID(ancestor),
           ctree.getNodeID(intersector),
           puzzler.filename,
           puzzler.numberOfChangesAppliedToConfig,
           ctree.getNodeID(ancestor),
           ctree.getNodeID(intersector));
//    PS_printPath(ancestor, intersector, puzzler);
  } else {

//  printf("[%s] Path of %d vs. %d ...", fnName, getNodeID(ancestor), getNodeID(intersector));
//  for (let i = 0; i < pathLength; i++) {
//    printf(" %d(%d)", getNodeID(path[i]), path[i].childCount);
//  }
//  printf("\n");

    // if (FANCY_PS) {
    //   PS_printFancyPath(ancestor, intersector, null, puzzler);
    // }

    /// run from intersector to ancestor twice:
    /// - in the first run we only choose interior loops for rotations
    let nodeNumber = pathLength - 2; // skip intersector, start with its first ancestor
    while ((changedNode == null) && (nodeNumber >= 0)) {
      if (ctree.isInteriorLoop(path[nodeNumber])) {
        // if (FANCY_PS) {
        //   PS_printFancyPath(ancestor, intersector, path[nodeNumber], puzzler);
        // }

        /// interior loop: try to improve
        changedNode = fixIntersectionWithAncestor(ancestor, path[nodeNumber], intersector, childIndex[nodeNumber], rotationSign, it, puzzler);
      }

      /// go to non-straight ancestor
      nodeNumber--;
    }

    /// - in the second run we only choose multi loop for rotations
    nodeNumber = pathLength - 2; // skip intersector, start with its first ancestor
    while ((changedNode == null) && (nodeNumber >= 0)) {
      if (ctree.isMultiLoop(path[nodeNumber])) {
        // if (FANCY_PS) {
        //   PS_printFancyPath(ancestor, intersector, path[nodeNumber], puzzler);
        // }

        /// multi-loop: try to improve
        changedNode = fixIntersectionWithAncestor(ancestor, path[nodeNumber], intersector, childIndex[nodeNumber], rotationSign, it, puzzler);
      }

      /// go to non-straight ancestor
      nodeNumber--;
    }
  }

  if (changedNode == null) {
    console.log("[FAILED] to resolve %04d vs. %04d (%s) [%s_DEBUG_PATH_%05d_%04d_vs_%04d.ps]\n",
           ctree.getNodeID(ancestor),
           ctree.getNodeID(intersector),
           (changedNode != null ? "changed" : "not changed"),
           puzzler.filename,
           puzzler.numberOfChangesAppliedToConfig,
           ctree.getNodeID(ancestor),
           ctree.getNodeID(intersector)
          );
    // printPath(fnName, path, pathLength, -1);
    // PS_printPath(ancestor, intersector, puzzler);
  }


//  printf("[%s] %d vs. %d [RETURN %d]\n", fnName, getNodeID(ancestor), getNodeID(intersector), ret);
  return changedNode;
}

function TENTATIVE2_updateExteriorBoundingBoxes(exterior, loop, stemNorthX, stemSouthX, stemWestY, stemEastY) {
  let s  = [stemSouthX, stemWestY]; // south / west corner
  let e  = [stemNorthX, stemWestY]; // north / west corner
  let sp = [stemSouthX, stemEastY]; // south / east corner
  let stem = createStemBox(s, e, sp);

  exterior.lBox = loop;
  exterior.sBox = stem;
  loop.parent = exterior;
  stem.parent = exterior;

  ctree.updateAABB(exterior.aabb, stem, loop);
}

function TENTATIVE3_setupExteriorBoundingBoxes(exterior, topLevelAncestor, intersector, puzzler) {
  /// determine loop
  let upperY = EXTERIOR_Y;
  // let lowerY = 0.0;
  let lowerY = upperY - puzzler.paired;

  let loopX = topLevelAncestor.lBox.c[0];

  let radius = 0.5 * (upperY - lowerY);
  let center = [loopX, upperY - radius];

  /// determine stem
  let stemNorthX = loopX;
  let stemSouthX = loopX;

  let intersectorAABB = intersector.aabb;
  if (intersectorAABB.max[0] < loopX) {
    /// intersector is left of topLevelAncestor
    /// use distance aabb.min[0] .. loopX for stem setup
    let stemNorthX = loopX;
    let stemSouthX = intersectorAABB.min[0];
    let stemWestY = upperY;
    let StemEastY = lowerY;

    let loop = createLoopBox(center, radius);
    TENTATIVE2_updateExteriorBoundingBoxes(
      exterior,
      loop,
      stemNorthX,
      stemSouthX,
      stemWestY,
      StemEastY
    );
  } else if (loopX < intersectorAABB.min[0]) {
    /// intersector is right of topLevelAncestor
    /// use distance loopX .. aabb.max[0] for stem setup
    let stemNorthX = loopX;
    let stemSouthX = intersectorAABB.max[0];
    let stemWestY = lowerY;
    let StemEastY = upperY;

    let loop = createLoopBox(center, radius);
    TENTATIVE2_updateExteriorBoundingBoxes(
      exterior,
      loop,
      stemNorthX,
      stemSouthX,
      stemWestY,
      StemEastY
    );
  } else {
    /// intersector shares some space in x direction with topLevelAncestor
    /// use distance aabb.min[0] .. loopX for stem setup
    /// then check of intersection
    /// if noIntersection
    /// use distance loopX .. aabb.max[0] for stem setup
    let stemNorthX = loopX;
    let stemSouthX = intersectorAABB.min[0];
    let stemWestY = upperY;
    let StemEastY = lowerY;

    let loop = createLoopBox(center, radius);
    TENTATIVE2_updateExteriorBoundingBoxes(
      exterior,
      loop,
      stemNorthX,
      stemSouthX,
      stemWestY,
      StemEastY
    );

    if (intersectionType.noIntersection == intersectNodeNode(intersector, exterior)) {
      let stemNorthX = loopX;
      let stemSouthX = intersectorAABB.max[0];
      let stemWestY = lowerY;
      let StemEastY = upperY;

      let loop = createLoopBox(center, radius);
      TENTATIVE2_updateExteriorBoundingBoxes(
        exterior,
        loop,
        stemNorthX,
        stemSouthX,
        stemWestY,
        StemEastY
      );
    }
  }
}

function TENTATIVE_updateExteriorBoundingBoxes(exterior, loop, stemBottom, stemTop, stemLeft, stemRight) {
  let s  = [stemBottom, stemRight];
  let e  = [stemTop, stemRight];
  let sp = [stemBottom, stemLeft];
  let stem = createStemBox(s, e, sp);

  exterior.lBox = loop;
  exterior.sBox = stem;
  loop.parent = exterior;
  stem.parent = exterior;

  ctree.updateAABB(exterior.aabb, stem, loop);
}

function TENTATIVE2_setupExteriorBoundingBoxes(exterior, topLevelAncestor, intersector, puzzler) {
  /// determine loop
  let upperY = EXTERIOR_Y;
  // let lowerY = 0.0;
  let lowerY = upperY - puzzler.paired;

  let loopX = topLevelAncestor.lBox.c[0];

  let radius = 0.5 * (upperY - lowerY);
  let center = [loopX, upperY - radius];

  /// determine stem
  let stemMinX = loopX;
  let stemMaxX = loopX;

  let intersectorAABB = intersector.aabb;
  let it = intersectionType.noIntersection;
  if ((intersectorAABB.min)[0] < stemMinX) {
    // setup left side of ancestor
    stemMinX = (intersectorAABB.min)[0];

    let loop = createLoopBox(center, radius);
    TENTATIVE_updateExteriorBoundingBoxes(
      exterior,
      loop,
      stemMinX,
      stemMaxX,
      upperY,
      lowerY
    );

    // check left side for intersection
    it = intersectNodeNode(intersector, exterior);
  }

  if (it == intersectionType.noIntersection) {
    // left side of ancestor does not intersect
    // . setup right side of ancestor
    stemMinX = loopX;
    if ((intersectorAABB.max)[0] > stemMaxX) {
      stemMaxX = (intersectorAABB.max)[0];
    }

    // recreate loopBox (previous one will be destroyed)
    let loop = createLoopBox(center, radius);
    TENTATIVE_updateExteriorBoundingBoxes(
      exterior,
      loop,
      stemMaxX,
      stemMinX,
      lowerY,
      upperY
    );
  }
}

function TENTATIVE_setupExteriorBoundingBoxes(exterior, topLevelAncestor, intersector, puzzler) {
  /// determine loop
  let upperY = EXTERIOR_Y;
  // let lowerY = 0.0;
  let lowerY = upperY - puzzler.paired;

  let loopX = topLevelAncestor.lBox.c[0];

  let radius = 0.5 * (upperY - lowerY);
  let center = [loopX, upperY - radius];

  /// determine stem
  let stemMinX = loopX;
  let stemMaxX = loopX;
  let loop = createLoopBox(center, radius);

  const intersectorAABB = intersector.aabb;
  let it = intersectionType.noIntersection;
  if ((intersectorAABB.min)[0] < stemMinX) {
    stemMinX = (intersectorAABB.min)[0];
  }
  if ((intersectorAABB.max)[0] > stemMaxX) {
    stemMaxX = (intersectorAABB.max)[0];
  }

  let s  = [stemMinX, upperY];
  let e  = [stemMaxX, upperY];
  let sp = [stemMinX, lowerY];
  let stem = createStemBox(s, e, sp);

  exterior.lBox = loop;
  exterior.sBox = stem;
  loop.parent = exterior;
  stem.parent = exterior;

  ctree.updateAABB(exterior.aabb, stem, loop);
}

function setupExteriorBoundingBoxes(exterior, topLevelAncestor, intersector, puzzler) {
  /// get bounding box for exterior
  let parentOfIntersector = getParent(intersector);
  let refStem = intersector.sBox;
  let refLoop = intersector.lBox;
  let minX = refStem.c[0];
  let maxX = minX;
  let x = [];
  x[0] = parentOfIntersector.lBox.c[0] + parentOfIntersector.lBox.r;
  x[1] = parentOfIntersector.lBox.c[0] - parentOfIntersector.lBox.r;
  x[2] = refLoop.c[0] + refLoop.r;
  x[3] = refLoop.c[0] - refLoop.r;
  for (let i = 0; i < 4; i++) {
    minX = fmin(minX, x[i]);
    maxX = fmax(maxX, x[i]);
  }
  minX -= epsilonFix;
  maxX += epsilonFix;

  let upperY = EXTERIOR_Y;
  let lowerY = 0.0;
  // let lowerY = upperY - puzzler.paired;

  let topLevelX = topLevelAncestor.lBox.c[0];
  let s = [], e = [], sp = [];

  /// (1) iParent above direct child
  /// (1.1) iNode left of direct child
  /// (1.2) iNode right of direct child
  /// (2) iParent and iNode on same side of direct child
  /// (2.1) both left of direct child
  /// (2.1) both right of direct child
  /// (3) iParent and iNode on different sides of direct child
  /// (3.1) exterior cut polet is between iParent and direct child
  /// (3.1) exterior cut polet is between iNode and direct child

  if (Math.abs(parentOfIntersector.lBox.c[0] - topLevelX) < epsilon0) {
    /// (1)
    if (refLoop.c[0] < topLevelX) {
      /// (1.1)
//      printf("[%s] case 1.1\n", fnName);
      s[0]  = x[3];     s[1]  = lowerY;
      e[0]  = topLevelX;  e[1]  = lowerY;
      sp[0] = x[3];     sp[1] = upperY;
    } else if (refLoop.c[0] > topLevelX) {
      /// (1.2)
//      printf("[%s] case 1.2\n", fnName);
      s[0]  = x[2];     s[1]  = lowerY;
      e[0]  = topLevelX;  e[1]  = lowerY;
      sp[0] = x[2];     sp[1] = upperY;
    } else {
      /// this would mean rootNode and intersectorNode coincide...
      /// since this would cause an interior intersection
      /// we just ignore this case here while giving the following hint.
      console.log("unrecognized case (1.#).\n");
    }
  } else {
    let sameSide = (refLoop.c[0] - topLevelX < 0) == (parentOfIntersector.lBox.c[0] - topLevelX < 0);
    if (sameSide) {
      /// (2)
      if (parentOfIntersector.lBox.c[0] < topLevelX) {
        /// (2.1)
//        printf("[%s] case 2.1\n", fnName);
        // take minX
        s[0]  = minX;     s[1]  = upperY;
        e[0]  = topLevelX;  e[1]  = upperY;
        sp[0] = minX;     sp[1] = lowerY;
      } else if (parentOfIntersector.lBox.c[0] > topLevelX) {
        /// (2.2)
//        printf("[%s] case 2.2\n", fnName);
        // take maxX
        s[0]  = maxX;     s[1]  = lowerY;
        e[0]  = topLevelX;  e[1]  = lowerY;
        sp[0] = maxX;     sp[1] = upperY;
      } else {
        console.log("unrecognized case (2.#).\n");
      }
    } else {
      /// (3)
      let l1p1 = [], l1p2 = [], l2p1 = [], l2p2 = [];
      let pParent = [];
      ctree.getLoopCenter(parentOfIntersector, pParent);
      let pIntersector = [];
      ctree.getLoopCenter(intersector, pIntersector);
      if (pIntersector[1] < upperY) {
        l1p2[0] = pIntersector[0];
        l1p2[1] = pIntersector[1];
      } else {
        let dx = pIntersector[0] - pParent[0];
        let dy = pIntersector[1] - pParent[1];
        let scale = (lowerY - pParent[1]) / dy;
        l1p2[0] = pParent[0] + scale * dx;
        l1p2[1] = pParent[1] + scale * dy;
      }

      l1p1[0] = pParent[0];
      l1p1[1] = pParent[1];

      l2p1[0] = pParent[0];
      l2p1[1] = upperY;
      l2p2[0] = topLevelX;
      l2p2[1] = upperY;

//      GEOGEBRA_printLinePointPoint("lParent", l1p1, l1p2);
//      GEOGEBRA_printLinePointPoint("exterior", l2p1, l2p2);
      let intersectBetweenRootxAndParent = intersectLineSegments(l1p1, l1p2, l2p1, l2p2, null);
      if (intersectBetweenRootxAndParent) {
        /// (3.1)
//        printf("[%s] case 3.1\n", fnName);
        if (parentOfIntersector.lBox.c[0] < topLevelX) {
          s[0]  = x[1];     s[1]  = upperY;
          e[0]  = topLevelX;  e[1]  = upperY;
          sp[0] = x[1];     sp[1] = lowerY;
        } else if (parentOfIntersector.lBox.c[0] > topLevelX) {
          s[0]  = x[0];     s[1]  = lowerY;
          e[0]  = topLevelX;  e[1]  = lowerY;
          sp[0] = x[0];     sp[1] = upperY;
        } else {
          console.log("unrecognized case (3.1.#).\n");
        }
      } else {
        /// (3.2)
//        printf("[%s] case 3.2\n", fnName);
        if (refLoop.c[0] < topLevelX) {
          s[0]  = x[3];     s[1]  = lowerY;
          e[0]  = topLevelX;  e[1]  = lowerY;
          sp[0] = x[3];     sp[1] = upperY;
        } else if (refLoop.c[0] > topLevelX) {
          s[0]  = x[2];     s[1]  = lowerY;
          e[0]  = topLevelX;  e[1]  = lowerY;
          sp[0] = x[2];     sp[1] = upperY;
        } else {
          console.log("unrecognized case (3.2.#).\n");
        }
      }
    }
  }

  let stem = createStemBox(s, e, sp);
  stem.bulgeCount = 0;
  stem.bulgeDist = 0.0;

  let radius = 0.5 * (upperY - lowerY);
  let center = [topLevelX, upperY - radius];
  let loop = createLoopBox(center, radius);

  exterior.lBox = loop;
  exterior.sBox = stem;
  loop.parent = exterior;
  stem.parent = exterior;

  ctree.updateAABB(exterior.aabb, stem, loop);
}

export function checkNodeAgainstAncestors(node, puzzler) {
  // char* fnName = "checkNodeAgainstAncestors";

  let changedNode = null;

  let ancestor = ctree.getParent(node);
  let topLevelAncestor = node;

  /// Move towards root checking and fixing ancestor intersections
  while (!ctree.isExterior(ancestor)) {
    topLevelAncestor = ancestor;
    let it = intersectNodeNode(node, ancestor);
    if (it != intersectionType.noIntersection) {
      changedNode = handleIntersectionWithAncestor(ancestor, node, 0, puzzler);
      if (changedNode != null) {
        return changedNode;
      }
    }
    ancestor = ctree.getParent(ancestor);
    //printf("[ANCESTOR] %d vs %d : it:%d changed:%d\n", getNodeID(ancestor), getNodeID(node), it, (result & _changed));
  }

  /// Check and fix ancestor intersections for exterior
  if (puzzler.checkExteriorIntersections) {
    if (intersectNodeExterior(node, puzzler)) { // simple check

      // prepare complex check
      let exterior = ctree.getParent(topLevelAncestor);
      TENTATIVE3_setupExteriorBoundingBoxes(exterior, topLevelAncestor, node, puzzler);
      changedNode = handleIntersectionWithAncestor(exterior, node, 0, puzzler);
      /*
      // setupExteriorBoundingBoxes(exterior, topLevelAncestor, node, puzzler);
      TENTATIVE_setupExteriorBoundingBoxes(exterior, topLevelAncestor, node, puzzler);

      // complex check
      intersectionType it = intersectNodeNode(node, exterior);
      if (it != noIntersection) {
        changedNode = handleIntersectionWithAncestor(exterior, node, 0, puzzler);
      }
      */
    }
  }

  return changedNode;
}

