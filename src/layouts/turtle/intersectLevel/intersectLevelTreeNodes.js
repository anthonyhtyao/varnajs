import * as ctree from "../data/configtree";
import * as vmath from "../vector_math";
import * as iBox from "./intersectLevelBoundingBoxes";
import { intersectionType } from "../resolveIntersections/intersectionType";

const EXTERIOR_Y = 100.0;
const epsilonRecognize = 14;

export function intersectNodeExterior(node,puzzler) {
  if (ctree.isExterior(node)) {
    return 0;
  }
  if (ctree.isExterior(ctree.getParent(node))) {
    return 0;
  }

  let cy = node.lBox.c[1];
  let r = node.lBox.r + epsilonRecognize;
  if (puzzler.checkExteriorIntersections) {
    return (cy - r) <= EXTERIOR_Y;
  } else {
    return 0;
  }
}

function checkBounds(l1, l2, l3, l4, l5, h1, h2, h3, h4, h5) {
  return
    (   l1 < h1 && l1 < h2 && l1 < h3 && l1 < h4 && l1 < h5

     && l2 < h1 && l2 < h2 && l2 < h3 && l2 < h4 && l2 < h5

     && l3 < h1 && l3 < h2 && l3 < h3 && l3 < h4 && l3 < h5

     && l4 < h1 && l4 < h2 && l4 < h3 && l4 < h4 && l4 < h5

     && l5 < h1 && l5 < h2 && l5 < h3 && l5 < h4 && l5 < h5
    );
}


function intersectNodesBoundingBoxes(aabb1,aabb2,stem1,stem2) {
  let fnName = "intersectNodesBoundingBoxes";

  let extraDistance = 0;
  extraDistance += epsilonRecognize;
  let count = 0;
  if (stem1.bulgeDist > 0.0) { count++; }
  if (stem2.bulgeDist > 0.0) { count++; }
  if (count > 0) {
    extraDistance += (1.0 / count) * (stem1.bulgeDist + stem2.bulgeDist);
  }

  //printInformation(fnName, "aabb1 min-max: %12.8lf %12.8lf -- %12.8lf %12.8lf\n", aabb1.min[0], aabb1.min[1], aabb1.max[0], aabb1.max[1]);
  //printInformation(fnName, "aabb2 min-max: %12.8lf %12.8lf -- %12.8lf %12.8lf\n", aabb2.min[0], aabb2.min[1], aabb2.max[0], aabb2.max[1]);

  if (
    aabb1.max[0] < aabb2.min[0] - extraDistance
    ||
    aabb2.max[0] < aabb1.min[0] - extraDistance
    ||
    aabb1.max[1] < aabb2.min[1] - extraDistance
    ||
    aabb2.max[1] < aabb1.min[1] - extraDistance
    ) {
    return 0;
  } else {
    return 1;
  }
}

