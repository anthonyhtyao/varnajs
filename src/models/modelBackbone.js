

export class ModelBackbone {
	type = "custom";
	color = null;
	thickness = null;
	style = null;

	constructor(opt={}) {
		Object.assign(this, opt);
	}

	getType() {
		return this.type;
	}
}

export const DefaultBackbone = Object.freeze(new ModelBackbone({type: "default"}));
export const DiscontinuousBackbone = Object.freeze(new ModelBackbone({type: "discontinuous"}));
export const MissingBackbone = Object.freeze(new ModelBackbone({type: "missing"}));
