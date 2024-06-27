import signbit from "math-float64-signbit";
import * as vmath from "../vector_math";
import * as bBox from "../data/boundingBoxes";
import { getNodeName } from "../data/configtree";
import { intersectionType } from "./intersectionType";
import { intersectLoopBulges } from "../intersectLevel/intersectLevelBoundingBoxes";

const MATH_TWO_PI = Math.PI * 2;
const MIN_POSITIVE_ANGLE = +0.0000000001;
const MIN_NEGATIVE_ANGLE = -0.0000000001;
const epsilonFix = 19;

function pointToAngle(center, vRef, rotationSign, point) {
  let fnName = "POINT TO ANGLE";
  let vCenterToPoint = [];
  vmath.vector(center, point, vCenterToPoint);
  let angle = vmath.angleBetweenVectors2D(vRef, vCenterToPoint);
  let cw = vmath.isToTheRightPointVector(center, vRef, point);

  if (rotationSign > 0 &&  cw) {
//    angle = angle;
  } else if (rotationSign > 0 && !cw) {
    angle = MATH_TWO_PI - angle;
  } else if (rotationSign < 0 &&  cw) {
    angle = -MATH_TWO_PI + angle;
  } else if (rotationSign < 0 && !cw) {
    angle = -angle;
  }
//  printf("[%s] angle: %3.2f° - sign=%3.2f C=(%3.2f, %3.2f) v=(%3.2f, %3.2f) P=(%3.2f, %3.2f)\n"
//       , fnName, angle, rotationSign
//       , center[0], center[1]
//       , vRef[0], vRef[1]
//       , point[0], point[1]
//       );
  return angle;
}

