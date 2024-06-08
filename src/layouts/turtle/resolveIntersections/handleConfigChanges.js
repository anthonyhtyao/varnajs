import { intersectionTypeToString } from "./intersectionType";
import { cfgIsValid } from "../data/config";
import { applyChangesToConfigAndBoundingBoxes } from "../data/configtree";

const epsilon3 = 1e-3;

function logConfigChanges(id,cfg,deltaCfg,oldRadius,newRadius,logTag,puzzler) {
  let fnName = "configChanges";

  console.log(fnName, "Change #%5d  %s  %5d",
           puzzler.numberOfChangesAppliedToConfig,
           logTag,
           id);
  if (newRadius - oldRadius != 0.0) {
    console.log(null, "  radius: %9.2lf.%9.2lf (%+7.2lf%%) diff: %+.2le",
         oldRadius, newRadius,
         100.0 * (newRadius / oldRadius) - 100.0,
         newRadius - oldRadius);
  } else {
    console.log(null, "  radius did not change");
  }

  if (deltaCfg != null) {
    for (let i = 0; i < cfg.numberOfArcs; i++) {
      if (deltaCfg[i] != 0.0) {
        console.log(null, " %d: %+.2le°", i, deltaCfg[i]);
      }
    }
  } else {
    console.log(null, "  EMPTY");
  }
  console.log(null, "\n");
}

/**
 * @brief checkAndApplyConfigChanges
 *    - Method for performing of config.
 *    Alters config as well as all corresponding boundingboxes.
 *    Determines the new radius that fits best.
 * @param tree
 *    - tree node where the config is changed.
 * @param deltaCfg
 *    - array of config changes.
 *    contains diff-values for each config angle.
 *    in degree format
 * @return 1 if something changed, 0 otherwise
 */
export function checkAndApplyConfigChanges(tree,deltaCfg,it,puzzler) {
  let fnName = "checkAndApplyConfigChanges";
  let cfg = tree.cfg;

  /// fix deltas if changes are too small
  ///
  /// this is necessary because sometimes the calculation results in micro changes.
  /// These micro changes go along with an increase of the loops radius which causes
  /// new problems as the changes being too small to get enough distance to the
  /// changed loop and the intersector being stuck in collision (again).
  ///
  /// multiplying by factor 2.0 we always get a resulting angle between 0.1° and 0.2°
  /// don't use factor 10 as the impact of doing so is way too strong and often causes crashes
  /// in term of applicability of the changes
  let fixTooSmallChanges = 1;
  if (fixTooSmallChanges && deltaCfg != null) {
    for (let cntr = 0; cntr < 100; cntr++) {
      let valid = 0;
      for (let currentArc = 0; currentArc < cfg.numberOfArcs; currentArc++) {
        if (Math.abs(deltaCfg[currentArc]) >= epsilon3) {
          valid = 1;
          break;
        }
      }
      if (valid) {
        break;
      } else {
        for (let currentArc = 0; currentArc < cfg.numberOfArcs; currentArc++) {
          deltaCfg[currentArc] = 2.0 * deltaCfg[currentArc];
        }
      }
//    if (LOG_FLAG && cntr > 0) {
//      printf("[ LOG ] fixing... (%d)\n", cntr);
//    }
    }
  }

  /*
  printDebug(fnName, "\t- config old -\n");
  cfgPrintConfig(cfg);
  */

  let logTag = intersectionTypeToString(it);

  if (cfgIsValid(cfg, deltaCfg)) {

    (puzzler.numberOfChangesAppliedToConfig)++;
    let oldRadius = cfg.radius;

    let radiusNew = -1.0; // == unknown | calculate optimal radius
    applyChangesToConfigAndBoundingBoxes(tree, deltaCfg, radiusNew, puzzler);

    let newRadius = cfg.radius;
    // logConfigChanges(getNodeID(tree), cfg, deltaCfg, oldRadius, newRadius, logTag, puzzler);

    return 1;
  } else {
    /// changes result in angles outside 0° to 360°
    console.log(fnName, "%s cannot apply changes to config. Invalid changes.\n", logTag);

    /*
    /// prlet erronious changes
    printConfigError(fnName, tree, deltaCfg);
    */

    /// for not ending up in infinite calculations without being able to apply any changes
    /// we increase the counter for changes per default
    /// infinite calculations occurred while testing with RNA families
    (puzzler.numberOfChangesAppliedToConfig)++;
    return 0;
  }
}

