// Modified and converted from RNApuzzler.c

import { distanceToAngle } from "./definitions";
import { cfgGenerateConfig, getArcAngle } from "./data/config";
import { buildConfigtree, updateBoundingBoxes} from "./data/configtree";
import { computeAffineCoordinates, affineToCartesianCoordinates } from './turtle';
import { isToTheRightPointPoint } from "./vector_math";
import { checkAndFixIntersections } from "./resolveIntersections/resolveIntersections";
import { resolveExteriorChildrenIntersectionXY } from "./resolveIntersections/resolveExteriorChildIntersections";
import { getBulgeXY } from "./data/boundingBoxes";

const EXTERIOR_Y = 100.0;
const TYPE_BASE_NONE = 0;

export function drawPuzzler(baseList, varnaCfg) {

  const puzzler = varnaCfg.puzzler;
  puzzler.paired = varnaCfg.bpDistance;
  puzzler.unpaired = varnaCfg.backboneLoop;
  const spaceBetweenBases = varnaCfg.spaceBetweenBases;

  if (puzzler.paired / puzzler.unpaired > 2.0) {
    cosole.log("paired:unpaired > 2.0 . layout might be destroyed!");
  }

  // Create 1-index ptable and baseInformation
  var ptable = [];
  ptable.push(baseList.length);
	  for (let i = 0; i < baseList.length; i++) {
      ptable.push(baseList[i].getPartnerInd() + 1);
	  }
  let length = ptable[0];

  // turtle base information
  var baseInformation = new Array(length + 1).fill(null).map(() => ({
    baseType: TYPE_BASE_NONE,
    distance: puzzler.unpaired,
    angle: 0.0,
    config: null
  }));

  /// generate default configuration for each loop
  cfgGenerateConfig(ptable, baseInformation, puzzler.unpaired, puzzler.paired);


  /// RNAturtle
  computeAffineCoordinates(ptable, puzzler.paired, puzzler.unpaired, baseInformation);

  /// Transform affine coordinates into cartesian coordinates
  var myX = new Array(length).fill(0);
  var myY = new Array(length).fill(0);
  affineToCartesianCoordinates(baseInformation, length, myX, myY);

  /// Build RNApuzzler configuration tree from cartesian coordinates
  const distBulge = Math.sqrt(puzzler.unpaired * puzzler.unpaired - 0.25 * puzzler.unpaired * puzzler.unpaired);
  let tree = buildConfigtree(ptable, baseInformation, myX, myY, distBulge);

  /// current and maximal number of changes applied to config
  puzzler.numberOfChangesAppliedToConfig = 0;

  /// DZ: should be dependent on the RNA length * 10 ???
  puzzler.maximumNumberOfConfigChangesAllowed = 25000;

  /// reset angle coordinates
  /*
  for (let i = 0; i < length+1; i++) {
    baseInformation[i].distance = puzzler.unpaired;
    baseInformation[i].angle = 0.0;
  }
  */

  /// RNApuzzler
  if (puzzler.checkExteriorIntersections || puzzler.checkSiblingIntersections || puzzler.checkAncestorIntersections) {
    /// - One execution of checkAndFixIntersections should always be sufficient
    updateBoundingBoxes(tree, puzzler);

    checkAndFixIntersections(tree, 0, puzzler);
    // printf("\n");
    // printInformation("CHANGE COUNT", "%d %s\n\n", puzzler.numberOfChangesAppliedToConfig, puzzler.filename);
  }


  /// determine x and y coordinates from RNApuzzler result
  /*
  for (let i = 0; i < length; i++) {
    myX[i] = 50 + i;
    myY[i] = 100 - i;
  }
  */
  determineNucleotideCoordinates(tree,
                   ptable, length,
                   puzzler.unpaired, puzzler.paired,
                   myX, myY);

  /// this section is for finding and resolving intersections
  /// of branches of the exterior loop against each other
  /// stretch backbones of the exterior until the overlap is gone
  /// may result in wide pictures
  const checkIntersectionsOfExteriorBranches = 1;
  if (checkIntersectionsOfExteriorBranches) {
    // resolveExteriorChildrenIntersectionAffin(tree, ptable, baseInformation, puzzler.unpaired, puzzler.allowFlipping);
    // resolveExteriorChildIntersections(tree, ptable, baseInformation, puzzler.unpaired, puzzler.allowFlipping);
    // affineToCartesianCoordinates(baseInformation, length, myX, myY);

    resolveExteriorChildrenIntersectionXY(tree, ptable, puzzler.unpaired, puzzler.allowFlipping, myX, myY);
  }

  /// for all loops: compute postscript arcs instead of lines
  // if (puzzler.drawArcs) {
  //   computeAnglesAndCentersForPS(ptable, myX, myY, baseInformation, arc_coords);
  // }

  /*
  for (let i = 0; i < length+1; i++) {
    printf("baseInformation[%d]: %d\n", i, baseInformation[i].baseType);
  }
  */


  var coords = [];
  for (let i = 0; i < length; i++) {
    coords.push({x: myX[i] * spaceBetweenBases, y: myY[i] * spaceBetweenBases});
  }

  return coords;
}

//------------------------------------------------------------------------------

/**
 Calculate the coordinates for the drawing with the given angle angles
 */
