import * as vmath from "../vector_math";
import { intersectLineSegments, intersectCircleCircle } from "./intersectLevelLines";
import { getBulgeCoordinatesExtraDistance, getBulgeCoordinates } from "../data/boundingBoxes";

const epsilonRecognize = 14;

export function intersectLoopLoop(loop1,loop2) {
  let c1 = [loop1.c[0], loop1.c[1]];
  let r1   = loop1.r + 0.5 * epsilonRecognize;
  let c2 = [loop2.c[0], loop2.c[1]];
  let r2   = loop2.r + 0.5 * epsilonRecognize;

  return intersectCircleCircle(c1, r1, c2, r2);
}

function projectPointOntoLine(a,b,p,ret_p) {
  let u = []; vmath.vector(a, p, u);
  let v = []; vmath.vector(a, b, v);
  let w = [ -v[1], v[0] ];

  /// split vmath.vector u into linear combination of vmath.vectors v and a vmath.vector perpendicular to v (w)
  /// u = r * v + s * w
  /// compute r which grants all needed information
  let r = (u[1] - u[0] * w[1] / w[0]) / (v[1] - v[0] * w[1] / w[0]);
  if (r < 0.0) {
    ret_p[0] = a[0];
    ret_p[1] = a[1];
  } else if (r > 1.0) {
    ret_p[0] = b[0];
    ret_p[1] = b[1];
  } else {
    ret_p[0] = a[0] + r * v[0];
    ret_p[1] = a[1] + r * v[1];
  }

  //printf("[PROJECT] r = %f\n", r);
  //GEOGEBRA_printPoint("A", a);
  //GEOGEBRA_printPoint("B", b);
  //GEOGEBRA_printPoint("P", p);
  //GEOGEBRA_printPoint("R", ret_p);
  //printf("[GEOGEBRA] AB = Segment[A, B]\n");
  return;
}

function ClosestPtPointBulge(p,a,b,c,ret_p) {
  let fnName = "CLOSEST ON BULGE";
  /// Note:
  ///
  /// In contrast to ClosestPtPointTriangle (taken from book Real-Time Collision Detection)
  /// this function does not work for general triangles.
  /// We implicitely make use of the fact that our bulges are equiliteral triangles
  /// or to be more precise there are no angles greater than 90° in our triangles.
  /// This allows for only checking for the first occurance of a side where polet p
  /// is on the outer side of the triangle and not checking any further.
  ///
  /// In fact applying this function to a triangle with some angle being greater than 90°
  /// may lead to wrong results as follows as described in the mentioned book
  /// (at ClosestPtPointTriangle) as well.

  {
    // check if p on outer side of AB
    let orientABC = vmath.isToTheRightPointPoint(a, b, c);
    let orientABP = vmath.isToTheRightPointPoint(a, b, p);
    //printf("[%s] ABC != ABP ? %d != %d : %d\n", fnName, orientABC, orientABP, orientABC != orientABP);
    if (orientABC != orientABP) {
      // p is on outer side of AB
      //printf("[%s] check AB\n", fnName);
      projectPointOntoLine(a, b, p, ret_p);
      return;
    }
  }

  {
    // check if p on outer side of BC
    let orientBCA = vmath.isToTheRightPointPoint(b, c, a);
    let orientBCP = vmath.isToTheRightPointPoint(b, c, p);
    //printf("[%s] BCA != BCP ? %d != %d : %d\n", fnName, orientBCA, orientBCP, orientBCA != orientBCP);
    if (orientBCA != orientBCP) {
      // p is on outer side of BC
      //printf("[%s] check BC\n", fnName);
      projectPointOntoLine(b, c, p, ret_p);
      return;
    }
  }

  {
    // check if p on outer side of CA
    let orientCAB = vmath.isToTheRightPointPoint(c, a, b);
    let orientCAP = vmath.isToTheRightPointPoint(c, a, p);
    //printf("[%s] CAB != CAP ? %d != %d : %d\n", fnName, orientCAB, orientCAP, orientCAB != orientCAP);
    if (orientCAB != orientCAP) {
      // p is on outer side of CA
      //printf("[%s] check CA\n", fnName);
      projectPointOntoLine(c, a, p, ret_p);
      return;
    }
  }

  {
    // p is inside ABC
    //printf("[%s] inside triangle\n", fnName);
    ret_p[0] = p[0];
    ret_p[1] = p[1];
    return;
  }
}

