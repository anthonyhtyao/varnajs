import * as vmath from "../vector_math";
import { boundingboxStem, boundingboxLoop } from "../datatypes";

export function getBulgeXY(stem, index) {
  let bulge = stem.bulges[index];
  let x = stem.c[0] + bulge[2] * stem.a[0] + bulge[0] * stem.b[0] * (stem.e[1] + stem.bulgeDist);
  let y = stem.c[1] + bulge[2] * stem.a[1] + bulge[0] * stem.b[1] * (stem.e[1] + stem.bulgeDist);
  return [x, y];
}

export function getBulgeCoordinatesExtraDistance(stem, index, extraDistance, pPrev, pThis, pNext) {
  let bulge = stem.bulges[index];
  pPrev[0] = stem.c[0] + bulge[1] * stem.a[0] + bulge[0] * stem.b[0] *  stem.e[1];
  pPrev[1] = stem.c[1] + bulge[1] * stem.a[1] + bulge[0] * stem.b[1] *  stem.e[1];
  pThis[0] = stem.c[0] + bulge[2] * stem.a[0] + bulge[0] * stem.b[0] * (stem.e[1] + extraDistance + stem.bulgeDist);
  pThis[1] = stem.c[1] + bulge[2] * stem.a[1] + bulge[0] * stem.b[1] * (stem.e[1] + extraDistance + stem.bulgeDist);
  pNext[0] = stem.c[0] + bulge[3] * stem.a[0] + bulge[0] * stem.b[0] *  stem.e[1];
  pNext[1] = stem.c[1] + bulge[3] * stem.a[1] + bulge[0] * stem.b[1] *  stem.e[1];
}

export function getBulgeCoordinates(stem, index, pPrev, pThis, pNext) {
  getBulgeCoordinatesExtraDistance(stem, index, 0, pPrev, pThis, pNext);
}

export function translateLoopBox(box, vector) {
  let center = [box.c[0], box.c[1]];
  let newCenter = [];
  vmath.translatePointByVector(center, vector, newCenter);
  box.c[0] = newCenter[0];
  box.c[1] = newCenter[1];
}

function rotateLoopBox(box, point, angle) {
  let loopCenter = [box.c[0], box.c[1]];
  let newLoopCenter = [];

  vmath.rotatePointAroundPoint(loopCenter, point, angle, newLoopCenter);

  box.c[0] = newLoopCenter[0];
  box.c[1] = newLoopCenter[1];
}

export function translateStemBox(box, vector) {
  let center = [ box.c[0], box.c[1] ];
  let newCenter = [];
  vmath.translatePointByVector(center, vector, newCenter);
  box.c[0] = newCenter[0];
  box.c[1] = newCenter[1];
}

function rotateStemBox(box, point, angle) {
  let stemCenter = [ box.c[0], box.c[1] ];
  let stemDirA =   [ box.a[0], box.a[1] ];
  let stemDirB =   [ box.b[0], box.b[1] ];
  let newStemCenter = [];
  let newStemDirA = [];
  let newStemDirB = [];

  vmath.rotatePointAroundPoint(stemCenter, point, angle, newStemCenter);
  vmath.rotateVectorByAngle(stemDirA, angle, newStemDirA);
  vmath.rotateVectorByAngle(stemDirB, angle, newStemDirB);

  box.c[0] = newStemCenter[0];
  box.c[1] = newStemCenter[1];
  box.a[0] = newStemDirA[0];
  box.a[1] = newStemDirA[1];
  box.b[0] = newStemDirB[0];
  box.b[1] = newStemDirB[1];
}

