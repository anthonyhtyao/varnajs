const MATH_PI      = Math.PI; 
const MATH_PI_HALF = MATH_PI / 2.0;
const MATH_TWO_PI  = 2.0 * MATH_PI;
const TO_DEGREE    = 180.0 / MATH_PI;
const TO_RAD       = MATH_PI / 180.0;
const epsilon0 = 1.0;
const epsilon3 = 1e-3;
const epsilon7 = 1e-7;

function toDegree(angle) {
    return angle * TO_DEGREE;
}

export function toRad(angle) {
    return angle * TO_RAD;
}

export function vectorLength2D(vector) {
    let x = vector[0];
    let y = vector[1];
    return Math.sqrt( x * x + y * y );
}

export function vectorLength2DSquared(vector) {
    let x = vector[0];
    let y = vector[1];
    return x * x + y * y;
}

export function scalarProduct2D(vector1, vector2) {
    let x1 = vector1[0];
    let y1 = vector1[1];
    let x2 = vector2[0];
    let y2 = vector2[1];
    let scalarProduct = ( x1 * x2 + y1 * y2 );
    //console.log("[SCALAR PRODUCT] %f * %f + %f * %f = %f\n", x1, x2, y1, y2, scalarProduct);
    return scalarProduct;
}

function normalize(vector) {
    let length = vectorLength2D(vector);
    vector[0] /= length;
    vector[1] /= length;
}

export function isToTheRightPointPoint(lineStart, lineEnd, point) {
    // implicite knowledge:
    // a normal to a vector is always directed to the right
    //
    // idea:
    // add the normal vector of the line to any point of the line  -> the resulting point is to the right of the line
    // add the negative normal vector to the same point            -> the resulting point is to the left  of the line
    // now get the distances of these points to the point of interest
    // if that point is closer to the right point than to the left ->   that point itself is to the right of the line

    let vline = [lineEnd[0] - lineStart[0], lineEnd[1] - lineStart[1]];
    let normal = [vline[1], -vline[0]];
    let right = [lineEnd[0] + normal[0], lineEnd[1] + normal[1]];
    let left = [lineEnd[0] - normal[0], lineEnd[1] - normal[1]];
    let vright = [point[0] - right[0], point[1] - right[1]];
    let vleft = [point[0] - left[0], point[1] - left[1]];

    // for comparing lengths of vectors there is no need to actually compute their length
    // comparing their squares of their respective lengths grant the same results
    // while saving some computation time (spare us the sqrt operation)
    let squaredDistanceRight = scalarProduct2D(vright, vright);
    let squaredDistanceLeft  = scalarProduct2D(vleft, vleft);
    let ret = squaredDistanceRight < squaredDistanceLeft;

    return ret;
}

export function isToTheRightPointVector(lineStart, lineVector, point) {
    let lineEnd = [lineStart[0] + lineVector[0], lineStart[1] + lineVector[1]];
    return isToTheRightPointPoint(lineStart, lineEnd, point);
}

export function angleBetweenVectors2D(vector1, vector2) {
//    console.log("[ANGLE BETWEEN VECTORS] v1:(%3.2f, %3.2f) v2:(%3.2f, %3.2f)\n"
//           , vector1[0], vector1[1]
//           , vector2[0], vector2[1]);
    let vectorNormalized1 = [vector1[0], vector1[1]];
    let vectorNormalized2 = [vector2[0], vector2[1]];
    normalize(vectorNormalized1);
    normalize(vectorNormalized2);
//    console.log("[ANGLE BETWEEN VECTORS] u1:(%3.2f, %3.2f) u2:(%3.2f, %3.2f)\n"
//           , vectorNormalized1[0], vectorNormalized1[1]
//           , vectorNormalized2[0], vectorNormalized2[1]);

    let cosAngle = scalarProduct2D(vectorNormalized1, vectorNormalized2);

    let angle = 0.0;
    if (Math.abs(cosAngle - -1.00) < epsilon7) {           // cosAngle == -1 -> rad: PI deg: 180°
        angle = MATH_PI;
    } else if (Math.abs(cosAngle -  1.00) < epsilon7) {    // cosAngle == +1 -> rad: 0 deg: 0°
        angle =  0;
    } else {
        angle = Math.acos(cosAngle);
    }
    //console.log("[ANGLE BETWEEN VECTORS] cosin:%3.2f radiant:%3.2f\n", cosAngle, angle);
    return angle;
}