function ClosestPtPointTriangle(p,a,b,c,ret_p) {
  /*
  printf("ClosestPtPointTriangle (p, a, b, c): P = (%10.8lf, %10.8lf) | A = (%10.8lf, %10.8lf) | B = (%10.8lf, %10.8lf) | C = (%10.8lf, %10.8lf)\n",
       p[0], p[1],
       a[0], a[1],
       b[0], b[1],
       c[0], c[1]
       );
  */
  
  // Check if P in vertex region outside A
  let ab = [];
  let ac = [];
  let ap = [];
  vmath.vector(a, b, ab);
  vmath.vector(a, c, ac);
  vmath.vector(a, p, ap);
  let d1 = vmath.scalarProduct2D(ab, ap);
  let d2 = vmath.scalarProduct2D(ac, ap);
  if (d1 <= 0.0 && d2 <= 0.0) {
    // barycentric coordinates (1,0,0)
    ret_p[0] = a[0];
    ret_p[1] = a[1];
    return;
  }

  // Check if P in vertex region outside B
  let bp = [];
  vmath.vector(b, p, bp);
  let d3 = vmath.scalarProduct2D(ab, bp);
  let d4 = vmath.scalarProduct2D(ac, bp);
  if (d3 >= 0.0 && d4 <= 0.0) {
    // barycentric coordinates (0,1,0)
    ret_p[0] = b[0];
    ret_p[1] = b[1];
    return;
  }

  // Check if P in edge region of AB, if so return projection of P onto AB
  let vc = d1 * d4 - d3 * d2;
  if (vc <= 0.0 && d1 >= 0.0 && d3 <= 0.0) {
    // barycentric coordinates (1-v,v,0)
    let v = d1 / (d1 - d3);
    ret_p[0] = a[0] + v * ab[0];
    ret_p[1] = a[1] + v * ab[1];
    return;
  }

  // Check if P in vertex region outside C
  let cp = [];
  vmath.vector(c, p, cp);
  let d5 = vmath.scalarProduct2D(ab, cp);
  let d6 = vmath.scalarProduct2D(ac, cp);
  if (d6 >= 0.0 && d5 <= d6) {
    // barycentric coordinates (0,0,1)
    ret_p[0] = c[0];
    ret_p[1] = c[1];
    return;
  }

  // Check if P in edge region of AC, if so return projection of P onto AC
  let vb = d5 * d2 - d1 * d6;
  if (vb <= 0.0 && d2 >= 0.0 && d6 <= 0.0) {
    // barycentric coordinates (1-w,0,w)
    let w = d2 / (d2 - d6);
    ret_p[0] = a[0] + w * ac[0];
    ret_p[1] = a[1] + w * ac[1];
    return;
  }

  // Check if P in edge region of BC, if so return projection of P onto BC
  let va = d3 * d6 - d5 * d4;
  if (va <= 0.0) {
    if ((d4 - d3) >= 0.0 && (d5 - d6) >= 0.0) {
    // barycentric coordinates (0,1-w,w)
    let w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    ret_p[0] = b[0] + w * (c[0] - b[0]);
    ret_p[1] = b[1] + w * (c[1] - b[1]);
    return;
    } else if ((d4 - d3) <= 0.0 && (d5 - d6) >= 0.0) {
    // barycentric coordinates (0,1-w,w)
    let w = (d3 - d4) / ((d3 - d4) + (d5 - d6));
    ret_p[0] = b[0] + w * (c[0] - b[0]);
    ret_p[1] = b[1] + w * (c[1] - b[1]);
    return;
    }
  }

  // P inside face region. Compute Q through its barycentric coordinates (u,v,w)
  let denom = 1.0 / (va + vb + vc);
  let v = vb * denom;
  let w = vc * denom;
  ret_p[0] = a[0] + ab[0] * v + ac[0] * w;
  ret_p[1] = a[1] + ab[1] * v + ac[1] * w;
  /*
  printf("ClosestPtPointTriangle (va, vb, vc, v, w): %10.8lf %10.8lf %10.8lf %10.8lf %10.8lf \n",
      va, vb, vc,
      v, w);
  printf("ClosestPtPointTriangle (v, w, a, ab, ac): %10.8lf %10.8lf %10.8lf %10.8lf %10.8lf \n",
       v, w,
       a[0], ab[0], ac[0]
       );
  */
  // = u * a + v * b + w * c, u = va * denom = 1.0 - v - w
  return;

}