function getLoopData(center, start, ptable, baseInformation, x, y) {
  // copy/pasted from plot_layouts.c ... consider moving this one to utils or such a thing.

  let i = start;
  let end = ptable[start];
  let cfg = baseInformation[i].config;
  let r = cfg.radius;

  // Reminder to offset -1
  // x, y and arc_coords as well have their entry for the first base (i=1) at index 0
  // this results in a offset -1 at every reading access to x, y
  // consider the stem just before the loop
  // if i's partner is to the right of the loop's first line
  // then this loop is directed clockwise, counter clockwise otherwise
  let current = [x[start-1], y[start-1]];
  let next = [x[(start+1)-1], y[(start+1)-1]];
  let last = [x[end-1], y[end-1]];
  let go_clockwise = vmath.isToTheRightPointPoint(current, next, last);

  let v_pair = [];
  vmath.vector(last, current, v_pair);

  let v_normal = [];
  vmath.normal(v_pair, v_normal);

  let pair_length = vmath.vectorLength2D(v_pair); // = paired

  let center_dist = Math.sqrt(r*r - 0.25*pair_length*pair_length);

  // for clockwise go to the right... and to the left for counter clockwise loop
  let dir = go_clockwise ? 1 : -1;
  center[0] = last[0] + 0.5 * v_pair[0] + dir * center_dist * v_normal[0];
  center[1] = last[1] + 0.5 * v_pair[1] + dir * center_dist * v_normal[1];
  return r;
}

export function createLoopBox(center, radius) {
  let box = new boundingboxLoop();
  box.c = []
  box.c[0] = center[0];
  box.c[1] = center[1];
  box.r  = radius;

  return box;
}

export function buildLoopBox(start, ptable, baseInformation, x, y) {
  let center = [];

  // calculate center coords and radius for the loop
  let radius = getLoopData(center, start, ptable, baseInformation, x, y);

  //console.log("lBox [%3.2f %3.2f] r:%3.2f\n", center_x, center_y, radius);

  return createLoopBox(center, radius);
}

export function createStemBox(s, e, sp) {
  let box = new boundingboxStem();

  let a = [ 0.5 * (e[0] -  s[0]), 0.5 * (e[1] -  s[1]) ];
  let b = [ 0.5 * (s[0] - sp[0]), 0.5 * (s[1] - sp[1]) ];

  let length_a = vmath.vectorLength2D( a );
  let length_b = vmath.vectorLength2D( b );

  if (length_a == 0) {
    // solve this using b's normal vector
    vmath.normal(b, a);
    // make a have length 0.1 to create a proper bounding box
    length_a = 0.1;
    a[0] = a[0] * length_a;
    a[1] = a[1] * length_a;
  }

  box.a = [];
  box.b = [];
  box.c = [];
  box.d = [];
  box.e = [];

  box.a[0] = a[0] / length_a;
  box.a[1] = a[1] / length_a;
  box.b[0] = b[0] / length_b;
  box.b[1] = b[1] / length_b;
  box.c[0] = s[0] + a[0] - b[0];
  box.c[1] = s[1] + a[1] - b[1];
  box.e[0] = length_a;
  box.e[1] = length_b;

  return box;
}

function countBulges(ptable, start, end) {
  let bulgeCount = 0;

  for (let i = start; i < end; i++) {
    if (ptable[i] == 0) {
      bulgeCount++;
    }
  }

  for (let i = ptable[end]; i < ptable[start]; i++) {
    if (ptable[i] == 0) {
      bulgeCount++;
    }
  }

  return bulgeCount;
}

function getA(box, x, y) {
  let a = [ box.a[0], box.a[1] ];
  let b = [ box.b[0], box.b[1] ];
  let c = [ box.c[0], box.c[1] ];
  let p = [ x - c[0], y - c[1] ];

  let ret = 0.0;
  if (b[0] == 0.0) {
    ret = p[0] / a[0];
  } else if (b[1] == 0.0) {
    ret = p[1] / a[1];
  } else {
    ret = ( p[0] * b[1] - p[1] * b[0] ) / ( a[0] * b[1] - a[1] * b[0] );
  }
  return ret;
}

