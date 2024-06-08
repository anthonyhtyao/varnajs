import * as ctree from "../data/configtree";
import { intersectTrees } from "../intersectLevel/intersectLevelTreeNodes";

function getSimpleBoundingBox(node, bounds, recursionDepth) {
  let loopMin = node.lBox.c[0] - node.lBox.r;
  let loopMax = node.lBox.c[0] + node.lBox.r;
  if (recursionDepth == 0) {
    bounds[0] = loopMin;
    bounds[1] = loopMax;
  }

  for (let i = 0; i < node.childCount; i++) {
    let child = ctree.getChild(node, i);
    getSimpleBoundingBox(child, bounds, recursionDepth + 1);
  }

  if (loopMin < bounds[0]) { bounds[0] = loopMin; }
  if (loopMax > bounds[1]) { bounds[1] = loopMax; }

  for (let i = 0; i < node.sBox.bulgeCount; i++) {
    let pPrev = [];
    let pThis = [];
    let pNext = [];
    getBulgeCoordinates(node.sBox, i, pPrev, pThis, pNext);

    if (pThis[0] < bounds[0]) { bounds[0] = pThis[0]; }
    if (pThis[0] > bounds[1]) { bounds[1] = pThis[0]; }
  }
}

/**
 * Resolve the intersections of the children of the exterior loop
 */