/**
 * @brief ClosestPtPointOBB
 * Implementation of ClostestPtPointOBB from the book "Real Time Collision Detection".
 * Calculates the polet on a rectangle (stem) that is closest to a given polet p.
 * @param stem    - rectangle / stem bounding box
 * @param p_x     - x value of polet p
 * @param p_y     - y value of polet p
 * @param ret_p_x   - pointer to closest point's x value (used as return)
 * @param ret_p_y   - pointer to closest point's y value (used as return)
 */
function ClosestPtPointOBB(stem,p,ret_p) {
  let u0 = [ stem.a[0], stem.a[1] ];
  let u1 = [ stem.b[0], stem.b[1] ];
  let dv = [];
  vmath.vector(stem.c, p, dv);

  let dist_0 = vmath.scalarProduct2D(dv, u0);
  let dist_1 = vmath.scalarProduct2D(dv, u1);
  //printf("dist[%3.2f %3.2f]\n", dist_0, dist_1);

  let sign_d0 = dist_0 < 0 ? -1 : 1;
  let sign_d1 = dist_1 < 0 ? -1 : 1;
  let sign_e0 = stem.e[0] < 0 ? -1 : 1;
  let sign_e1 = stem.e[1] < 0 ? -1 : 1;
  let abs_d0 = sign_d0 * dist_0;
  let abs_d1 = sign_d1 * dist_1;
  let abs_e0 = sign_e0 * stem.e[0];
  let abs_e1 = sign_e1 * stem.e[1];

  // clamp dist_0/1 to the extents of the OBB
  let clamped_0 = abs_d0 > abs_e0 ? sign_d0 * abs_e0 : sign_d0 * abs_d0;
  let clamped_1 = abs_d1 > abs_e1 ? sign_d1 * abs_e1 : sign_d1 * abs_d1;

  ret_p[0] = stem.c[0] + clamped_0 * stem.a[0] + clamped_1 * stem.b[0];
  ret_p[1] = stem.c[1] + clamped_0 * stem.a[1] + clamped_1 * stem.b[1];
}

