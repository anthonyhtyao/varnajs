import * as vmath from "../vector_math";

const MATH_TWO_PI  = 2.0 * Math.PI;
const epsilon7 = 1e-7;

/**
 * @brief matchPointArc
 *    checks if the given polet is situated on the given wedge
 * @param polet double[2] array with polet coordinates
 * @param arc double[6] array with arc coordinates [circleX, circleY, circleR, arcFrom, arcTo, clockwise]
 * @return 1 if polet is situated on the wedge, 0 otherwise
 */
function matchPointArc(point, arc) {
  /// anpassen !!!
  let center = [arc[0], arc[1]];
  let from = vmath.toRad(arc[3]);
  let to = vmath.toRad(arc[4]);
  let clockwise = (arc[5] > 0.5);

  let v_center_point = [];
  vmath.vector(center, point, v_center_point);

  // 0° is vmath.vector (1,0)
  // angle_cut <= 180° <. cut[1] >= arc_y
  // berechne winkel zwischen (1,0) und v_center_cut
  // setze winkel korrekt (ggf. angle = 360° - angle)
  // prüfe, ob zwischen from und to
  let zero_degree = [ 1, 0 ];
  let angle = vmath.angleBetweenVectors2D(v_center_point, zero_degree);
  if (point[1] < center[1]) {
    angle = MATH_TWO_PI - angle;
  }

  let ret = 0;
  if (clockwise) {
    if (from > to) {
      // normal case
      // check: from < angle < to
      ret = (from >= angle && angle >= to);
    } else {
      // interval surpasses 360° border
      // check: from < angle < 360 or 0 < angle < to
      ret = (from >= angle && angle >= 0) || (MATH_TWO_PI >= angle && angle >= to);
    }
  } else {
    if (from < to) {
      // normal case
      // check: to < angle < from
      ret = (from <= angle && angle <= to);
    } else {
      // interval surpasses 360° border
      // check: from > angle > 0 || MATH_TWO_PI > angle > to
      ret = (from <= angle && angle <= MATH_TWO_PI) || (0 <= angle && angle <= to);
    }
  }

  return ret;
}

function matchLinePoint(pLine, dirLine, p) {
  /// line...
  ///   pX = pLineX + t * dirLineX
  ///   pY = pLineY + t * dirLineY
  ///
  ///   t = (pX - pLineX) / dirLineX  if dirLineX != 0
  ///   t = (pY - pLineY) / dirLineY  if dirLineY != 0

  let t = -1.0; // init as not matching
  if (Math.abs(dirLine[0]) > 0.0001) {  // != 0.0
    t = (p[0] - pLine[0]) / dirLine[0];
  }
  else if (Math.abs(dirLine[1]) > 0.0001) {  // != 0.0
    t = (p[1] - pLine[1]) / dirLine[1];
  }
  else {
    return 0; // this is not even a line since dirLine == (0.0, 0.0)
  }

  return (0.0 <= t && t <= 1.0);
//  /// check if the reference polet matches the input point
//  let refP[2] = { pLine[0] + t * dirLine[0]
//           , pLine[1] + t * dirLine[1] };

//  let vRef[2];
//  vmath.vector(p, refP, vRef);
//  let delta = vmath.vectorLength2D(vRef);
//  let ret = (0.0 <= t && t <= 1.0) && (delta < 0.1);
//  return ret;
}

export function intersectCircleCircle(c1, c1r, c2, c2r) {
  let v_c1_c2 = [];
  vmath.vector(c1, c2, v_c1_c2);
  let distance = vmath.vectorLength2D( v_c1_c2 );

  let intersect = (distance < (c1r + c2r));
//  console.log("C1=(%3.2f, %3.2f) r1=%3.2f ... C2=(%3.2f, %3.2f) r2=%3.2f\n", c1x, c1y, c1r, c2x, c2y, c2r);

  return intersect;
}

