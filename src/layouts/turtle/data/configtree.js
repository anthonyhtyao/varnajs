import { buildLoopBox, buildStemBox, getLBoxCenter, getSBoxCenter, translateLoopBox, translateStemBox, getBulgeCoordinates } from "./boundingBoxes";
import { configtree } from "../datatypes";
import * as vmath from "../vector_math";
import { getArcAngle, cfgApplyChanges } from "./config";

const MATH_TWO_PI = 2 * Math.PI;
const EXTERIOR_Y = 100.0;
const epsilon7 = 1e-7;

export function updateAABB(aabb, sBox, lBox) {
  let stem_ea = [sBox.e[0] * sBox.a[0], sBox.e[0] * sBox.a[1]];
  let stem_eb = [sBox.e[1] * sBox.b[0], sBox.e[1] * sBox.b[1]];

  const numPoints = 6 + sBox.bulgeCount;

  /// array of relevant points
  let p = [];
  for (let i = 0; i < numPoints; i++) {
    p[i] = [];
  }

  /// corners of stem
  p[0][0] = sBox.c[0] - stem_ea[0] + stem_eb[0];
  p[0][1] = sBox.c[1] - stem_ea[1] + stem_eb[1];
  p[1][0] = sBox.c[0] + stem_ea[0] + stem_eb[0];
  p[1][1] = sBox.c[1] + stem_ea[1] + stem_eb[1];
  p[2][0] = sBox.c[0] + stem_ea[0] - stem_eb[0];
  p[2][1] = sBox.c[1] + stem_ea[1] - stem_eb[1];
  p[3][0] = sBox.c[0] - stem_ea[0] - stem_eb[0];
  p[3][1] = sBox.c[1] - stem_ea[1] - stem_eb[1];

  /// lower left of loop AABB
  p[4][0] = lBox.c[0] - lBox.r;
  p[4][1] = lBox.c[1] - lBox.r;
  /// upper right of loop AABB
  p[5][0] = lBox.c[0] + lBox.r;
  p[5][1] = lBox.c[1] + lBox.r;

  /// bulge points
  let pPrev = [];
  let pNext = [];
  for (let i = 0; i < sBox.bulgeCount; i++) {
    getBulgeCoordinates(sBox, i, pPrev, p[6+i], pNext);
  }

  /// set aabb
  aabb.min[0] = p[0][0];
  aabb.min[1] = p[0][1];
  aabb.max[0] = p[0][0];
  aabb.max[1] = p[0][1];
  for (let i = 1; i < numPoints; i++) {
    if (aabb.min[0] > p[i][0]) {
      aabb.min[0] = p[i][0];
    }
    if (aabb.min[1] > p[i][1]) {
      aabb.min[1] = p[i][1];
    }
    if (aabb.max[0] < p[i][0]) {
      aabb.max[0] = p[i][0];
    }
    if (aabb.max[1] < p[i][1]) {
      aabb.max[1] = p[i][1];
    }
  }
}