function determineNucleotideCoordinates(
  node, ptable, length, unpairedDistance, pairedDistance, x, y
) {
  if (length < 1) {
    return;
  }

  /// Handle stem of current node
  /// TODO: bulges!
  if (node.stem_start >= 1) {
    let sBox = node.sBox;

    /// - prepare bulge information
    let leftBulges = 0;
    let rightBulges = 0;
    let currentBulge = 0;
    for (let bulge = 0; bulge < sBox.bulgeCount; ++bulge) {
      if (sBox.bulges[bulge][0] < 0.0) {
        ++rightBulges;
      } else {
        ++leftBulges;
      }
    }

    /// - left side
    let ntStart = node.stem_start;
    let ntEnd   = node.loop_start;
    let ntSegments = ntEnd - ntStart - leftBulges;
    let pStart = [sBox.c[0] - sBox.e[0] * sBox.a[0] + sBox.e[1] * sBox.b[0],
                  sBox.c[1] - sBox.e[0] * sBox.a[1] + sBox.e[1] * sBox.b[1]];
    let pEnd   = [sBox.c[0] + sBox.e[0] * sBox.a[0] + sBox.e[1] * sBox.b[0],
                  sBox.c[1] + sBox.e[0] * sBox.a[1] + sBox.e[1] * sBox.b[1]];

    for (let nt = ntStart; nt < ntEnd; ++nt) {
      if (ptable[nt] == 0) {
        // bulge
        [x[nt-1], y[nt-1]] = getBulgeXY(sBox, currentBulge);
        ++currentBulge;
      } else {
        x[nt-1] = pStart[0] + (nt - ntStart - currentBulge) * (pEnd[0] - pStart[0]) / ntSegments;
        y[nt-1] = pStart[1] + (nt - ntStart - currentBulge) * (pEnd[1] - pStart[1]) / ntSegments;
      }
    }
    x[ntEnd-1] = pEnd[0];
    y[ntEnd-1] = pEnd[1];

    /// - right side
    ntStart = ptable[node.loop_start];
    ntEnd   = ptable[node.stem_start];
    ntSegments = ntEnd - ntStart - rightBulges;
    pStart[0] = sBox.c[0] + sBox.e[0] * sBox.a[0] - sBox.e[1] * sBox.b[0];
    pStart[1] = sBox.c[1] + sBox.e[0] * sBox.a[1] - sBox.e[1] * sBox.b[1];
    pEnd[0] = sBox.c[0] - sBox.e[0] * sBox.a[0] - sBox.e[1] * sBox.b[0];
    pEnd[1] = sBox.c[1] - sBox.e[0] * sBox.a[1] - sBox.e[1] * sBox.b[1];

    for (let nt = ntStart; nt < ntEnd; ++nt) {
      if (ptable[nt] == 0) {
        // bulge
        [x[nt-1], y[nt-1]] = getBulgeXY(sBox, currentBulge);
        ++currentBulge;
      } else {
        x[nt-1] = pStart[0] + (nt - ntStart - currentBulge + leftBulges) * (pEnd[0] - pStart[0]) / ntSegments;
        y[nt-1] = pStart[1] + (nt - ntStart - currentBulge + leftBulges) * (pEnd[1] - pStart[1]) / ntSegments;
      }
    }
    x[ntEnd-1] = pEnd[0];
    y[ntEnd-1] = pEnd[1];
  }

  /// loop
  let cfg = node.cfg;
  if (cfg != null) {
    const center = [node.lBox.c[0], node.lBox.c[1]];
    const radius = cfg.radius;
    const pairedAngle = distanceToAngle(radius, pairedDistance);

    /// - determine angle from loop to parent stem
    let startAngle = 0.0;
    let sBox = node.sBox;
    /*
    if (abs(center[0] - sBox.c[0]) < 1e-10) {
      if (center[1] > sBox.c[1]) {
        startAngle = MATH_PI + MATH_PI_HALF;
      } else {
        startAngle = MATH_PI_HALF;
      }
    } else if (abs(center[1] - sBox.c[1]) < 1e-10) {
      if (center[0] > sBox.c[0]) {
        startAngle = MATH_PI;
      } else {
        startAngle = 0.0;
      }
    } else {
    */
      startAngle = Math.atan2((sBox.c[1] - center[1]), (sBox.c[0] - center[0]));
    //}
    startAngle -= pairedAngle / 2.0;

    /// - for all loop arcs
    let cfgArc = null;
    let nt = node.loop_start;
    let angle = startAngle;
    let arcAngle = 0.0;
    let numberOfArcSegments = 0;
    for (let arc = 0; arc < cfg.numberOfArcs; ++arc) {
      cfgArc = cfg.cfgArcs[arc];
      numberOfArcSegments = cfgArc.numberOfArcSegments;
      arcAngle = cfgArc.arcAngle;
      for (let arcSegment = 1; arcSegment < numberOfArcSegments; ++arcSegment) {
        angle = startAngle - arcSegment * ((arcAngle - pairedAngle) / numberOfArcSegments);
        x[nt] = center[0] + radius * Math.cos(angle);
        y[nt] = center[1] + radius * Math.sin(angle);
        ++nt;
      }
      nt = ptable[nt+1];
      startAngle -= arcAngle;
    }
  }

  /// children
  for (let child = 0; child < node.childCount; ++child) {
    determineNucleotideCoordinates(node.children[child],
                     ptable, length,
                     unpairedDistance, pairedDistance,
                     x, y);
  }

  /// exterior
  x[0] = EXTERIOR_Y;
  y[0] = EXTERIOR_Y;
  let start = 1;
  if (ptable[1] != 0) {
    start = ptable[1] + 1;
  } else {
    start = 2;
  }
  for (let nt = start; nt <= length; ++nt) {
    if (ptable[nt] == 0) {
      x[nt-1] = x[nt-2] + unpairedDistance;
      y[nt-1] = EXTERIOR_Y;
    } else {
      nt = ptable[nt];
    }
  }

  return;
}