export function anglePtPtPt2D(p1, p2, p3) {
    let v1 = [p1[0] - p2[0], p1[1] - p2[1]];
    let v2 = [p3[0] - p2[0], p3[1] - p2[1]];
    return angleBetweenVectors2D(v1, v2);
}

function normalizeAngle(angle, useDegree) {
    let min = 0.0;
    let step = useDegree ? 360.0 : MATH_TWO_PI;
    let max = min + step;

    let viciousCircleCounter = 0;

    let ret = angle;
    //console.log("normalize %3.2f \n", ret);
    while (ret < min) {
        ret += step;
        viciousCircleCounter++;
        if (viciousCircleCounter > 1000000) {
            console.log("[ERROR] breaking infinite loop in vector_math->normalizeAngle \n");
            break;
        }
    }
    //console.log("lb match  %3.2f \n", ret);
    while (ret > max) {
        ret -= step;
        viciousCircleCounter++;
        if (viciousCircleCounter > 1000000) {
            console.log("[ERROR] breaking infinite loop in vector_math->normalizeAngle \n");
            break;
        }
    }
    //console.log("ub match  %3.2f \n", ret);

    return ret;
}

export function rotatePointAroundPoint(point, rotationCenter, angle, ret) {
    let x = point[0];
    let y = point[1];
    let x0 = rotationCenter[0];
    let y0 = rotationCenter[1];
    let phi = -angle; // negative value because we rotate clockwise for positive input

    ret[0] = x0 + (x - x0) * Math.cos(phi) - (y - y0) * Math.sin(phi);
    ret[1] = y0 + (x - x0) * Math.sin(phi) + (y - y0) * Math.cos(phi);
//    console.log("rotation of [%3.2f, %3.2f] around [%3.2f, %3.2f] by %3.2f°\n"
//           "         -> [%3.2f, %3.2f]\n",
//           point[0], point[1], rotationCenter[0], rotationCenter[1], TO_DEGREE*angle, ret[0], ret[1]);
}

export function rotateVectorByAngle(vector, angle, ret) {
    let c = [0, 0];
    rotatePointAroundPoint(vector, c, angle, ret);
}

export function translatePointByVector(point, trans, ret) {
    ret[0] = point[0] + trans[0];
    ret[1] = point[1] + trans[1];
}

function solveSquareEquation(a, b, c) {
//    console.log("****************************************************************\n");
//    console.log("solving: 0 = %f*x² + %f*x + %f\n", a,b,c);
    let ret = 0;

    let discr = b*b - 4*a*c;
//    console.log("discr: %f\n", discr);
    if (discr < 0.0) {
        ret = 0;
        return [-1, -1, ret];
    }
    if (discr == 0.0) {
        ret = 1;
    } else {
        ret = 2;
    }

    let answer1 = ( -b + Math.sqrt( discr ) ) / ( 2*a );
    let answer2 = ( -b - Math.sqrt( discr ) ) / ( 2*a );
//    console.log("answers: %d\n", ret);
//    if (ret > 0) { console.log("answer1: %3.2f\n", answer1); }
//    if (ret > 1) { console.log("answer2: %3.2f\n", answer2); }

    return [answer1, answer2, ret];
}