// staticRectLengthA is used for debug only
function fixIntersectionOfRectangleAndCircle(staticRectCenter, staticRectVecA, staticRectVecB, staticRectLengthA, staticRectLengthB, mobileCircCenter, mobileCircRadius, rotationCenter, rotationSign) {
  let fnName = "fixIntersectionOfCircleAndRectangle";

  /// emergency exit
  if (rotationSign == 0) {
    console.log(fnName, "invalid rotation sign\n");
    return 0.0;
  }

  /// some extra distance after intersection resolution
  const distance = epsilonFix + mobileCircRadius;

  /// vmath.circle definition (Center = centerNode.loop.center; sourceNode.loop.center on the vmath.circles periphery)
  let vRotationCenterToInPoint = [];
  vmath.vector(rotationCenter, mobileCircCenter, vRotationCenterToInPoint);
  let rotationRadius = vmath.vectorLength2D(vRotationCenterToInPoint);

  /// line definition
  let axisOffset = staticRectLengthB + distance;
  let axisDirection = [ staticRectVecA[0], staticRectVecA[1] ];
  let axisAnchorPositive = [ staticRectCenter[0] + axisOffset * staticRectVecB[0],
                   staticRectCenter[1] + axisOffset * staticRectVecB[1]
                   ];
  let axisAnchorNegative = [ staticRectCenter[0] - axisOffset * staticRectVecB[0],
                   staticRectCenter[1] - axisOffset * staticRectVecB[1]
                   ];


  /// cut polet computation
  let count = 0;
  let cut = [[], [], [], []];

  let numCutPointsPositive = vmath.getCutPointsOfCircleAndLine(rotationCenter, rotationRadius,
                           axisAnchorPositive, axisDirection,
                           cut[count+0], cut[count+1]);
  count += numCutPointsPositive;

  let numCutPointsNegative = vmath.getCutPointsOfCircleAndLine(rotationCenter, rotationRadius,
                           axisAnchorNegative, axisDirection,
                           cut[count+0], cut[count+1]);
  count += numCutPointsNegative;

  if (count == 0) {
    /// in case we found no cut points
    /// (example szenario: RF00100 >AANU01122137.1_2893-3214 Macaca mulatta 1099214708557, whole genome shotgun sequence.)
    /// we just take those points on the vmath.circle that are closest to the lines
    let axisNormal = [];
    vmath.normal(axisDirection, axisNormal);
    cut[count][0] = rotationCenter[0] + rotationRadius * axisNormal[0];
    cut[count][1] = rotationCenter[1] + rotationRadius * axisNormal[1];
    count++;
    cut[count][0] = rotationCenter[0] - rotationRadius * axisNormal[0];
    cut[count][1] = rotationCenter[1] - rotationRadius * axisNormal[1];
    count++;

  }

  /// transform the calculated points into rotation angles
  let angles = [];
  for (let i = 0; i < count; i++) {
    angles[i] = pointToAngle(rotationCenter, vRotationCenterToInPoint, rotationSign, cut[i]);
  }

  // fix underflows
  for (let i = 0; i < count; i++) {
    if (angles[i] == 0.0) {
      angles[i] = signbit(angles[i]) ? MIN_NEGATIVE_ANGLE : MIN_POSITIVE_ANGLE;
    }
  }

  let angle = rotationSign * MATH_TWO_PI;
  for (let i = 0; i < count; i++) {
//    printDebug(fnName, "sign: %+2.0f | old: %7.2f° | angle: %7.2f°", rotationSign, angle, angles[i]);
    if (rotationSign > 0.0 && angles[i] > 0.0) {
      angle = Math.min(angle, angles[i]);
    }
    if (rotationSign < 0.0 && angles[i] < 0.0) {
      angle = Math.max(angle, angles[i]);
    }
//    printDebug(null, "| new: %7.2f°\n", angle);
  }

  if (Math.abs(angle) == 0.0 || Math.abs(angle) == MATH_TWO_PI) {
    angle = 0.0;
    console.log(fnName, "no valid rotation here.\n");

    let showDetails = 0;
    if (showDetails) {
      // rectangle
      let staticRectExt = [ staticRectLengthA, staticRectLengthB ];
      console.log(fnName, ""); GEOGEBRA_printRectangle("rect", staticRectVecA, staticRectVecB, staticRectCenter, staticRectExt);
      // vmath.circle
      console.log(fnName, ""); GEOGEBRA_printCircle("circ", rotationCenter, rotationRadius);
      // lines
      console.log(fnName, ""); GEOGEBRA_printLinePointDir("line_{pos}", axisAnchorPositive, axisDirection);
      console.log(fnName, ""); GEOGEBRA_printLinePointDir("line_{neg}", axisAnchorNegative, axisDirection);
      // cut points
      for (let i = 0; i < count; i++) {
        console.log(fnName, "Cut%d = (%f, %f)\n", i, cut[i][0], cut[i][1]);
      }
      // angles
      for (let i = 0; i < count; i++) {
        console.log(fnName, "angle%d = %f°\n", angles[i]);
      }
    }
  }
//  printDebug(fnName, "return: %+7.2f°\n", angle);
  return angle;

}

