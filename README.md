# VARNAjs

This project aims to provide a javascript library to visualize RNA secondary structure on webpage based on [Cytoscape.js](https://js.cytoscape.org/) while including different layout provided by [VARNA](https://varna.lisn.upsaclay.fr/index.php?lang=en&page=manual&css=varna), [RNAplot](https://www.tbi.univie.ac.at/RNA/ViennaRNA/refman/man/RNAplot.html), [RNApuzzler](https://github.com/dwiegreffe/RNApuzzler) etc.

# Disclaimer

Releases v0.x are incomplete that are served as collecting feedback while implementing more features.The official releases v1.x will probably not have backward compatibility. Any bug found and suggestion are welcome.

# Usage

Currently, varnajs has only been tested as normal html package (could be found in `dist/`) that can be imported via
```html
<script src="varna.umd.js"></script>
```
or the minimal version
```html
<script src="varna.min.js"></script>
```
The installation via npm locally should also be doable in principle.

The easiest way to draw a secondary structure is using `drawRNA()` with given HTML element to draw, structure in dot-bracket notation (dbn), sequence, and configuration. The function returns a `Structure` object with a property `cy` which links to `cytoscape` drawing object. Several usage examples can be found in `examples/`.
