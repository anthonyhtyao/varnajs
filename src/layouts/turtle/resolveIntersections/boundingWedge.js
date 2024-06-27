import * as vmath from "../vector_math";
import * as ctree from "../data/configtree";
import { getBulgeCoordinatesExtraDistance } from "../data/boundingBoxes";


const epsilonFix = 19;

function getBoundingWedgeRec(root, node, parentAngle, minAngle, maxAngle) {

    /// --- Documentation ---
    ///
    /// How to ... get the bounding wedge of root's i-th child tree?
    ///
    /// get interesting points of current node
    ///     (2) touch points of tangents from root.center to node's loop circle
    ///     (n) bulge points of node's stem
    ///     (2) corners of node's stem that coincide with root's loop [only for direct child]
    ///
    /// update min-angle...
    ///     for each interesting point
    ///         check if the point is on the left side of the min-angle axis
    ///         if so
    ///             min-angle -= diff-angle of min-axis and point-axis
    /// update max-angle...
    ///     for each interesting point
    ///         check if the point is on the right side of the min-angle axis
    ///         if so
    ///             max-angle += diff-angle of max-axis and point-axis

    const distance = epsilonFix;
    let parent = ctree.getParent(node);

    let centerRoot = [];
    ctree.getLoopCenter(root, centerRoot);
    let centerNode = [];
    ctree.getLoopCenter(node, centerNode);
    let vRootNode = [];
    vmath.vector(centerRoot, centerNode, vRootNode);

    /// set appropriate nodeAngle
    /// this could have been done using ctree.getChildAngle function
    /// but in terms of performance we can get this for free O(1)
    /// costs of ctree.getChildAngle: O( maxDegreeOnPath * ( depth(node) - depth(root) ) ) per call
    let nodeAngle;
    if (parent == root) {
        /// this happens only for the initial call and not for the recursive calls
        /// initialize min/max with the direct child's angle
        nodeAngle = ctree.getChildAngle(root, node);
        minAngle = nodeAngle;
        maxAngle = nodeAngle;
    } else {
        /// compare ctree.getChildAngle function
        let centerParent = [];
        ctree.getLoopCenter(parent, centerParent);
        let vRootParent = [];
        vmath.vector(centerRoot, centerParent, vRootParent);
        let diffParent = vmath.angleBetweenVectors2D(vRootParent, vRootNode);
        if (!vmath.isToTheRightPointVector(centerRoot, vRootParent, centerNode)) {
            diffParent *= -1;
        }
        nodeAngle = parentAngle + diffParent;
    }

    /// get all bounding boxes
    let loopNode = node.lBox;
    let stemNode = node.sBox;

    /// allocate space for points of interest
    let numPoints = stemNode.bulgeCount;
    if (parent == root) { numPoints += 2; } // for bottom corners of direct child's stem
    let points = new Array(numPoints);
    let pointIndex = 0;

    /// points of interest (part 1)
    /// bulge points
    for (let i = 0; i < stemNode.bulgeCount; i++) {
        let o = [], q = []; // o, q are unused but necessary for function call
        let bulgePoint = [];
        getBulgeCoordinatesExtraDistance(stemNode, i, distance, o, bulgePoint, q);

        points[pointIndex] = bulgePoint;
        pointIndex++;
    }

    /// points of interest (part 2, only for direct child of root)
    /// for the direct child of this computation's root
    /// the corners of that child that coincide with root's loop (. stem bottom corners)
    /// have a huge effect on the size of the bounding wedge
    /// for all further descendants these points do not matter because
    /// of the greater impact of the loops
    if (parent == root) {
        let pStemBottomCornerL = [];
        pStemBottomCornerL[0] = stemNode.c[0] - stemNode.e[0] * stemNode.a[0] + stemNode.e[1] * stemNode.b[0];
        pStemBottomCornerL[1] = stemNode.c[1] - stemNode.e[0] * stemNode.a[1] + stemNode.e[1] * stemNode.b[1];
        points[pointIndex] = pStemBottomCornerL;
        pointIndex++;

        let pStemBottomCornerR = [];
        pStemBottomCornerR[0] = stemNode.c[0] - stemNode.e[0] * stemNode.a[0] - stemNode.e[1] * stemNode.b[0];
        pStemBottomCornerR[1] = stemNode.c[1] - stemNode.e[0] * stemNode.a[1] - stemNode.e[1] * stemNode.b[1];
        points[pointIndex] = pStemBottomCornerR;
        pointIndex++;
    }

    /// we compute the two tangents from root's center to node's circle periphery
    /// using these for our min/max calculation ensures that the whole loop
    /// is contained in the wedge
    ///
    /// we can directly compute the diffAngle for the touching points of the tangents
    /// by using pythagoras' sentence
    let radiusNode = loopNode.r + distance;
    let distanceRootNode = vmath.vectorLength2D(vRootNode);
    /// positive angle and negative angle share their size
    let angle1 = Math.asin(radiusNode / distanceRootNode);
    /// no need for let computation, just flip sign
    let angle2 = (-1) * angle1;

    // store both angles in an array to afunction code duplication
    let angles = [ angle1, angle2 ];
    /// update min / max for the tangents touching points (angles)
    for (let currentAngle = 0; currentAngle < 2; currentAngle++) {
        let diffAngle = angles[currentAngle];
        let pointAngle = nodeAngle + diffAngle;

        /// actual updating for min and max
        if (pointAngle < minAngle) {
            minAngle = pointAngle;
        }
        if (pointAngle > maxAngle) {
            maxAngle = pointAngle;
        }
    }

    /// update min / max for bulge points (and stem bottom points in first level of recursion)
    for (let currentPoint = 0; currentPoint < numPoints; currentPoint++) {
        let point = points[currentPoint];

        /// vector from root.loop.center to point
        let vCenterPoint = [];
        vmath.vector(centerRoot, point, vCenterPoint);

        /// (positive) offset angle between node.loop.center and point
        let diffAngle = vmath.angleBetweenVectors2D(vRootNode, vCenterPoint);
        let sign;
        if (vmath.isToTheRightPointVector(centerRoot, vRootNode, point)) {
            sign =  1;
        } else {
            sign = -1;
        }
        /// now the offset angle has some direction information
        diffAngle *= sign;

        /// the current point's angle has to be set with regard to the node's angle
        let pointAngle = nodeAngle + diffAngle;

        /// actual updating for min and max
        if (pointAngle < minAngle) {
            minAngle = pointAngle;
        }
        if (pointAngle > maxAngle) {
            maxAngle = pointAngle;
        }
    }

    /// free allocated space
    // for (let currentPoint = 0; currentPoint < numPoints; currentPoint++) {
    //     double* point = points[currentPoint];
    //     free(point);
    // }

    /// recursive call
    for (let currentChild = 0; currentChild < node.childCount; currentChild++) {
        let child = ctree.getChild(node, currentChild);
        getBoundingWedgeRec(root, child, nodeAngle, minAngle, maxAngle);
    }

    return [minAngle, maxAngle];
}

export function getBoundingWedge(root, childIndex, minAngle, maxAngle) {
    let child = ctree.getChild(root, childIndex);

    /// not needed, done inside getBoundingWedgeRec at first recursion level
    /// we keep this stuff here for maintainance reasons
    //let childAngle;
    //getChildAngle(root, child, &childAngle);
    //*minAngle = *maxAngle = childAngle;

    return getBoundingWedgeRec(root, child, 0, minAngle, maxAngle);
}