export function intersectStemLoop(stem, loop) {

  // IDEA:
  // get the polet on the rectangle (stem) that is closest to the circle's (loop) center
  // if that polet is situated inside the circle
  // then rectangle and circle intersect
  // (from the book "Real Time Collision Detection")

  // DEBUG
  //  printf("Stem vs Loop\n");
  //  printf("Stem: c[%3.2f, %3.2f] a[%3.2f, %3.2f] b[%3.2f, %3.2f] e[%3.2f, %3.2f]\n",
  //      stem.c[0], stem.c[1],
  //      stem.a[0], stem.a[1],
  //      stem.b[0], stem.b[1],
  //      stem.e[0], stem.e[1]);
  //  printf("Loop: c[%3.2f, %3.2f] r[%3.2f]\n",
  //      loop.c[0], loop.c[1],
  //      loop.r);

  // this is an implementation of TestSphereOBB from the book "Real Time Collision Detection"

  /*
  let stem_ea[2] = { stem.e[0] * stem.a[0],
               stem.e[0] * stem.a[1] };
  let stem_eb[2] = { stem.e[1] * stem.b[0],
               stem.e[1] * stem.b[1] };
  let A1[2] = { stem.c[0] - stem_ea[0] + stem_eb[0],
           stem.c[1] - stem_ea[1] + stem_eb[1] };
  let B1[2] = { stem.c[0] + stem_ea[0] + stem_eb[0],
           stem.c[1] + stem_ea[1] + stem_eb[1] };
  let C1[2] = { stem.c[0] + stem_ea[0] - stem_eb[0],
           stem.c[1] + stem_ea[1] - stem_eb[1] };
  let D1[2] = { stem.c[0] - stem_ea[0] - stem_eb[0],
           stem.c[1] - stem_ea[1] - stem_eb[1] };

  if ((   A1[0] < loop.c[0] - loop.r - epsilonRecognize
     && B1[0] < loop.c[0] - loop.r - epsilonRecognize
     && C1[0] < loop.c[0] - loop.r - epsilonRecognize
     && D1[0] < loop.c[0] - loop.r - epsilonRecognize)
    ||
    (   A1[1] < loop.c[1] - loop.r - epsilonRecognize
     && B1[1] < loop.c[1] - loop.r - epsilonRecognize
     && C1[1] < loop.c[1] - loop.r - epsilonRecognize
     && D1[1] < loop.c[1] - loop.r - epsilonRecognize)
    ||
    (   A1[0] > loop.c[0] + loop.r + epsilonRecognize
     && B1[0] > loop.c[0] + loop.r + epsilonRecognize
     && C1[0] > loop.c[0] + loop.r + epsilonRecognize
     && D1[0] > loop.c[0] + loop.r + epsilonRecognize)
    ||
    (   A1[1] > loop.c[1] + loop.r + epsilonRecognize
     && B1[1] > loop.c[1] + loop.r + epsilonRecognize
     && C1[1] > loop.c[1] + loop.r + epsilonRecognize
     && D1[1] > loop.c[1] + loop.r + epsilonRecognize)
    ) {
    return 0;
  }
  */

  let intersect = 0;

  let p = [];
  ClosestPtPointOBB(stem, loop.c, p);
  //  printf("ClosestPtPoint: [%3.2f %3.2f]\n", p_x, p_y);
  //  printf("Center:     [%3.2f %3.2f]\n", loop.c[0], loop.c[1]);

  let v_c_to_p = [];
  vmath.vector(loop.c, p, v_c_to_p);
  /*
  let distance = vmath.vectorLength2D( v_c_to_p );
  //  printf("distance:     %3.2f\n", distance);
  //  printf("radius:     %3.2f\n", loop.r);

  intersect = (distance < (loop.r + epsilonRecognize)); // add epsilon to classify nearby objects as intersecting
  //  printf("intersecting: %d\n", intersect);
  */

  let distanceSquared = vmath.vectorLength2DSquared( v_c_to_p );
  intersect = (distanceSquared <
         ((loop.r + epsilonRecognize) *
          (loop.r + epsilonRecognize)));
  // add epsilon to classify nearby objects as intersecting
  return intersect;
}

export function intersectStemStem(stem1, stem2) {

  /// brute force approach for intersecting two rectangles
  let stem1_ea = [ stem1.e[0] * stem1.a[0],
               stem1.e[0] * stem1.a[1] ];
  let stem1_eb = [ stem1.e[1] * stem1.b[0],
               stem1.e[1] * stem1.b[1] ];
  let B1 = [ stem1.c[0] + stem1_ea[0] + stem1_eb[0],
           stem1.c[1] + stem1_ea[1] + stem1_eb[1] ];
  let C1 = [ stem1.c[0] + stem1_ea[0] - stem1_eb[0],
           stem1.c[1] + stem1_ea[1] - stem1_eb[1] ];
  let D1 = [ stem1.c[0] - stem1_ea[0] - stem1_eb[0],
           stem1.c[1] - stem1_ea[1] - stem1_eb[1] ];
  let A1 = [ stem1.c[0] - stem1_ea[0] + stem1_eb[0],
           stem1.c[1] - stem1_ea[1] + stem1_eb[1] ];

  let stem2_ea = [ stem2.e[0] * stem2.a[0],
               stem2.e[0] * stem2.a[1] ];
  let stem2_eb = [ stem2.e[1] * stem2.b[0],
               stem2.e[1] * stem2.b[1] ];
  let B2 = [ stem2.c[0] + stem2_ea[0] + stem2_eb[0],
           stem2.c[1] + stem2_ea[1] + stem2_eb[1] ];
  let C2 = [ stem2.c[0] + stem2_ea[0] - stem2_eb[0],
           stem2.c[1] + stem2_ea[1] - stem2_eb[1] ];
  let D2 = [ stem2.c[0] - stem2_ea[0] - stem2_eb[0],
           stem2.c[1] - stem2_ea[1] - stem2_eb[1] ];
  let A2 = [ stem2.c[0] - stem2_ea[0] + stem2_eb[0],
           stem2.c[1] - stem2_ea[1] + stem2_eb[1] ];

  // Only the sides of the stems (AB, CD) need to be intersected against
  // each other
  if (   intersectLineSegments(A1, B1, A2, B2, null)
//    || intersectLineSegments(A1, B1, B2, C2, null)
    || intersectLineSegments(A1, B1, C2, D2, null)
//    || intersectLineSegments(A1, B1, D2, A2, null)
//    || intersectLineSegments(B1, C1, A2, B2, null)
//    || intersectLineSegments(B1, C1, B2, C2, null)
//    || intersectLineSegments(B1, C1, C2, D2, null)
//    || intersectLineSegments(B1, C1, D2, A2, null)
    || intersectLineSegments(C1, D1, A2, B2, null)
//    || intersectLineSegments(C1, D1, B2, C2, null)
    || intersectLineSegments(C1, D1, C2, D2, null)
//    || intersectLineSegments(C1, D1, D2, A2, null)
//    || intersectLineSegments(D1, A1, A2, B2, null)
//    || intersectLineSegments(D1, A1, B2, C2, null)
//    || intersectLineSegments(D1, A1, C2, D2, null)
//    || intersectLineSegments(D1, A1, D2, A2, null)
     ) {
    return 1;
  } else {
    return 0;
  }
}