export function resolveExteriorChildrenIntersectionXY(exteriorNode, ptable, unpaired, allowFlipping, myX, myY) {
  // number of subtrees
  let subtreeCount = exteriorNode.childCount;

  if (subtreeCount < 2) {
    return;
  }

  /// for each exterior child: get first node
  let childTreeNode = new Array(subtreeCount);
  for (let subtree = 0; subtree < subtreeCount; subtree++) {
    childTreeNode[subtree] = ctree.getChild(exteriorNode, subtree);
  }

  /*
  /// for each exterior child: prepare bounding box
  double** bounds = (double**) vrna_alloc(subtreeCount * sizeof(double*));
  for (let subtree = 0; subtree < subtreeCount; subtree++) {
    bounds[subtree] = (double*) vrna_alloc(2 * sizeof(double));
    bounds[subtree][0] = 0.0;
    bounds[subtree][1] = 0.0;
  }

  /// get bounding box of first child
  getSimpleBoundingBox(childTreeNode[0], bounds[0], 0);
  */

  /// for each subtree
  /// - compute number of its first non-exterior base
  /// - compute number of nucleotides before the subtree
  /// - distance between nucleotides before the subtree
  let firstBase = new Array(subtreeCount);
  let backbone  = new Array(subtreeCount);
  let distance  = new Array(subtreeCount);
  for (let subtree = 0; subtree < subtreeCount; subtree++) {
    backbone[subtree] = 0;
    distance[subtree] = 0.0;
  }
  let subtree = 0;
  let base = 1;
  while (base < ptable[0] && subtree < subtreeCount) {
    if (ptable[base] > base) {
      firstBase[subtree] = base;
      subtree++;
      base = ptable[base];
    } else {
      base++;
      backbone[subtree]++;
    }
  }

  // store upper and lower subtrees
  let upper = new Array(subtreeCount + 1);
  let lower = new Array(subtreeCount + 1);
  upper[0] = 0;
  lower[0] = 0;

  /// set first subtree to upper side
  upper[0]++;
  upper[upper[0]] = 0;

  // accumulated offset of children
  let offset = 0.0;
  // accumulated translation of children
  let accumulatedTranslation = 0.0;

  /// for all subtrees
  for (let subtree = 1; subtree < subtreeCount; subtree++) {
    /// translate current subtree by accumulated offset
    if (offset > 0.0) {
      let translate = [ offset, 0.0 ];
      ctree.translateBoundingBoxes(childTreeNode[subtree], translate);
    }
    // getSimpleBoundingBox(childTreeNode[subtree], bounds[subtree], 0);

    /// as long as the current child gets translated
    let changed = 1;
    let intersectUpper = 0;
    let intersectLower = 0;
    let fixOverlap = 0.0;
    while (changed) {
      // printf("Handling subtree %d\n", subtree);
      changed = 0;
      intersectUpper = 0;
      intersectLower = 0;

      /// check intersection of current subtree with previous upper subtrees
      for (let u = 1; u <= upper[0]; u++) {
        let upperStem = upper[u];
        // printf("Check intersection between %d and %d\n", subtree, upperStem);
        intersectUpper = intersectTrees(childTreeNode[subtree], childTreeNode[upperStem]);
        if (intersectUpper) {
          // printf("Intersection between %d and %d\n", subtree, upperStem);
          break;
        }
        //printf("%d vs %d: upperOverlap:%f (boundsOverlap:%f)\n", subtree, upperStem, upperOverlap, boundsOverlap);
      }

      if (allowFlipping) {
        /// if flipping is allowed:
        /// check intersection of current subtree with previous lower subtrees
        for (let l = 1; l <= lower[0]; l++) {
          let lowerStem = lower[l];
          intersectLower = intersectTrees(childTreeNode[subtree], childTreeNode[lowerStem]);
          if (intersectLower) {
            break;
          }
          //printf("%d vs %d: lowerOverlap:%f (boundsOverlap:%f)\n", subtree, lowerStem, lowerOverlap, boundsOverlap);
        }
      }

      if ((!allowFlipping && intersectUpper) ||
        (allowFlipping && intersectUpper && intersectLower)) {
        /// if intersections can not be resolved by flipping
        /// increase distance by constant amount per exterior base
        distance[subtree] += unpaired; // minOverlap / backbone[subtree];
        fixOverlap = unpaired * backbone[subtree];
        // printf("Increase distance by %12.8lf\n", fixOverlap);

        let translate = [ fixOverlap, 0.0 ];
        ctree.translateBoundingBoxes(childTreeNode[subtree], translate);

        /*
        bounds[subtree][0] += fixOverlap;
        bounds[subtree][1] += fixOverlap;
        */

        offset += fixOverlap;
        // printf("Total offset: %12.8lf\n", offset);

        changed = 1;
      } else {
        if (allowFlipping && intersectUpper) {
          /// if flipping is allowed and sufficient for resolving the intersection:
          /// (intersection is on the upper side)
          lower[0]++;
          lower[lower[0]] = subtree;
        } else {
          upper[0]++;
          upper[upper[0]] = subtree;
        }
      }
    } // end while(changed)

    /// translate exterior bases between previous and current subtree
    let currentBase = 1;
    for (let base = ptable[firstBase[subtree-1]];
       base < firstBase[subtree];
       base++, ++currentBase) {
      myX[base] += currentBase * distance[subtree] + accumulatedTranslation;
    }
    accumulatedTranslation += distance[subtree] * backbone[subtree];
  }

  /// Last part of the exterior loop
  for (let base = ptable[firstBase[subtreeCount-1]];
     base < ptable[0];
     ++base) {
    myX[base] += accumulatedTranslation;
  }

  /// modify x- and y-coordinates for all subtrees
  let currentLower = 1;
  let translation = 0.0;
  for (let subtree = 1; subtree < subtreeCount; subtree++) {
    /// translate all bases of current subtree
    translation += distance[subtree] * backbone[subtree];
    // printf("Translate subtree %d by %12.8lf\n", subtree, translation);
    for (let base = firstBase[subtree];
       base < ptable[firstBase[subtree]];
       ++base) {
      myX[base] += translation;
    }

    if (subtree == lower[currentLower]) {
      /// flip subtrees
      let exteriorY = myY[1];
      for (let base = firstBase[subtree];
         base < ptable[firstBase[subtree]];
         ++base) {
        myY[base] = 2 * exteriorY - myY[base];
      }
      ++currentLower;
    }
  }
  // processing end

  /*
  for (let subtree = 0; subtree < subtreeCount; subtree++) {
    free(bounds[subtree]);
  }
  free(bounds);
  */
}

/**
 * Resolve the intersections of the children of the exterior loop
 */
