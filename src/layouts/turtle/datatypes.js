export function AABB() {
    this.min = new Array(2);
    this.max = new Array(2);
}

export function boundingboxLoop() {
    this.parent = null;
    // circle definition
    this.c = new Array(2); // center
    this.r;    // radius
}

export function boundingboxStem() {
    this.parent = null;

    // rectangle definition
    this.a = new Array(2); // direction 1 (unit vector) // direction from stem center to loop center
    this.b = new Array(2); // direction 2 (unit vector) // points to the left of vector a
    this.c = new Array(2); // center
    this.e = new Array(2); // half width extension of a and b

    // additional information on RNA
    this.bulgeCount = null;
    this.bulgeDist = null;
    this.bulges = [];
} 

export function configtree() {
    /// - node name
    let id = null;

    /// tree information
    let parent = null;
    let children = [];
    let childCount = 0;
    /// RNA data
    let cfg = null;
    let loop_start = null;
    let stem_start = null;
    /// for intersection handling
    let lBox = null// bounding box for this loop         first base at loop_start
    let sBox = null// bounding box for the prior stem    first base at stem_start
    /// AABB
    this.aabb = new AABB();
}