export function getCutPointsOfCircles(c1, r1, c2, r2, ret1, ret2) {
    let answers = -2;

    let c1x = c1[0];
    let c1y = c1[1];
    let c2x = c2[0];
    let c2y = c2[1];

    /// include GeoGebra_output.h for these calls
    //GEOGEBRA_printCircle('A', c1, r1);
    //GEOGEBRA_printCircle('B', c2, r2);

    let dx = c1x - c2x;
    dx = dx < 0 ? -dx : dx;
    let dy = c1y - c2y;
    dy = dy < 0 ? -dy : dy;
    let dr = r1 -  r2;
    dr = dr < 0 ? -dr : dr;

    let eps = 1.0;
    /// if any delta is smaller than this epsilon this delta will be considered zero
    /// i.e. the values that are being compared are treated as equal

    let smallDX = dx < eps;
    let smallDY = dy < eps;
    let smallDR = dr < eps;

//    console.log("small... dx:%d dy:%d dr:%d\n", smallDX, smallDY, smallDR);

    if ( smallDX && smallDY) {
        if (smallDR) {
            /// circles coincide
            answers = -1;
            console.log("circles coincide\n");
        } else {
            /// circles are concentric but with different radius
            answers = 0;
            console.log("circles are concentric\n");
        }
    } else
    if (!smallDY) { // (smallDX || !smallDX) && !smallDY
        // EQ1: circle1: (r1)² = (c1x - x)² + (c1y - y)²
        // EQ2: circle2: (r2)² = (c2x - x)² + (c2y - y)²

        // EQ3: EQ1 - EQ2, get y
        // EQ3: y = (x * k + l) / m = (k / m) * x + (l / m)
        let k = -2 * c1x + 2 * c2x;
        let l = c1x * c1x - c2x * c2x + c1y * c1y - c2y * c2y - r1 * r1 + r2 * r2;
        let m = (-1) * ( -2 * c1y + 2 * c2y );
//        console.log("m: %f\n", m);

        // EQ4: replace y in EQ1 with EQ3
        // transform equation into ax²+bx+c=0 shape
        let p = c1y - (l / m);
        let q = k / m;
        let a = q * q + 1;
        let b = -2 * c1x - 2 * p * q;
        let c = c1x * c1x + p * p - r1 * r1;

        let sol1;
        let sol2;
        [sol1, sol2, answers] = solveSquareEquation(a, b, c);

//        if (answers == 0) {
//            console.log("no solution 1: %3.2lf %3.2lf %3.2lf\n", a, b, c);
//        }

        if (answers > 0) {
            ret1[0] = sol1;
            ret1[1] = (sol1 * k + l) / m;
//                console.log("Py1: (%3.2f, %3.2f)\n", ret1[0], ret1[1]);
        }
        if (answers > 1) {
            ret2[0] = sol2;
            ret2[1] = (sol2 * k + l) / m;
//                console.log("Py2: (%3.2f, %3.2f)\n", ret2[0], ret2[1]);
        }
    } else {        // smallDY && !smallDX
        let k = - 2*c1y + 2*c2y;
        let l = (c1x * c1x - c2x * c2x) + (c1y * c1y - c2y * c2y) + (r2 * r2 - r1 * r1);
        let m = (-1) * ( - 2*c1x + 2*c2x );

        let p = c1x - (l / m);
        let q = k / m;
        let a = q * q + 1;
        let b = -2 * c1y - 2 * p * q;
        let c = c1y * c1y + p * p - r1 * r1;

        let sol1;
        let sol2;
        //console.log("a:%3.2f b:%3.2f c:%3.2f\n", a, b, c);
        [sol1, sol2, answers] = solveSquareEquation(a, b, c);

        if (answers == 0) {
            console.log("no solution 2: %3.2lf %3.2lf %3.2lf\n", a, b, c);
        }
        if (answers > 0) {
            ret1[1] = sol1;
            ret1[0] = (sol1 * k + l) / m;
            //console.log("Px1: (%3.2f, %3.2f)\n", ret1[0], ret1[1]);
        }
        if (answers > 1) {
            ret2[1] = sol2;
            ret2[0] = (sol2 * k + l) / m;
            //console.log("Px2: (%3.2f, %3.2f)\n", ret2[0], ret2[1]);
        }
    }

    return answers;
}

export function getCutPointsOfCircleAndLine(center, radius, anchor, direction, ret1, ret2) {

    /// TODO do the documentation stuff (Kreis vs. Gerade -> Latex)

    let a = direction[0] * direction[0] + direction[1] * direction[1];
    let b = 2 * direction[0] * (anchor[0] - center[0]) + 2 * direction[1] * (anchor[1] - center[1]);
    let c = (anchor[0] - center[0]) * (anchor[0] - center[0]) + (anchor[1] - center[1]) * (anchor[1] - center[1]) - radius * radius;

    let solution1;
    let solution2;
    let answers;
    [solution1, solution2, answers] = solveSquareEquation(a, b, c);

    if (answers > 0) {
        ret1[0] = anchor[0] + solution1 * direction[0];
        ret1[1] = anchor[1] + solution1 * direction[1];
    }
    if (answers > 1) {
        ret2[0] = anchor[0] + solution2 * direction[0];
        ret2[1] = anchor[1] + solution2 * direction[1];
    }

    return answers;
}

export function vector(pStart, pEnd, v) {
    v[0] = pEnd[0] - pStart[0];
    v[1] = pEnd[1] - pStart[1];
//    console.log("[VECTOR] start:(%3.2f, %3.2f) end:(%3.2f, %3.2f) vector:(%3.2f, %3.2f)\n"
//           , pStart[0], pStart[1]
//           , pEnd[0], pEnd[1]
//           , v[0], v[1]);
}

export function normal(v, n) {

    let vNormal = [];
    vNormal[0] = v[1];
    vNormal[1] = -v[0];

    let vNormalUnit = [];
    unit(vNormal, vNormalUnit);

    n[0] = vNormalUnit[0];
    n[1] = vNormalUnit[1];
}

