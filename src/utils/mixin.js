// from https://rasaturyan.medium.com/multiple-inheritance-in-javascript-es6-4999e4b6584c
//

export class BaseClass { };

class MixinBuilder {
	constructor(superclass) {
	  this.superclass = superclass;
	}
	
	with(...mixins) {
	  return mixins.reduce((c, mixin) => mixin(c), this.superclass);
	}
}

export const mix = (superclass) => new MixinBuilder(superclass);