export function intersectNodeNode(node1, node2) {
  let fnName = "intersectNodeNode";

  let bulge1 = -1;
  let bulge2 = -1;
  let res = -1;

  if (node1 == node2) {
    return intersectionType.noIntersection;
  }

  let sBox_node1 = node1.sBox;
  let lBox_node1 = node1.lBox;
  let sBox_node2 = node2.sBox;
  let lBox_node2 = node2.lBox;

  // let intersectOld = OLD_intersectNodesBoundingBoxes(sBox_node1, lBox_node1, sBox_node2, lBox_node2);
  let intersect = intersectNodesBoundingBoxes(node1.aabb, node2.aabb, sBox_node1, sBox_node2);
  /*
  if (intersectOld != intersect) {
    printInformation(fnName, "aabb1 %d min-max: %12.8lf %12.8lf -- %12.8lf %12.8lf\n", getNodeID(node1), node1.aabb.min[0], node1.aabb.min[1], node1.aabb.max[0], node1.aabb.max[1]);
    printInformation(fnName, "aabb2 %d min-max: %12.8lf %12.8lf -- %12.8lf %12.8lf\n", getNodeID(node2), node2.aabb.min[0], node2.aabb.min[1], node2.aabb.max[0], node2.aabb.max[1]);
    printInformation(fnName, "result: %d\n", intersect);
  }
  */

  if (!intersect) {
    return intersectionType.noIntersection;
  }

  let parentOfNode1 = ctree.getParent(node1);
  let parentOfNode2 = ctree.getParent(node2);
  let node1IsParentOfNode2 = (node1 == parentOfNode2);
  let node2IsParentOfNode1 = (node2 == parentOfNode1);
  let nodesHaveCommonParent = (parentOfNode1 == parentOfNode2);

  /// SxS
  if (!node1IsParentOfNode2
    && !node2IsParentOfNode1
    && !nodesHaveCommonParent
    && iBox.intersectStemStem(sBox_node1, sBox_node2)) {
    /// successive stems never intersect while config is not broken
    return intersectionType.SxS;
  }

  /// LxL
  if (!node1IsParentOfNode2
    && !node2IsParentOfNode1
    && iBox.intersectLoopLoop(lBox_node1, lBox_node2)) {
    /// successive loops do never intersect
    return intersectionType.LxL;
  }

  /// SxL
  if (!node2IsParentOfNode1
    && iBox.intersectStemLoop(sBox_node1, lBox_node2)
     ) {
    return intersectionType.SxL;
  }

  /// LxS
  if (!node1IsParentOfNode2
    && iBox.intersectStemLoop(sBox_node2, lBox_node1)
     ) {
    return intersectionType.LxS;
  }

  /// LxB
  if (!node1IsParentOfNode2) {
    [res, bulge2] = iBox.intersectLoopBulges(lBox_node1, sBox_node2, bulge2);
    if (res) {
      return intersectionType.LxB;
    }
  }

  /// BxL
  if (!node2IsParentOfNode1) {
    [res, bulge1] = iBox.intersectLoopBulges(lBox_node2, sBox_node1, bulge1);
    if (res) {
      return intersectionType.BxL;
    }
  }

  /// SxB
  [res, bulge2] = iBox.intersectStemBulges(sBox_node1, sBox_node2, bulge2);
  if (res) {
    return intersectionType.SxB;
  }

  /// BxS
  [res, bulge1] = iBox.intersectStemBulges(sBox_node2, sBox_node1, bulge1);
  if (res) {
    return intersectionType.BxS;
  }

  /// BxB
  [res, bulge1, bulge2] = iBox.intersectBulgesBulges(sBox_node1, sBox_node2, bulge1, bulge2);
  if (res) {
    return intersectionType.BxB;
  }

  return intersectionType.noIntersection;
}

export function intersectNodeTree(node, tree, intersectorNode) {
  let intersecting = intersectNodeNode(node, tree);

  if (intersecting != intersectionType.noIntersection) {
    intersectorNode.node = tree;
    return 1;
  } else {
    let childCount = tree.childCount;
    for (let i = 0; i < childCount; i++) {
      if (intersectNodeTree(node, ctree.getChild(tree, i), intersectorNode)) {
        return 1;
      }
    }
  }

  return 0;
}

function intersect_iterateTree(tree1,tree2,intersectorNode1,intersectorNode2) {
  if (intersectNodeTree(tree1, tree2, intersectorNode2)) {
    intersectorNode1.node = tree1;
    return 1;
  } else {
    let childCount = tree1.childCount;
    for (let i = 0; i < childCount; i++) {
      if (intersect_iterateTree(ctree.getChild(tree1, i), tree2, intersectorNode1, intersectorNode2)) {
        return 1;
      }
    }
  }

  return 0;
}

/*
 * starting method for detection of intersections between trees
 * basically this one iterates over both subtrees and does the intersection check
 * for each pair from tree1 and tree2
 * this is done recursively...
 * iterate over tree1 and for each node we iterate over tree2 for intersection calcultion
 */
export function intersectTrees(tree1,tree2) {
  let intersectorNode1 = {node: null};
  let intersectorNode2 = {node: null};
  let intersecting = intersect_iterateTree(tree1, tree2, intersectorNode1, intersectorNode2);

  return intersecting;
}

export function intersectNodeLists(list1,size1,list2,size2,puzzler) {
  for (let index1 = 0; index1 < size1; index1++) {

    const node1 = list1[index1];
    let isExterior1 = ctree.isExterior(node1);

    for (let index2 = 0; index2 < size2; index2++) {

      const node2 = list2[index2];

      if (isExterior1) {
        if (intersectNodeExterior(node2, puzzler)) {
          return 1;
        }
      } else if (ctree.isExterior(node2)) {
        if (intersectNodeExterior(node1, puzzler)) {
          return 1;
        }
      } else {
        if (intersectionType.noIntersection != intersectNodeNode(node1, node2)) {
          return 1;
        }
      }

    }

  }

  return 0;
}
