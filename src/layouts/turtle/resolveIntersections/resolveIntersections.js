import * as ctree from "../data/configtree";
import { optimizeTree } from "./optimize";
import { checkNodeAgainstAncestors } from "./handleAncestorIntersections";
import {checkSiblings } from "./handleSiblingIntersections";

export function checkAndFixIntersections(node, recursionDepth, puzzler) {

    /// IN:  tree that may contain some intersections
    /// OUT: tree with no intersections (that shall be resolved at this tree level)
    ///
    /// Note on OUT:
    /// The only type of intersection that is allowed to persist the execution of this function's call
    /// is sibling intersections that are not resolved by checkSiblings' calls (on purpose).
    /// Those remaining intersection share the characteristic that at least one of those intersectors
    /// has a ancestorIntersection at a higher tree level.
    /// Resolving that ancestorIntersection (or both) will resolve the sibling intersection as well.

    let checkTree = true;
    while (checkTree) {
        checkTree = false;

        /// on the way from root to leaves ...
        /// - resolve ancestor intersections
        if (puzzler.checkAncestorIntersections && !ctree.isExterior(node)) {
            let changedNodeByAncestor = checkNodeAgainstAncestors(node, puzzler);
            if (changedNodeByAncestor != null) {
                // go one level up in the hierarchy
                return changedNodeByAncestor;
            }
        }

        /// - recursive call for all children
        if (!checkTree) {
            for (let i = 0; i < node.childCount; i++) {
                let child = ctree.getChild(node, i);
                let changedNodeByRecursion = checkAndFixIntersections(child, recursionDepth + 1, puzzler);

                /// move upwards in tree (stop handling of the current node)
                /// return to 'changedNodeByRecursion' node
                if (changedNodeByRecursion != null) {
                    //printDebug(fnName, "checkAndFixIntersections: %d -- %d\n", getNodeID(changedNode), getNodeID(node));
                    if (ctree.getNodeID(changedNodeByRecursion) < ctree.getNodeID(node)) {
                        // go one level up in the hierarchy
                        return changedNodeByRecursion;
                    } else if (changedNodeByRecursion == node) {
                        // continue with this node
                        checkTree = true;
                        break;
                    }
                } else {
                    /// successfully returned from child (finished)
                }
            }
        }

        /// on the way back from leaves to root ...
        /// - resolve sibling intersections
        if (puzzler.checkSiblingIntersections && !ctree.isExterior(node) && !checkTree) {
            /// precondition at this point:
            ///
            /// all subtrees of the current node (excluding the current node) do not have any intersection
            /// (they might only intersect against sibling subtrees at this or a higher level)
            let result = checkSiblings(node, puzzler);
            if (result < 0) {
                return null;
            } else if (result) {
                checkTree = true;
                continue;
            }
        }
    }

    /// ----- OPTIMIZATIONS -----
    if (puzzler.optimize) {
        let optimize = false;
//        printDebug(fnName, "optimize %d\n", optimize);
        /// Optimize, if
        if (ctree.isExterior(node)) {
            optimize = false;
        } else if (ctree.isExterior(ctree.getParent(node))) {
            /// - parent is exterior node
            optimize = true;
//            printDebug(fnName, "exterior optimize %d\n", optimize);
        } else if (node.cfg.radius > 10 * node.cfg.defaultRadius) {
            /// - current nodes radius increased by at least one order of magnitude
            optimize = true;
//            printDebug(fnName, "radius optimize %d: %12.8lf > %12.8lf\n", optimize, node.cfg.radius, node.cfg.defaultRadius);
        }

//        printDebug(fnName, "optimize? %d\n", optimize);
        if (optimize) {
//            printDebug(fnName, "optimizeTree! %d\n", optimize);
            optimizeTree(node, puzzler);
        }
    }

    /// ----- optional checks at the end -----

//    if (intersectTrees(node, node)) {
//        printError(fnName, "[FAILED] to resolve subtree %d [%s_DEBUG_TREE_%05d_%04d.ps]\n", getNodeID(node), puzzler.filename, puzzler.numberOfChangesAppliedToConfig, getNodeID(node));
//        printError(fnName, "[ INFO ] Remember that are some sibling intersection cases that are just fine to remain.\n");
//        PS_printTree(node, puzzler);
//    }

    // if (FANCY_PS) {
    //     PS_printFancyTree(node, puzzler);
    // }

    return null;
}

