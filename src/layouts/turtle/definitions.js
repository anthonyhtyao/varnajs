const epsilon7 = 1e-7;

export function createPuzzlerOptions() {
  let puzzler = {};

  // drawing behavior
  puzzler.drawArcs = 1;
  puzzler.paired = 35.0;
  puzzler.unpaired = 25.0;

  // intersection resolution behavior
  puzzler.checkExteriorIntersections = 1;
  puzzler.checkSiblingIntersections = 1;
  puzzler.checkAncestorIntersections = 1;
  puzzler.optimize = 1;

  // import behavior - unused for now
  puzzler.config = null;

  // other stuff
  puzzler.filename = null;

  puzzler.numberOfChangesAppliedToConfig = 0;
  puzzler.psNumber = 0;
  puzzler.maximumNumberOfConfigChangesAllowed = null;

  return puzzler;
}


export function bubblesort(numValues, valuesLevel1, valuesLevel2, indices) {
  for (let i = 0; i < numValues; i++) {
    indices[i] = i;
  }

  let thisValue = 0.0;
  let nextValue = 0.0;
  let swap = 0;
  for (let i = 0; i < numValues-1; i++) {
    for (let j = 0; j < numValues-i-1; j++) {
      thisValue = valuesLevel1[indices[j+0]];
      nextValue = valuesLevel1[indices[j+1]];
      swap = 0;
      if (nextValue - thisValue > epsilon7) {
        swap = 1;
      } else if (Math.abs(nextValue - thisValue) < epsilon7) {
        thisValue = valuesLevel2[indices[j+0]];
        nextValue = valuesLevel2[indices[j+1]];
        if (nextValue - thisValue > epsilon7) {
          swap = 1;
        }
      }

      if (swap) {
        let tmp = indices[j+0];
        indices[j+0] = indices[j+1];
        indices[j+1] = tmp;
      }
    }
  }
}

/**
 * @brief
 *    Given a circle's radius and a distance between two points on the circle
 *    this function calculates the angle between those points.
 *    Note that the resulting angle will always be smaller than or equal to 180°.
 *    If knowing the wanted angle being greater than 180° just subtract the result from 360°.
 * @param radius the circle's radius
 * @param distance the distance between two points on the circle
 * @return angle in degree
 */
export function distanceToAngle(radius, distance) {
  return (2.0 * Math.asin(distance / (2.0 * radius)));
}

export function angleToDistance(radius, angle) {
  return (2.0 * radius * Math.sin(angle / 2.0));
}

