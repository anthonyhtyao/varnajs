export function toFactor(coords1, coords2) {
	return {x: coords2.x - coords1.x, y: coords2.y - coords1.y};
}