export function updateBoundingBoxes(node, puzzler) {
  /// fix this node's loop
  /// then for each child fix the stem and bulges
  /// and call recursively

  if (!isExterior(node)) {
    const numStemBackBones = Math.round((2.0 * node.sBox.e[0]) / puzzler.unpaired);
    let stemLength = puzzler.unpaired * numStemBackBones;
    let distanceStemEndToLoopCenter = Math.sqrt(  node.cfg.radius *   node.cfg.radius - 0.25 * puzzler.paired * puzzler.paired);
    let distanceStemCenterToLoopCenter = 0.5 * stemLength + distanceStemEndToLoopCenter;
    node.lBox.c[0] = node.sBox.c[0] + distanceStemCenterToLoopCenter * node.sBox.a[0];
    node.lBox.c[1] = node.sBox.c[1] + distanceStemCenterToLoopCenter * node.sBox.a[1];
    node.lBox.r = node.cfg.radius;

    updateAABB(node.aabb, node.sBox, node.lBox);
  }

  let childAngleRad = 0.0;

  for (let i = 0; i < node.childCount; i++) {

    let child = getChild(node, i);
    let sBox = child.sBox;
    let lBox = child.lBox;

    let parentLoopCenter = [];
    if (isExterior(node)) {
      parentLoopCenter[0] = lBox.c[0];
      parentLoopCenter[1] = EXTERIOR_Y;
    } else {
      getLoopCenter(node, parentLoopCenter);
    }

    /// ... fix the stem's extensions ...
    const numStemBackBones = Math.round((2.0 * sBox.e[0]) / puzzler.unpaired);
    let stemLength = puzzler.unpaired * numStemBackBones;
    sBox.e[0] = 0.5 * stemLength;
    sBox.e[1] = 0.5 * puzzler.paired;

    /// ... fix the stem's directions ...
    if (isExterior(node)) {
      childAngleRad = Math.PI;
    } else {
      childAngleRad += getArcAngle(node.cfg, i);
    }
    let aFixed = [];
    if (isExterior(node)) {
      aFixed[0] = 0.0;
      aFixed[1] = 1.0;
    } else {
      let gamma = childAngleRad - Math.PI;
      vmath.rotateVectorByAngle(node.sBox.a, gamma, aFixed);
    }
    sBox.a[0] = aFixed[0];
    sBox.a[1] = aFixed[1];

    let bFixed = [];
    vmath.normal(aFixed, bFixed);
    bFixed[0] *= -1;
    bFixed[1] *= -1;
    sBox.b[0] = bFixed[0];
    sBox.b[1] = bFixed[1];

    let s0 = 0;
    if (!isExterior(node)) {
      s0 = Math.sqrt(node.cfg.radius * node.cfg.radius - 0.25 * puzzler.paired * puzzler.paired);
    }
    let distanceStemCenter = s0 + 0.5 * stemLength;

    /// ... fix the stem's position.
    sBox.c[0] = parentLoopCenter[0] + distanceStemCenter * aFixed[0];
    sBox.c[1] = parentLoopCenter[1] + distanceStemCenter * aFixed[1];

    if (stemLength == 0) {
      sBox.e[0] = epsilon7;
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    updateBoundingBoxes(getChild(node, i), puzzler);
  }
}

export function applyChangesToConfigAndBoundingBoxes(tree, deltaCfg, radiusNew, puzzler) {
  /// Apply all changes to config
  let cfg = tree.cfg;

  /// - start with adjusting config radius and angles
  cfgApplyChanges(cfg, getNodeName(tree), deltaCfg, radiusNew, puzzler);

  /// - apply changes of config to bounding boxes
  updateBoundingBoxes(tree, puzzler);

  //if (GEOGEBRA_FLAG) {
  //  GEOGEBRA_generateTree(global_root2, puzzler.numberOfChangesAppliedToConfig);
  //}
}

export function countSubtreeNodes(node) {
  let count = 1; // count this node

  for (let currentChild = 0; currentChild < node.childCount; currentChild++) {
    // count children and add child count
    count += countSubtreeNodes(getChild(node, currentChild));
  }

  return count;
}

export function countAncestorNodes(node) {
  let count = 0;

  let ancestor = getParent(node);
  while (ancestor != null) {
    ++count;
    ancestor = getParent(ancestor);
  }

  return count;
}

export function collectSubtreeNodes(node, allNodes, currentIndex) {
  allNodes[currentIndex] = node;
  let nextIndex = currentIndex + 1; // increase index as this one was just taken

  for (let currentChild = 0; currentChild < node.childCount; currentChild++) {
    nextIndex = collectSubtreeNodes(getChild(node, currentChild), allNodes, nextIndex);
  }

  return nextIndex;
}

export function collectAncestorNodes(node, ancestorList) {
  let currentIndex = 0;
  let ancestor = getParent(node);
  while (ancestor != null) {
    ancestorList[currentIndex] = ancestor;
    ++currentIndex;
    ancestor = getParent(ancestor);
  }
}

function getPairedAngle(node) {
  /// get the current node's stem's bounding wedge
  let sBox = node.sBox;
  let pStemTopCorner = [sBox.c[0] + sBox.e[0] * sBox.a[0] + sBox.e[1] * sBox.b[0],
                        sBox.c[1] + sBox.e[0] * sBox.a[1] + sBox.e[1] * sBox.b[1]]
  let pLoopCenter = [];
  getLoopCenter(node, pLoopCenter);
  let vLoopCenterToStemTopCorner = [];
  vector(pLoopCenter, pStemTopCorner, vLoopCenterToStemTopCorner);
  let vLoopCenterToStemCenter = [(-1) * sBox.a[0], (-1) * sBox.a[1]];
  let minOuterAngle = angleBetweenVectors2D(vLoopCenterToStemCenter, vLoopCenterToStemTopCorner);

  /// all arcs share the same stem angle
  let stemAngle = 2 * minOuterAngle;
  return stemAngle;
}

export function isExterior(node) {
  return getNodeID(node) == 0;
}

function getExterior(node) {
  let exteriorCandidate = node;
  while (!isExterior(exteriorCandidate)) {
    exteriorCandidate = getParent(exteriorCandidate);
  }
  return exteriorCandidate;
}

export function isInteriorLoop(node) {
  return (!isExterior(node) && node.childCount == 1);
}

export function isMultiLoop(node) {
  return (!isExterior(node) && node.childCount > 1);
}

export function getNodeID(node) {
  if (node != null) {
    return node.id;
  } else {
    return -1;
  }
}

export function getNodeName(node) {
  /**
   * @brief cfgMotivBlank
   *    - name of exterior loops and small bulge loops
   *    initialized at cfgGenerateMotivs
   */
  const cfgMotivBlank = '_';

  const id = getNodeID(node);
  if (id == -1) {
    return cfgMotivBlank;
  }

  let motivId = (id + 33) % 128;
  while (motivId < 33) {
    motivId = (motivId + 33) % 128;
  }
  let motiv = String.fromCharCode(motivId);
  //console.log("[CONVERT] %3d . %3d . %c\n", id, motivId, motiv);
  return motiv;
}

function setChild(parent, index, child) {
  if (0 <= index && index < parent.childCount) {
    parent.children[index] = child;
  }
}

/**
 * @brief treeGetChildCount
 *    - counts the number of children this loop will have in the configtree
 * @param loopStart
 *    - index of the loops first base
 * @param ptable
 *    - the RNA's pairing information
 * @return
 *    - number of child nodes
 */
let treeGetChildCount = function(loopStart, ptable) {
  let childCount = 0;
  let end = ptable[loopStart];

  for (let i = loopStart + 1; i < end; ++i ) {
    if (ptable[i] > i) {
      // found new stem
      childCount++;
      i = ptable[i];
    }
  }
  return childCount;
}

/**
 * @brief createTreeNode
 *    - this method can be referred to as a constructor method for configtree nodes.
 * @param parent
 *    - parent node (the prior loop), null for the root node
 * @param loopStart
 *    - index of the loops first node, 1 for root node
 * @param stemStart
 *    - index of the prior stems first node, -1 for root node
 * @param ptable
 *    - the RNA's pairing information
 * @param cfg
 *    - the configuration found in baseInformation for that loop.
 *    null for exterior loop (root node)
 * @return
 *    - an initialized configtree tBaseInformation with set parent, loopStart, cfg, childCount and initialized children array
 */
function createTreeNode(id, parent, loopStart, stemStart, ptable, cfg) {
  // allocate children array
  let childCount;
  if (cfg == null) {
    childCount = treeGetChildCount(0, ptable);
  } else {
    childCount = treeGetChildCount(loopStart, ptable);
  }
  var children = (childCount > 0) ? new Array(childCount).fill(null) : null;

  var node = new configtree();

  node.id = id;

  node.parent = parent;
  node.children = children;
  node.childCount = childCount;

  node.cfg = cfg;
  node.loop_start = loopStart;
  node.stem_start = stemStart;

  node.lBox = null;
  node.sBox = null;

  return node;
}

/**
 * @brief treeHandleLoop
 *    - method for configtree construction.
 *    uses recursive calls alternating with treeHandleStem method to get the whole RNA
 * @param parent
 *    - parent node of the current loop in configtree
 * @param loopStart
 *    - index of the loop's first base
 * @param stemStart
 *    - index of the prior stem's first base
 * @param pairTable
 *    - the RNA's pairing information
 * @param baseInformation
 *    - array of tBaseInformation annotations (grants config)
 * @return
 *    - pointer to the subtree (configtree) that has this loop as root
 */
function treeHandleLoop(parent, nodeID, loopStart, stemStart, ptable, baseInformation) {
  let addedChildren = 0;

  var subtree = createTreeNode(nodeID, parent, loopStart, stemStart, ptable, baseInformation[loopStart].config);

  const end = ptable[loopStart];

  for (let i = loopStart + 1; i < end; ++i) {
    if (ptable[i] > i) {
      // found new stem
      let child = null;
      [child, nodeID] = treeHandleStem(subtree, nodeID, i, ptable, baseInformation);
      child.parent = subtree;
      setChild(subtree, addedChildren, child);
      addedChildren++;

      i = ptable[i];
    }
  }

  return [subtree, nodeID];
}

/**
 * @brief treeHandleStem
 *    - method for configtree construction.
 *    uses recursive calls alternating with treeHandleLoop method to get the whole RNA
 * @param parent
 *    - parent node of the current loop in configtree
 * @param stemStart
 *    - index of the stem's first base
 * @param ptable
 *    - the RNA's pairing information
 * @param baseInformation
 *    - array of tBaseInformation annotations (grants config)
 * @return
 *    - pointer to the cunsecutive subtree (configtree) that is created from the consecutive loop
 */
function treeHandleStem(parent, nodeID, stemStart, ptable, baseInformation) {
  ++nodeID;
  //console.log("New stem: %c\n", *nodeID);
  let i = stemStart;
  while (baseInformation[i].config == null) {
    ++i;
  }

  return treeHandleLoop(parent, nodeID, i, stemStart, ptable, baseInformation);
}

/**
 * @brief buildBoundingBoxes
 * @param tree
 * @param ptable
 * @param baseInformation
 * @param x
 * @param y
 * @param bulge
 *    - distance between regular stem and bulge base
 */
function buildBoundingBoxes(tree, ptable, baseInformation, x, y, bulge) {
  const isRoot = (tree.parent == null);

  if (!isRoot) {
    let lBox = buildLoopBox(tree.loop_start, ptable, baseInformation, x, y);
    let sBox = buildStemBox(tree.stem_start, tree.loop_start, ptable, x, y, bulge);

    lBox.parent = tree;
    sBox.parent = tree;

    tree.lBox = lBox;
    tree.sBox = sBox;

    updateAABB(tree.aabb, sBox, lBox);
  }

  for (let currentChild = 0; currentChild < tree.childCount; currentChild++) {
    let child = getChild(tree, currentChild);
    buildBoundingBoxes(child, ptable, baseInformation, x, y, bulge);
  }
}

// documentation at header file
export function buildConfigtree(ptable, baseInformation, x, y, bulge) {
  // create root
  let nodeID = 0;
  let root = createTreeNode(nodeID, null, 1, -1, ptable, null);

  let addedChildren = 0;
  const length = ptable[0];
  for (let i = 1; i < length; ++i) {
    if (ptable[i] > i) {
      // found stem
      let child = null;
      [child, nodeID] = treeHandleStem(root, nodeID, i, ptable, baseInformation);
      setChild(root, addedChildren, child);
      addedChildren++;

      i = ptable[i];
    }
  }

  buildBoundingBoxes(root, ptable, baseInformation, x, y, bulge);

  return root;
}

/**
 * @brief translateBoundingBoxesByVector
 *    - Performs a translation of a whole branch by a given vector.
 *    Used to apply changes in config to the tree and its bounding boxes.
 * @param tree
 *    - tree that is being translated
 * @param vector
 *    - translation vector as let array[2]
 */
export function translateBoundingBoxes(tree, vector) {
  translateStemBox(tree.sBox, vector);
  translateLoopBox(tree.lBox, vector);
  updateAABB(tree.aabb, tree.sBox, tree.lBox);
  for (let currentChild = 0; currentChild < tree.childCount; currentChild++) {
    translateBoundingBoxes(getChild(tree, currentChild), vector);
  }
}

/**
 * @brief getChildIndex
 *    - gets the index of child node where to find the node with given name.
 * @param tree
 *    - configtree you want to search in.
 * @param childID
 *    - ID of childnode you are looking for.
 * @return
 *    - child index or -1 if tree does not contain such a childnode.
 */
export function  getChildIndex(tree, childID) {
  // check if there are further nodes to check
  let childIndex = tree.childCount - 1;
  for (let currentChild = 0; currentChild < tree.childCount; ++currentChild) {
    let child = getChild(tree, currentChild);
    if (getNodeID(child) > childID) {
      childIndex = currentChild - 1;
      break;
    }
  }

  return childIndex;
}

/**
 * @brief getChildAngle
 *    - Calculates the clockwise angle of a given child node (given by name) at a loop.
 *    This child needs to be a direct child node
 *    The rotation angle of its center node will be calculated.
 * @param parentNode
 *    - tree node acting as parent loop
 * @param childNode
 *    - child node of which you want to know the angle
 * @return
 *    - angle of child node
 *    the resulting angle might be smaller than 0° or greater than 360°
 */
export function getChildAngle(parentNode, childNode) {
  let parentLoopCenter = [ parentNode.lBox.c[0], parentNode.lBox.c[1] ];
  let parentStemCenter = [ parentNode.sBox.c[0], parentNode.sBox.c[1] ];
  let parentLoopStemVector = [];
  vmath.vector(parentLoopCenter, parentStemCenter, parentLoopStemVector);

  let childLoopCenter = [ childNode.lBox.c[0], childNode.lBox.c[1] ];
  let angle = vmath.anglePtPtPt2D(parentStemCenter, parentLoopCenter, childLoopCenter);
  if (!vmath.isToTheRightPointVector(parentLoopCenter, parentLoopStemVector, childLoopCenter)) {
    angle = MATH_TWO_PI - angle;
  }

  return angle;
}

/**
 * @brief getChildAngleByIndex
 *    - Calculates the clockwise angle of a given child node (given by name) at a loop.
 *    This child needs to be a direct child node
 *    The rotation angle of its center node will be calculated.
 * @param parentNode
 *    - tree node acting as parent loop
 * @param childIndex
 *    - index of child node of which you want to know the angle
 * @return
 *    - angle of child node
 *    the resulting angle might be smaller than 0° or greater than 360°
 */
export function getChildAngleByIndex(parentNode, childIndex) {
  return getChildAngle(parentNode, getChild(parentNode, childIndex));
}

/**
 * @brief getLoopCenter
 *    - Getter for the center coordinates of a tree node's loop.
 * @param node
 *    - your tree node
 * @param p
 *    - double[2] return value for the loop's center coordinates
 */
export function getLoopCenter(node, p) {
  getLBoxCenter(node.lBox, p);
}

/**
 * @brief getStemCenter
 *    - Getter for the center coordinates of a tree node's stem.
 * @param node
 *    - your tree node
 * @param p
 *    - double[2] return value for the stem's center coordinates
 */
function getStemCenter(node, p) {
  getSBoxCenter(node.sBox, p);
}

/**
 * @brief getChildNode
 *    - searches for the node with given childname in a configtree.
 * @param tree
 *    - configtree you want to search in.
 * @param childID
 *    - ID of childnode you are looking for.
 * @return
 *    - ptr to node or null if tree does not contain such a childnode.
 */
export function getChildNode(tree, childID) {
  const treeIsRoot = isExterior(tree);

  // check if this is the wanted node
  if (!treeIsRoot) {
    if (getNodeID(tree) == childID) {
      return tree;
    }
  }

  // get index of next child on our path
  const child = getChild(tree, getChildIndex(tree, childID));
  if (child == null) {
    return null;
  } else {
    return getChildNode(child, childID);
  }
}

/*
 * Get index-th child
 */
export function getChild(node, index) {
  if (node == null) {
    return null;
  } else if (index < 0) {
    return null;
  } else if (index >= node.childCount) {
    return null;
  } else {
    return node.children[index];
  }
}

export function getParent(node) {
  if (node == null) {
    return null;
  } else {
    return node.parent;
  }
}

function printTree(node, level) {
  for (let i = 0; i < level; i++) {
    console.log("#");
  }

  console.log(" ", getNodeName(node), getNodeID(node));

  for (let i = 0; i < node.childCount; i++) {
    printTree(getChild(node, i), level + 1);
  }
}