function fixIntersectionOfCircles(staticCircleCenter,staticCircleRadius,mobileCircleCenter,mobileCircleRadius,rotationCenter,rotationSign) {
  let fnName = "fixIntersectionOfCircles";

  /// emergency exit
  if (rotationSign == 0) {
    console.log(fnName, "invalid rotation sign\n");
    return 0.0;
  }

  /// some extra distance after intersection resolution
  let distance = epsilonFix;

  /// vmath.circle around centerNode
  let vRotationCenterToCircleLoopCenter = [];
  vmath.vector(rotationCenter, mobileCircleCenter, vRotationCenterToCircleLoopCenter);
  let rotationRadius = vmath.vectorLength2D(vRotationCenterToCircleLoopCenter);

  /// vmath.circle around rootNode (extended by intersectorNode's radius and some extra distance)
  let extendedStaticCircleRadius = staticCircleRadius + mobileCircleRadius + distance;

  /// cut polet computation
  let cut1 = [], cut2 = [];
  let numCutPoints = vmath.getCutPointsOfCircles(rotationCenter, rotationRadius,
                         staticCircleCenter, extendedStaticCircleRadius,
                         cut1, cut2);

  /// emergency exit ... should never happen
  if (numCutPoints == 0) {
    console.log(fnName, "calculated cut points: 0 expected: 1+\n");
    console.log(fnName, ""); GEOGEBRA_printCircle("static", staticCircleCenter, staticCircleRadius);
    console.log(fnName, ""); GEOGEBRA_printCircle("mobile", mobileCircleCenter, mobileCircleRadius);
    console.log(fnName, ""); GEOGEBRA_printPoint("rotationcenter", rotationCenter);
    console.log(fnName, "distance = %f\n", distance);
    console.log(fnName, "rotationsign = %d\n", rotationSign);
    return 0.0;
  }

  /// get rotation angles from cut points
  let angle1 = 0.0;
  let angle2 = 0.0;
  {
    // get angle1
    let vCircleCenterToCut1 = [];
    vmath.vector(rotationCenter, cut1, vCircleCenterToCut1);
    angle1 = vmath.angleBetweenVectors2D(vRotationCenterToCircleLoopCenter, vCircleCenterToCut1);
    let isCW1 = vmath.isToTheRightPointVector(rotationCenter, vRotationCenterToCircleLoopCenter, cut1);
    if (!isCW1) {
      angle1 *= -1;
    }
    // fix underflow
    if (angle1 == 0.0) {
      angle1 = signbit(angle1) ? MIN_NEGATIVE_ANGLE : MIN_POSITIVE_ANGLE;
    }

    // get angle2
    let vCircleCenterToCut2 = [];
    vmath.vector(rotationCenter, cut2, vCircleCenterToCut2);
    angle2 = vmath.angleBetweenVectors2D(vRotationCenterToCircleLoopCenter, vCircleCenterToCut2);
    let isCW2 = vmath.isToTheRightPointVector(rotationCenter, vRotationCenterToCircleLoopCenter, cut2);
    if (!isCW2) {
      angle2 *= -1;
    }
    // fix underflow
    if (angle2 == 0.0) {
      angle2 = signbit(angle2) ? MIN_NEGATIVE_ANGLE : MIN_POSITIVE_ANGLE;
    }

    if (isCW1 == isCW2) {
      if (Math.abs(angle1) < Math.abs(angle2)) {
        // evaluate angle2 from the other side
        if (isCW2) {
          angle2 = angle2 - MATH_TWO_PI;
        } else {
          angle2 = MATH_TWO_PI - angle2;
        }
      } else {
        // evaluate angle1 from the other side
        if (isCW1) {
          angle1 = angle1 - MATH_TWO_PI;
        } else {
          angle1 = MATH_TWO_PI - angle1;
        }
      }
    }
  }

  let rotationAngle = 0.0;

  if (rotationSign == 1) {
    rotationAngle = Math.max(angle1, angle2);
  } else if (rotationSign == -1) {
    rotationAngle = Math.min(angle1, angle2);
  }

  if (rotationAngle == 0.0) {
    console.log(fnName, "no valid rotation here.\n");
  }
  return rotationAngle;
}

/*----------------------------------------------------------------------*/

function getRotationAngleLxL(ancestor,rotationNode,intersector,rotationSign) {
  let fnName = "getRotationAngleLxL";

  let staticLoop = ancestor.lBox;
  let rotationLoop = rotationNode.lBox;
  let mobileLoop = intersector.lBox;

  let staticCircleCenter = [];
  bBox.getLBoxCenter(staticLoop, staticCircleCenter);
  let staticCircleRadius = staticLoop.r;

  let mobileCircleCenter = [];
  bBox.getLBoxCenter(mobileLoop, mobileCircleCenter);
  let mobileCircleRadius = mobileLoop.r;

  let rotationCenter = [];
  bBox.getLBoxCenter(rotationLoop, rotationCenter);

  let rotationAngle = fixIntersectionOfCircles(staticCircleCenter, staticCircleRadius, mobileCircleCenter, mobileCircleRadius, rotationCenter, rotationSign);
  if (rotationAngle == 0.0) {
    console.log(fnName, "[%c %c %c] (promoted)\n", getNodeName(ancestor), getNodeName(rotationNode), getNodeName(intersector));
  }
  return rotationAngle;
}