export function intersectLineSegments(A, B, X, Y, P) {
  if ((   X[0] < A[0] - epsilon7 && X[0] < B[0] - epsilon7
     && Y[0] < A[0] - epsilon7 && Y[0] < B[0] - epsilon7)
    ||
    (   X[0] > A[0] + epsilon7 && X[0] > B[0] + epsilon7
     && Y[0] > A[0] + epsilon7 && Y[0] > B[0] + epsilon7)
    ) {
    /// Check if the x-coordinates of X and Y are smaller than
    /// the x-coordinates of A and B . lines can not intersect
    return 0;
  }

  if ((   X[1] < A[1] - epsilon7 && X[1] < B[1] - epsilon7
     && Y[1] < A[1] - epsilon7 && Y[1] < B[1] - epsilon7)
    ||
    (   X[1] > A[1] + epsilon7 && X[1] > B[1] + epsilon7
     && Y[1] > A[1] + epsilon7 && Y[1] > B[1] + epsilon7)
    ) {
    /// Check if the y-coordinates of X and Y are smaller than
    /// the y-coordinates of A and B . lines can not intersect
    return 0;
  }

  let denominator = (B[0] - A[0]) * (X[1] - Y[1]) - (B[1] - A[1]) * (X[0] - Y[0]);
  if (Math.abs(denominator) < epsilon7) {
    /// lines are parallel

    /// check if X is situated on AB line
    let sX, sY;

    let dx = B[0] - A[0];
    let dy = B[1] - A[1];

    if (Math.abs(dx) > epsilon7) {
      sX = (X[0] - A[0]) / (dx);
      let refXy = A[1] + sX * (dy);
      if (Math.abs(refXy - X[1]) > epsilon7) {
        /// AB and XY are not part of the same line
        return 0;
      }
      sY = (Y[0] - A[0]) / (dx);
    } else {
      sX = (X[1] - A[1]) / (dy);
      let refXx = A[0] + sX * (dx);
      if (Math.abs(refXx - X[0]) > epsilon7) {
        /// AB and XY are not part of the same line
        return 0;
      }
      sY = (Y[1] - A[1]) / (dy);
    }

    /// check if X or Y are situated directly on AB
    if (   (0.0 <= sX && sX <= 1.0)
      || (0.0 <= sY && sY <= 1.0)) {
      return 1;
    }

    /// check if XY encloses AB
    if (   (sX < 0.0 && 1.0 < sY)
      || (sY < 0.0 && 1.0 < sX)) {
      return 1;
    }

  } else {
    /// lines are not parallel and might intersect
    /// (default case)

    let nominatorS = (X[0] - Y[0]) * (A[1] - X[1]) - (X[1] - Y[1]) * (A[0] - X[0]);
    let nominatorT = (A[0] - X[0]) * (B[1] - A[1]) - (A[1] - X[1]) * (B[0] - A[0]);
    let s = nominatorS / denominator;
    let t = nominatorT / denominator;

    if (0.0 <= s && s <= 1.0 && 0.0 <= t && t <= 1.0) {

      let Ps = [];
      Ps[0] = A[0] + s * (B[0] - A[0]);
      Ps[1] = A[1] + s * (B[1] - A[1]);

      let Pt = [];
      Pt[0] = X[0] + t * (Y[0] - X[0]);
      Pt[1] = X[1] + t * (Y[1] - X[1]);

      if (Math.abs(Ps[0] - Pt[0]) < epsilon7 && Math.abs(Ps[1] - Pt[1]) < epsilon7) {
        if (P != null) {
          P[0] = Ps[0];
          P[1] = Ps[1];
        }
        return 1;
      } else {
        // real difference
        console.log("[DZ] intersectLineSegments: real difference = %15lf\n", Math.abs(Ps[0] - Pt[0]));
      }
    }
  }

  return 0;
}

export function intersectLineArc(point_1,point_2,arc) {
  let fnName = "intersectLineArc";

  //console.log("L_A\n");
  //console.log("from: %3.2f° to: %3.2f° arc[5]:%d angle:%3.2f°");

  let cut = [[], []];
  //console.log("Circle=Circle(%3.2f, %3.2f, %3.2f)\n", arc[0], arc[1], arc[2]);

  let center = [ arc[0], arc[1] ];
  let radius = arc[2];
  let anchor = [ point_1[0], point_1[1] ];
  let direction = [];
  vmath.vector(point_1, point_2, direction);
  let num_points = vmath.getCutPointsOfCircleAndLine(center, radius, anchor, direction, cut[0], cut[1]);

  let ret = 0;
  for (let i = 0; i < num_points; i++) {
    /// check if the computed intersection polet is situated on the line segment
    let A = [ point_1[0], point_1[1] ];
    let B = [ point_2[0], point_2[1] ];
    let line = [];
    vmath.vector(A, B, line);
    let length = vmath.vectorLength2D(line);
    let v_A_cut = [];
    let v_B_cut = [];
    vmath.vector(A, cut[i], v_A_cut);
    vmath.vector(B, cut[i], v_B_cut);
//    console.log("Cut%d=(%3.2f, %3.2f) ", i, cut[i][0], cut[i][1]);
    if (Math.abs(length - vmath.vectorLength2D(v_A_cut) - vmath.vectorLength2D(v_B_cut)) > 0.01) {
      /// consider let errors... should test for !=0
//      console.log("skip\n");
      continue;
    }
//    console.log("test\n");

    /// check if the computed intersection polet is situated between angle_from and angle_to
    ret = ret || matchPointArc(cut[i], arc);

    if (ret) { break; }
  }

  return ret;
}

export function intersectArcArc(arc1, arc2) {
  let fnName = "intersectArcArc";

  let c1 = [ arc1[0], arc1[1] ];
  let r1 = arc1[2];
  let c2 = [ arc2[0], arc2[1] ];
  let r2 = arc2[2];
  if (!intersectCircleCircle(c1, r1, c2, r2)) {
    return 0;
  }

//  console.log("Arc v Arc\n");

  /// get intersection points of corresponding circles
  /// then check if they match the interval of the other arc respectively
  //console.log("[IMPLEMENT ME] intersectArcArc\n");

  let cut = [[], []];
  let num_points = vmath.getCutPointsOfCircles(c1, r1, c2, r2, cut[0], cut[1]);
//  if (num_points <= 0) {
//      console.log("[ERROR] [%s] (%12.8lf %12.8lf %12.8lf) -- (%12.8lf %12.8lf %12.8lf)\n",
//           fnName,
//           c1[0], c1[1], r1,
//           c2[0], c2[1], r2
//      );
//  }
  //  console.log("cut points: %d\n", num_points);
  // 0 - no common points; -1 - circles are equal
  // only test for 1 and 2 cut points
  // in other cases return false

  let ret = 0;
  for (let i = 0; i < num_points; i++) {
    let hit1 = matchPointArc(cut[i], arc1);
    let hit2 = matchPointArc(cut[i], arc2);

    ret = ret || (hit1 && hit2);

    if (ret) {
      console.log("[INFO] [%s] Cut[%d]=(%3.2f, %3.2f)\n", fnName, i, cut[i][0], cut[i][1]);
      console.log("[INFO] [%s] (%12.8lf %12.8lf %12.8lf) -- (%12.8lf %12.8lf %12.8lf)\n",
           fnName,
           c1[0], c1[1], r1,
           c2[0], c2[1], r2
      );
      //break;
    }
  }

  return ret;
}