function unit(v, u) {
    let length = vectorLength2D(v);
    u[0] = v[0] / length;
    u[1] = v[1] / length;
}

function min(number1, number2) {
    if (number1 < number2) {
        return number1;
    } else {
        return number2;
    }
}

function sign(number) {
    if (number > 0.0) {
        return  1.0;
    } else if (number < 0.0) {
        return -1.0;
    } else {
        return  0.0;
    }
}

export function circle(A, B, C, center) {
    // char* fnName = "CIRCLE";

    let dy_AB = B[1] - A[1];
    let dy_BC = C[1] - B[1];
    //let dy_CA = A[1] - C[1];
    let p1 = [], p2 = [], p3 = [];
    if (dy_AB == 0.0) {
        p1[0] = A[0];
        p1[1] = A[1];
        p2[0] = C[0];
        p2[1] = C[1];
        p3[0] = B[0];
        p3[1] = B[1];
    } else if (dy_BC == 0.0) {
        p1[0] = C[0];
        p1[1] = C[1];
        p2[0] = A[0];
        p2[1] = A[1];
        p3[0] = B[0];
        p3[1] = B[1];
    } else {
        p1[0] = A[0];
        p1[1] = A[1];
        p2[0] = B[0];
        p2[1] = B[1];
        p3[0] = C[0];
        p3[1] = C[1];
    }
    // note:
    // we have to make sure there is no horizontal line in the calculation
    // as this would cause division by zero at some point (which is forbidden)
    //
    // if A,B,C form a valid circle we are sure there are at least two lines in (AB, BC, CA)
    // that are non-horizontal which we take like above



    // line p1p2: anchor=p1 direction=v12
    // line p2p3: anchor=p2 direction=v23
    let v12 = [], v23 = [];
    vector(p1, p2, v12);
    vector(p2, p3, v23);

    // midpoints
    let m12 = [ p1[0] + 0.5 * v12[0], p1[1] + 0.5 * v12[1] ];
    let m23 = [ p2[0] + 0.5 * v23[0], p2[1] + 0.5 * v23[1] ];

    // normals
    let n12 = [], n23 = [];
    normal(v12, n12);
    normal(v23, n23);

    // perpendicular to p1p2: anchor=m12 direction=n12
    // perpendicular to p2p3: anchor=m23 direction=n23
    let d12 = n12[1] / n12[0];
    let d23 = n23[1] / n23[0];

    // perp12 : y = d12 * (x - m12[0]) + m12[1]
    // perp23 : y = d23 * (x - m23[0]) + m23[1]

    // d12 * (x - m12[0]) + m12[1] = d23 * (x - m23[0]) + m23[1]
    // d12 * x - d12 * m12[0] + m12[1] = d23 * x - d23 * m23[0] + m23[1]
    // x * (d12 - d23) = - d23 * m23[0] + m23[1] + d12 * m12[0] - m12[1]
    // x = (d12 * m12[0] - d23 * m23[0] + m23[1] - m12[1]) / (d12 - d23)
    // insert x into perp12

    let pCut = [];
    pCut[0] = (d12 * m12[0] - d23 * m23[0] + m23[1] - m12[1]) / (d12 - d23);
    pCut[1] = d12 * (pCut[0] - m12[0]) + m12[1];

    let vP1ToPCut = [];
    vector(p1, pCut, vP1ToPCut);

    center[0] = pCut[0];
    center[1] = pCut[1];
    let radius = vectorLength2D(vP1ToPCut);
    return radius;

//    console.log("[%s] P1=(%f, %f)\n", fnName, p1[0], p1[1]);
//    console.log("[%s] P2=(%f, %f)\n", fnName, p2[0], p2[1]);
//    console.log("[%s] P3=(%f, %f)\n", fnName, p3[0], p3[1]);
//    console.log("[%s] line12 : y = %f * (x - %f) + %f\n", fnName, (v12[1] / v12[0]), p1[0], p1[1]);
//    console.log("[%s] line23 : y = %f * (x - %f) + %f\n", fnName, (v23[1] / v23[0]), p2[0], p2[1]);
//    console.log("[%s] perp12 : y = %f * (x - %f) + %f\n", fnName, d12, m12[0], m12[1]);
//    console.log("[%s] perp23 : y = %f * (x - %f) + %f\n", fnName, d23, m23[0], m23[1]);
//    console.log("[%s] P = (%f, %f)\n", fnName, pCut[0], pCut[1]);
//    console.log("[%s] r = %f\n", fnName, *radius);
}