function getRotationAngleLxS(ancestor,rotationNode,intersector,rotationSign) {
  let fnName = "getRotationAngleLxS";

  let staticRect = intersector.sBox;
  let mobileCirc = ancestor.lBox;
  let rotationLoop = rotationNode.lBox;

  let inverseRotationSign = (-1) * rotationSign;
  let inverseRotationAngle = fixIntersectionOfRectangleAndCircle(staticRect.c, staticRect.a, staticRect.b, staticRect.e[0], staticRect.e[1], mobileCirc.c, mobileCirc.r, rotationLoop.c, inverseRotationSign);
  let rotationAngle = (-1) * inverseRotationAngle;
  if (rotationAngle == 0.0) {
    console.log(fnName, "[%c %c %c] (promoted)\n", getNodeName(ancestor), getNodeName(rotationNode), getNodeName(intersector));
  }
  return rotationAngle;
}

function getRotationAngleSxL(ancestor,rotationNode,intersector,rotationSign) {
  let fnName = "getRotationAngleSxL";

  let staticRect = ancestor.sBox;
  let mobileCirc = intersector.lBox;
  let rotationLoop = rotationNode.lBox;

  let rotationAngle = fixIntersectionOfRectangleAndCircle(staticRect.c, staticRect.a, staticRect.b, staticRect.e[0], staticRect.e[1], mobileCirc.c, mobileCirc.r, rotationLoop.c, rotationSign);
  if (rotationAngle == 0.0) {
    console.log(fnName, "[%c %c %c] (promoted)\n", getNodeName(ancestor), getNodeName(rotationNode), getNodeName(intersector));
  }
  return rotationAngle;
}

function getRotationAngleLxB(ancestor,rotationNode,intersector,rotationSign) {
  let fnName = "getRotationAngleLxB";

  /// idea: construct vmath.circles around the intersecting loop and bulge and resolve their intersection

  let staticLoop = ancestor.lBox;
  let mobileStem = intersector.sBox;

  // ### static vmath.circle
  // --- grab the intersector loop as static vmath.circle
  let staticCircleCenter = [];
  bBox.getLBoxCenter(staticLoop, staticCircleCenter);
  let staticCircleRadius = staticLoop.r;

  // ### mobile vmath.circle
  // --- get bulge indices
  let intersect, mobileBulgeIndex;
  [intersect, mobileBulgeIndex] = intersectLoopBulges(staticLoop, mobileStem, mobileBulgeIndex);

  // --- define mobile vmath.circle from mobile bulge
  let mobileBulge = [[], [], []];
  bBox.getBulgeCoordinates(mobileStem, mobileBulgeIndex, mobileBulge[0], mobileBulge[1], mobileBulge[2]);

  let mobileCircleCenter = [];
  let mobileCircleRadius = vmath.circle(mobileBulge[0], mobileBulge[1], mobileBulge[2], mobileCircleCenter);

  // ### rotation center
  // --- define rotation center from rotation loop
  let rotationLoop = rotationNode.lBox;
  let rotationCenter = [];
  bBox.getLBoxCenter(rotationLoop, rotationCenter);

  // ### resolve
  // --- fix intersection of vmath.circles
  let rotationAngle = fixIntersectionOfCircles(staticCircleCenter, staticCircleRadius, mobileCircleCenter, mobileCircleRadius, rotationCenter, rotationSign);
  if (rotationAngle == 0.0) {
    console.log(fnName, "[%c %c %c] (promoted)\n", getNodeName(ancestor), getNodeName(rotationNode), getNodeName(intersector));
  }
  return rotationAngle;
}