// Returns true if circle circ intersects triangle ABC, false otherwise.
function TestCircleTriangle(circ_c,circ_r,A,B,C,p) {
  // Find polet P on triangle ABC closest to circle center

  // DA version
  ClosestPtPointBulge(circ_c, A, B, C, p);

//  // DZ version
//  let p[2];
//  ClosestPtPointTriangle(circ_c, A, B, C, p);
//  if ((fabs(circ_c[0] - p[0]) <= epsilon3)
//    && (fabs(circ_c[1] - p[1]) <= epsilon3)) {
//    printf("TestCircleTriangle: %10.8lf %10.8lf <. %10.8lf %10.8lf\n",
//       circ_c[0], circ_c[1],
//       p[0], p[1]);
//  }

  // circle and triangle intersect if the (squared) distance from circle
  // center to polet is less than the (squared) circle radius
  let v = [];
  vmath.vector(p, circ_c, v);

  let ret = vmath.scalarProduct2D(v, v) <= (circ_r * circ_r);

  //printf("[TEST TRIANGLE]\n");
  //GEOGEBRA_printPoint("A", A);
  //GEOGEBRA_printPoint("B", B);
  //GEOGEBRA_printPoint("C", C);
  //printf("[GEOGEBRA] abc = Polygon[A,B,C]\n");
  //GEOGEBRA_printPoint("IN", circ_c);
  //GEOGEBRA_printPoint("OUT", p);

  return ret;
}

function TestLoopBulge(c,r,pPrev,pThis,pNext) {

  // check if bulge polet is inside loop
  let vCenterBulge = [];
  vmath.vector(c, pThis, vCenterBulge);
  if (r * r > vmath.vectorLength2DSquared(vCenterBulge)) { // compare r and length of vCenterBulge; using squared distances is less expensive that sqrt
    return 1;
  }

  let vPrevThis = [];
  vmath.vector(pPrev, pThis, vPrevThis);
  let vThisNext = [];
  vmath.vector(pThis, pNext, vThisNext);

  let cut1 = [], cut2 = [];
  let numCut;

  // evaluate line pPrev.pThis
  numCut = getCutPointsOfCircleAndLine(c, r, pPrev, vPrevThis, cut1, cut2);
  if (numCut > 0) {
    if (matchLinePoint(pPrev, vPrevThis, cut1)) {
      return 1;
    }
  }
  if (numCut > 1) {
    if (matchLinePoint(pPrev, vPrevThis, cut2)) {
      return 1;
    }
  }

  // evaluate line pThis.pNext
  numCut = getCutPointsOfCircleAndLine(c, r, pThis, vThisNext, cut1, cut2);
  if (numCut > 0) {
    if (matchLinePoint(pThis, vThisNext, cut1)) {
      return 1;
    }
  }
  if (numCut > 1) {
    if (matchLinePoint(pThis, vThisNext, cut2)) {
      return 1;
    }
  }

  return 0;
}

