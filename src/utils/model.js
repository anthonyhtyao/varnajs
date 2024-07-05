export class BoundingBox {
	xMin;
	xMax;
	yMin;
	yMax;

	constructor(xMin, xMax, yMin, yMax) {
		this.xMin = xMin;
		this.xMax = xMax;
		this.yMin = yMin;
		this.yMax = yMax;
	}

	updateFromCoords(coords, radius=0) {
		this.xMin = Math.min(this.xMin, coords.x - radius);
		this.xMax = Math.max(this.xMax, coords.x + radius);
		this.yMin = Math.min(this.yMin, coords.y - radius);
		this.yMax = Math.max(this.yMax, coords.y + radius);
	}
} 