function getRotationAngleBxL(ancestor,rotationNode,intersector,rotationSign) {
  let fnName = "getRotationAngleBxL";

  /// idea: construct vmath.circles around the intersecting bulge and loop and resolve their intersection

  let staticStem = ancestor.sBox;
  let mobileLoop = intersector.lBox;

  // ### static vmath.circle
  // --- get bulge indices
  let intersect, staticBulgeIndex;
  [intersect, staticBulgeIndex] = intersectLoopBulges(mobileLoop, staticStem, staticBulgeIndex);

  // --- define static vmath.circle from static bulge
  let staticBulge = [[], [], []];
  bBox.getBulgeCoordinates(staticStem, staticBulgeIndex, staticBulge[0], staticBulge[1], staticBulge[2]);

  let staticCircleCenter = [];
  let staticCircleRadius = vmath.circle(staticBulge[0], staticBulge[1], staticBulge[2], staticCircleCenter);

  // ### mobile vmath.circle
  // --- grab the intersector loop as mobile vmath.circle
  let mobileCircleCenter = [];
  bBox.getLBoxCenter(mobileLoop, mobileCircleCenter);
  let mobileCircleRadius = mobileLoop.r;

  // ### rotation center
  // --- define rotation center from rotation loop
  let rotationLoop = rotationNode.lBox;
  let rotationCenter = [];
  bBox.getLBoxCenter(rotationLoop, rotationCenter);

  // ### resolve
  // --- fix intersection of vmath.circles
  let rotationAngle = fixIntersectionOfCircles(staticCircleCenter, staticCircleRadius, mobileCircleCenter, mobileCircleRadius, rotationCenter, rotationSign);
  if (rotationAngle == 0.0) {
    console.log(fnName, "[%c %c %c] (promoted)\n", getNodeName(ancestor), getNodeName(rotationNode), getNodeName(intersector));
  }
  return rotationAngle;
}

function getRotationAngleSxS(ancestor,rotationNode,intersector,rotatioSign) {
  let fnName = "getRotationAngleSxS";

  let rotationAngle = getRotationAngleSxL(ancestor, rotationNode, intersector, rotatioSign);
  if (rotationAngle == 0.0) {
    console.log(fnName, "[%c %c %c] (promoted)\n", getNodeName(ancestor), getNodeName(rotationNode), getNodeName(intersector));
  }
  return rotationAngle;
}

function getRotationAngleSxB(ancestor,rotationNode,intersector,rotationSign) {
  let fnName = "getRotationAngleSxB";

  let staticStem = ancestor.sBox;
  let mobileStem = intersector.sBox;
  let rotationLoop = rotationNode.lBox;

  let intersect, mobileBulgeIndex;
  [intersect, mobileBulgeIndex] = intersectStemBulges(staticStem, mobileStem, mobileBulgeIndex);

  // ### mobile vmath.circle
  // --- define mobile vmath.circle from mobile bulge
  let mobileBulge = [[], [], []];
  bBox.getBulgeCoordinates(mobileStem, mobileBulgeIndex, mobileBulge[0], mobileBulge[1], mobileBulge[2]);

  let mobileCircleCenter = [];
  let mobileCircleRadius = vmath.circle(mobileBulge[0], mobileBulge[1], mobileBulge[2], mobileCircleCenter);

  let rotationAngle = fixIntersectionOfRectangleAndCircle(staticStem.c, staticStem.a, staticStem.b, staticStem.e[0], staticStem.e[1], mobileCircleCenter, mobileCircleRadius, rotationLoop.c, rotationSign);
  if (rotationAngle == 0.0) {
    console.log(fnName, "[%c %c %c] (promoted)\n", getNodeName(ancestor), getNodeName(rotationNode), getNodeName(intersector));
  }
  return rotationAngle;
}

function getRotationAngleBxS(ancestor,rotationNode,intersector,rotationSign) {
  let fnName = "getRotationAngleBxS";

  let staticStem = intersector.sBox;
  let mobileStem = ancestor.sBox;
  let rotationLoop = rotationNode.lBox;

  let intersect, mobileBulgeIndex;
  [intersect, mobileBulgeIndex] = intersectStemBulges(staticStem, mobileStem, mobileBulgeIndex);

  // ### mobile vmath.circle
  // --- define mobile vmath.circle from mobile bulge
  let mobileBulge = [[], [], []];
  bBox.getBulgeCoordinates(mobileStem, mobileBulgeIndex, mobileBulge[0], mobileBulge[1], mobileBulge[2]);

  let mobileCircleCenter = [];
  let mobileCircleRadius = vmath.circle(mobileBulge[0], mobileBulge[1], mobileBulge[2], mobileCircleCenter);

  let rotationAngle = fixIntersectionOfRectangleAndCircle(staticStem.c, staticStem.a, staticStem.b, staticStem.e[0], staticStem.e[1], mobileCircleCenter, mobileCircleRadius, rotationLoop.c, rotationSign);
  if (rotationAngle == 0.0) {
    console.log(fnName, "[%c %c %c] (promoted)\n", getNodeName(ancestor), getNodeName(rotationNode), getNodeName(intersector));
  }
  return rotationAngle;
}