function resolveExteriorChildrenIntersectionAffin(exteriorNode, ptable, baseInformation, unpaired, allowFlipping) {
  // number of subtrees
  let subtreeCount = exteriorNode.childCount;

  if (subtreeCount < 2) {
    return;
  }

  /// for each exterior child: get first node
  let childTreeNode = new Array(subtreeCount);
  for (let subtree = 0; subtree < subtreeCount; subtree++) {
    childTreeNode[subtree] = ctree.getChild(exteriorNode, subtree);
  }

  /*
  /// for each exterior child: prepare bounding box
  double** bounds = (double**) vrna_alloc(subtreeCount * sizeof(double*));
  for (let subtree = 0; subtree < subtreeCount; subtree++) {
    bounds[subtree] = (double*) vrna_alloc(2 * sizeof(double));
    bounds[subtree][0] = 0.0;
    bounds[subtree][1] = 0.0;
  }

  /// get bounding box of first child
  getSimpleBoundingBox(childTreeNode[0], bounds[0], 0);
  */

  /// for each subtree
  /// - compute number of its first non-exterior base
  /// - compute number of nucleotides before the subtree
  let firstBase = new Array(subtreeCount);
  let backbone  = new Array(subtreeCount);
  for (let subtree = 0; subtree < subtreeCount; subtree++) {
    backbone[subtree] = 0;
  }
  let subtree = 0;
  let base = 1;
  while (base < ptable[0] && subtree < subtreeCount) {
    if (ptable[base] > base) {
      firstBase[subtree] = base;
      subtree++;
      base = ptable[base];
    } else {
      base++;
      backbone[subtree]++;
    }
  }

  // store upper and lower stems
  let upper = new Array(subtreeCount + 1);
  let lower = new Array(subtreeCount + 1);
  upper[0] = 0;
  lower[0] = 0;

  /// set first subtree to upper side
  upper[0]++;
  upper[upper[0]] = 0;

  // accumulated offset of children
  let offset = 0.0;

  /// for all stems
  for (let subtree = 1; subtree < subtreeCount; subtree++) {
    /// translate current subtree by accumulated offset
    if (offset > 0.0) {
      let translate = [ offset, 0.0 ];
      ctree.translateBoundingBoxes(childTreeNode[subtree], translate);
    }
    // getSimpleBoundingBox(childTreeNode[subtree], bounds[subtree], 0);

    /// as long as the current child gets translated
    let changed = 1;
    let intersectUpper = 0;
    let intersectLower = 0;
    let fixOverlap = 0.0;
    while (changed) {
      changed = 0;
      intersectUpper = 0;
      intersectLower = 0;

      /// check intersection of current subtree with previous upper stems
      for (let u = 1; u <= upper[0]; u++) {
        let upperStem = upper[u];
        intersectUpper = intersectTrees(childTreeNode[subtree], childTreeNode[upperStem]);
        if (intersectUpper) {
          break;
        }
        //printf("%d vs %d: upperOverlap:%f (boundsOverlap:%f)\n", subtree, upperStem, upperOverlap, boundsOverlap);
      }

      if (allowFlipping) {
        /// if flipping is allowed:
        /// check intersection of current subtree with previous lower stems
        for (let l = 1; l <= lower[0]; l++) {
          let lowerStem = lower[l];
          intersectLower = intersectTrees(childTreeNode[subtree], childTreeNode[lowerStem]);
          if (intersectLower) {
            break;
          }
          //printf("%d vs %d: lowerOverlap:%f (boundsOverlap:%f)\n", subtree, lowerStem, lowerOverlap, boundsOverlap);
        }
      }

      if ((!allowFlipping && intersectUpper) ||
        (allowFlipping && intersectUpper && intersectLower)) {
        /// if intersections can not be resolved by flipping
        /// increase distance by constant amount per exterior base
        let deltaPerDistance = unpaired; // minOverlap / backbone[subtree];
        fixOverlap = deltaPerDistance * backbone[subtree];

        for (let base = ptable[firstBase[subtree-1]]; base < firstBase[subtree]; base++) {
          baseInformation[base].distance += deltaPerDistance;
        }

        let translate = [ fixOverlap, 0.0 ];
        ctree.translateBoundingBoxes(childTreeNode[subtree], translate);

        /*
        bounds[subtree][0] += fixOverlap;
        bounds[subtree][1] += fixOverlap;
        */

        offset += fixOverlap;

        changed = 1;
      } else {
        if (allowFlipping && intersectUpper) {
          /// if flipping is allowed and sufficient for resolving the intersection:
          /// (intersection is on the upper side)
          for (let base = firstBase[subtree] + 1; base <= ptable[firstBase[subtree]] + 1; base++) {
            if (base > ptable[0]) {
              break;
            }
            baseInformation[base].angle *= -1;
          }

          lower[0]++;
          lower[lower[0]] = subtree;
        } else {
          upper[0]++;
          upper[upper[0]] = subtree;
        }
      }
    } // end while(changed)
  }
  // processing end

  /*
  for (let subtree = 0; subtree < subtreeCount; subtree++) {
    free(bounds[subtree]);
  }
  free(bounds);
  */
}

