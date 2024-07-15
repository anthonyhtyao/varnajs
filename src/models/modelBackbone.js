import { ModelDefault } from "./modelDefault";

export class ModelBackbone extends ModelDefault {
	name = "backbone";
	color = null;
	thickness = null;
	style = null;

	constructor(opt={}) {
		super();
		Object.assign(this, opt);
	}
}

export class DefaultBackbone extends ModelBackbone {
}

export class DiscontinuousBackbone extends ModelBackbone {
}

export class MissingBackbone extends ModelBackbone {
}