function getRotationAngleBxB(ancestor,rotationNode,intersector,rotationSign) {
  let fnName = "getRotationAngleBxB";

  /// idea: construct vmath.circles around both bulges and resolve their intersection

  let staticStem = ancestor.sBox;
  let mobileStem = intersector.sBox;

  // --- get bulge indices
  let intersect, staticBulgeIndex, mobileBulgeIndex;
  [intersect, staticBulgeIndex, mobileBulgeIndex] = intersectBulgesBulges(staticStem, mobileStem, staticBulgeIndex, mobileBulgeIndex);

  // ### static vmath.circle
  // --- define static vmath.circle from static bulge
  let staticBulge = [[], [], []];
  bBox.getBulgeCoordinates(staticStem, staticBulgeIndex, staticBulge[0], staticBulge[1], staticBulge[2]);

  let staticCircleCenter = [];
  let staticCircleRadius = vmath.circle(staticBulge[0], staticBulge[1], staticBulge[2], staticCircleCenter);

  // ### mobile vmath.circle
  // --- define mobile vmath.circle from mobile bulge
  let mobileBulge = [[], [], []];
  bBox.getBulgeCoordinates(mobileStem, mobileBulgeIndex, mobileBulge[0], mobileBulge[1], mobileBulge[2]);

  let mobileCircleCenter = [];
  let mobileCircleRadius =  vmath.circle(mobileBulge[0], mobileBulge[1], mobileBulge[2], mobileCircleCenter);

  // ### rotation center
  // --- define rotation center from rotation loop
  let rotationLoop = rotationNode.lBox;
  let rotationCenter = [];
  bBox.getLBoxCenter(rotationLoop, rotationCenter);

  // ### resolve
  // --- fix intersection of vmath.circles
  let rotationAngle = fixIntersectionOfCircles(staticCircleCenter, staticCircleRadius, mobileCircleCenter, mobileCircleRadius, rotationCenter, rotationSign);
  if (rotationAngle == 0.0) {
    console.log(fnName, "[%c %c %c] (promoted)\n", getNodeName(ancestor), getNodeName(rotationNode), getNodeName(intersector));
  }
  return rotationAngle;
}

export function getRotationAngle(rootNode,centerNode,intersectorNode,it,rotationSign) {
  let fnName = "getRotationAngle";
  /// performs the appropriate calculation method for the given intersection type

  let rotationAngle = 0.0;

  switch (it) {
    case intersectionType. LxL:
      rotationAngle = getRotationAngleLxL(rootNode, centerNode, intersectorNode, rotationSign);
      break;

    case intersectionType. LxS:
      rotationAngle = getRotationAngleLxS(rootNode, centerNode, intersectorNode, rotationSign);
      break;

    case intersectionType. LxB:
      rotationAngle = getRotationAngleLxB(rootNode, centerNode, intersectorNode, rotationSign);
      break;

    case intersectionType. SxL:
      rotationAngle = getRotationAngleSxL(rootNode, centerNode, intersectorNode, rotationSign);
      break;

    case intersectionType. SxS:
      rotationAngle = getRotationAngleSxS(rootNode, centerNode, intersectorNode, rotationSign);
      break;

    case intersectionType. SxB:
      rotationAngle = getRotationAngleSxB(rootNode, centerNode, intersectorNode, rotationSign);
      break;

    case intersectionType. BxL:
      rotationAngle = getRotationAngleBxL(rootNode, centerNode, intersectorNode, rotationSign);
      break;

    case intersectionType. BxS:
      rotationAngle = getRotationAngleBxS(rootNode, centerNode, intersectorNode, rotationSign);
      break;

    case intersectionType. BxB:
      rotationAngle = getRotationAngleBxB(rootNode, centerNode, intersectorNode, rotationSign);
      break;

    default:
      console.log(fnName, "no computation for given intersection type\n");
  }

  return rotationAngle;
}