function resolveExteriorChildIntersections(exteriorNode, ptable, baseInformation, unpaired, allowFlipping) {
  let stemCount = exteriorNode.childCount;

  if (stemCount < 2) {
    return;
  }

  /// for each exterior child: get first node
  let node = new Array(stemCount);
  for (let stem = 0; stem < stemCount; stem++) {
    node[stem] = ctree.getChild(exteriorNode, stem);
  }

  /// for each exterior child: prepare bounding box
  let bounds = new Array(stemCount);
  for (let stem = 0; stem < stemCount; stem++) {
    bounds[stem] = [];
    bounds[stem][0] = 0.0;
    bounds[stem][1] = 0.0;
  }
  getSimpleBoundingBox(node[0], bounds[0], 0);

  /// for each stem
  /// - compute number of its first base
  /// - compute number of nucleotides before the stem
  let firstBase = new Array(stemCount);
  let backbone  = new Array(stemCount);
  for (let stem = 0; stem < stemCount; stem++) {
    backbone[stem] = 0;
  }
  let stem = 0;
  let base = 1;
  while (base < ptable[0] && stem < stemCount) {
    if (ptable[base] > base) {
      firstBase[stem] = base;
      stem++;
      base = ptable[base];
    } else {
      base++;
      backbone[stem]++;
    }
  }

  // store upper and lower stems
  let upper = new Array(stemCount + 1);
  let lower = new Array(stemCount + 1);
  upper[0] = 0;
  lower[0] = 0;

  /// set first stem to upper side
  upper[0]++;
  upper[upper[0]] = 0;

  // accumulated offset of children
  let offset = 0.0;

  // processing start
  for (let stem = 1; stem < stemCount; stem++) {
    // initial setting
    if (offset > 0.0) {
      let translate = [ offset, 0.0 ];
      ctree.translateBoundingBoxes(node[stem], translate);
    }
    getSimpleBoundingBox(node[stem], bounds[stem], 0);

    /// as long as the current child gets translated
    let changed = 1;
    while (changed) {
      changed = 0;

      // get overlap with upper and lower side
      let upperOverlap = 0.0;
      for (let u = 1; u <= upper[0]; u++) {
        let upperStem = upper[u];
        let boundsOverlap = (bounds[upperStem][1] + unpaired) - bounds[stem][0];
        if (boundsOverlap > upperOverlap && intersectTrees(node[stem], node[upperStem])) {
          upperOverlap = boundsOverlap;
        }
        //printf("%d vs %d: upperOverlap:%f (boundsOverlap:%f)\n", stem, upperStem, upperOverlap, boundsOverlap);
      }
      let lowerOverlap = 0.0;
      for (let l = 1; l <= lower[0]; l++) {
        let lowerStem = lower[l];
        let boundsOverlap = (bounds[lowerStem][1] + unpaired) - bounds[stem][0];
        if (boundsOverlap > lowerOverlap && intersectTrees(node[stem], node[lowerStem])) {
          lowerOverlap = boundsOverlap;
        }
        //printf("%d vs %d: lowerOverlap:%f (boundsOverlap:%f)\n", stem, lowerStem, lowerOverlap, boundsOverlap);
      }

      // fix minimum of both overlaps
      let minOverlap = (allowFlipping && (lowerOverlap < upperOverlap)) ? lowerOverlap : upperOverlap;
      if (minOverlap > 0.0) {
        let deltaPerDistance = unpaired; // minOverlap / backbone[stem];
        minOverlap = deltaPerDistance * backbone[stem];
        for (let base = ptable[firstBase[stem-1]]; base < firstBase[stem]; base++) {
          baseInformation[base].distance += deltaPerDistance;
        }

        let translate = [ minOverlap, 0.0 ];
        ctree.translateBoundingBoxes(node[stem], translate);

        bounds[stem][0] += minOverlap;
        bounds[stem][1] += minOverlap;

        offset += minOverlap;

        changed = 1;
      } else {
        // flip if necessary
        if (lowerOverlap < upperOverlap) {

          for (let base = firstBase[stem] + 1; base <= ptable[firstBase[stem]] + 1; base++) {
            if (base > ptable[0]) {
              break;
            }
            baseInformation[base].angle *= -1;
          }

          lower[0]++;
          lower[lower[0]] = stem;
        } else {
          upper[0]++;
          upper[upper[0]] = stem;
        }
      }
    } // end while(changed)
  }
  // processing end

}