function createBulge(box, x, y, i, bSign) {
  let bulge = [];

  // remember -1 offset between
  let aPrev = getA(box, x[(i-1) -1], y[(i-1) -1]);
  let aThis = getA(box, x[(i-1) +0], y[(i-1) +0]);
  let aNext = getA(box, x[(i-1) +1], y[(i-1) +1]);

  bulge[0] = bSign;
  bulge[1] = aPrev;
  bulge[2] = aThis;
  bulge[3] = aNext;

  return bulge;
}

function setBulges(box, ptable, start, end, x, y, bulgeCount, bulgeDist) {
  if (bulgeCount <= 0) {
    box.bulges = null;
    box.bulgeCount = 0;
    box.bulgeDist = bulgeDist;
    return;
  }

  let bulges = [];
  let currentBulge = 0;
  for (let i = start; i < end; i++) {
    if (ptable[i] == 0) {
      let bSign = 1.0;
      let bulge = createBulge(box, x, y, i, bSign);
      bulges[currentBulge] = bulge;
      currentBulge++;
    }
  }

  for (let i = ptable[end]; i < ptable[start]; i++) {
    if (ptable[i] == 0) {
      let bSign = -1.0;
      let bulge = createBulge(box, x, y, i, bSign);
      bulges[currentBulge] = bulge;
      currentBulge++;
    }
  }

  box.bulgeCount = bulgeCount;
  box.bulgeDist = bulgeDist;
  box.bulges = bulges;
}

export function buildStemBox(start, end, ptable, x, y, bulgeDist) {
  let i_s = start;
  let i_e = end;
  let i_sp = ptable[start];

  /// get coordinates for rectangle corners
  // -1 for offset ptable vs. x/y
  let s  = [x[i_s -1], y[i_s -1]];
  let e  = [x[i_e -1], y[i_e -1]];
  let sp = [x[i_sp-1], y[i_sp-1]];

  /// finally create the box
  let box = createStemBox(s, e, sp);

  /// get coordinates for bulges
  let bulgeCount = countBulges(ptable, i_s, i_e);
  setBulges(box, ptable, i_s, i_e, x, y, bulgeCount, bulgeDist);

  return box;
}

function printLBox(loop) {
  console.log("lBox [%3.2f, %3.2f] r:%3.2f\n",
      loop.c[0],
      loop.c[1],
      loop.r);
}

function printSBox(stem) {
  let type = 1;
  if (type == 0) {
    let a = [ stem.a[0] * stem.e[0], stem.a[1] * stem.e[0] ];
    let b = [ stem.b[0] * stem.e[1], stem.b[1] * stem.e[1] ];

    // s  = c - a + b
    // e  = c + a + b
    // ep = c + a - b
    // sp = c - a - b
    let s  = [  stem.c[0] - a[0] + b[0], stem.c[1] - a[1] + b[1] ];
    let e  = [  stem.c[0] + a[0] + b[0], stem.c[1] + a[1] + b[1] ];
    let ep = [  stem.c[0] + a[0] - b[0], stem.c[1] + a[1] - b[1] ];
    let sp = [  stem.c[0] - a[0] - b[0], stem.c[1] - a[1] - b[1] ];

    console.log("sBox [%3.2f, %3.2f] . [%3.2f, %3.2f] . [%3.2f, %3.2f] . [%3.2f, %3.2f]\n",
             s[0],  s[1],    e[0],  e[1],   ep[0], ep[1],   sp[0], sp[1]);
  }
  if (type == 1) {
    console.log("sBox a=(%3.2f, %3.2f) b=(%3.2f, %3.2f) c=(%3.2f, %3.2f)\n"
        , stem.a[0]
        , stem.a[1]
        , stem.b[0]
        , stem.b[1]
        , stem.e[0]
        , stem.e[1]
        );
  }
}

export function getLBoxCenter(box, c) {
  c[0] = box.c[0];
  c[1] = box.c[1];
}

export function getSBoxCenter(box, c) {
  c[0] = box.c[0];
  c[1] = box.c[1];
}