export function intersectLoopBulges(loop, stem, bulge) {
  bulge = -1;

  let c = [ loop.c[0], loop.c[1] ];
  let r = loop.r + epsilonRecognize;

  for (let currentBulge = 0; currentBulge < stem.bulgeCount; currentBulge++) {
    /**/
    let A = [], B = [], C = [];
    getBulgeCoordinates(stem, currentBulge, A, B, C);

    let p = [];
    if (TestCircleTriangle(c, r, A, B, C, p)) {
      bulge = currentBulge;
      return [1, bulge];
    }

  }

  return [0, bulge];
}

export function intersectBulgesBulges(stem1,stem2,bulge1,bulge2) {
  bulge1 = -1;
  bulge2 = -1;

  let distance = 0.5 * epsilonRecognize;

  for (let currentBulge1 = 0; currentBulge1 < stem1.bulgeCount; currentBulge1++) {
    let piPrev = [], piThis = [], piNext = [];
    getBulgeCoordinatesExtraDistance(stem1, currentBulge1, distance, piPrev, piThis, piNext);
    for (let currentBulge2 = 0; currentBulge2 < stem2.bulgeCount; currentBulge2++) {
      let pjPrev = [], pjThis = [], pjNext = [];
      getBulgeCoordinatesExtraDistance(stem2, currentBulge2, distance, pjPrev, pjThis, pjNext);

      if (   intersectLineSegments(piPrev, piThis, pjPrev, pjThis, null)
        || intersectLineSegments(piPrev, piThis, pjThis, pjNext, null)
        || intersectLineSegments(piThis, piNext, pjPrev, pjThis, null)
        || intersectLineSegments(piThis, piNext, pjThis, pjNext, null)
      ) {
        bulge1 = currentBulge1;
        bulge2 = currentBulge2;
        return [1, bulge1, bulge2];
      }
    }
  }

  return [0, bulge1, bulge2];
}

export function intersectStemBulges(stem1,stem2,bulge2) {
  bulge2 = -1;

  if (stem2.bulgeCount == 0) {
    return [0, bulge2];
  }

  /// simplify to only check bulge lines against left and right stem lines
  ///
  /// if the bulge is surrounded by the stem then there is a Stem vs. Stem intersection
  /// if the bulge intersects the stem's bottom or top line then there is an intersection with the adjacent loop
  /// . no need to checks those cases

  // N - North, E - East, S - South, W - West
  // north is direction to loop
  let pNW = [];
  pNW[0] = stem1.c[0] + stem1.e[0] * stem1.a[0] - stem1.e[1] * stem1.b[0];
  pNW[1] = stem1.c[1] + stem1.e[0] * stem1.a[1] - stem1.e[1] * stem1.b[1];
  let pSW = [];
  pSW[0] = stem1.c[0] - stem1.e[0] * stem1.a[0] - stem1.e[1] * stem1.b[0];
  pSW[1] = stem1.c[1] - stem1.e[0] * stem1.a[1] - stem1.e[1] * stem1.b[1];
  let pNE = [];
  pNE[0] = stem1.c[0] + stem1.e[0] * stem1.a[0] + stem1.e[1] * stem1.b[0];
  pNE[1] = stem1.c[1] + stem1.e[0] * stem1.a[1] + stem1.e[1] * stem1.b[1];
  let pSE = [];
  pSE[0] = stem1.c[0] - stem1.e[0] * stem1.a[0] + stem1.e[1] * stem1.b[0];
  pSE[1] = stem1.c[1] - stem1.e[0] * stem1.a[1] + stem1.e[1] * stem1.b[1];

  let distance = epsilonRecognize;
  for (let currentBulge2 = 0; currentBulge2 < stem2.bulgeCount; currentBulge2++) {
    let pPrev = [], pThis = [], pNext = [];
    getBulgeCoordinatesExtraDistance(stem2, currentBulge2, distance, pPrev, pThis, pNext);

    if (   intersectLineSegments(pNW, pSW, pPrev, pThis, null)
      || intersectLineSegments(pNW, pSW, pThis, pNext, null)
      || intersectLineSegments(pNE, pSE, pPrev, pThis, null)
      || intersectLineSegments(pNE, pSE, pThis, pNext, null)
    ) {
      bulge2 = currentBulge2;
      return [1, bulge2];
    }
  }

  return [0, bulge2];
}
