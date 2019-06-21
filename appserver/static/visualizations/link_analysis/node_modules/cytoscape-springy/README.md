cytoscape-springy
================================================================================
[![DOI](https://zenodo.org/badge/42205556.svg)](https://zenodo.org/badge/latestdoi/42205556)

## Description

The Springy physics simulation layout for Cytoscape.js

**The `springy` layout gives relatively slow and poor results compared to other physics simulation layouts.  Consider using [`cose`](http://js.cytoscape.org/#layouts/cose), [`cose-bilkent`](https://github.com/cytoscape/cytoscape.js-cose-bilkent), or [`cola`](https://github.com/cytoscape/cytoscape.js-cola) instead.**

The `springy` layout uses a [force-directed](http://en.wikipedia.org/wiki/Force-directed_graph_drawing) physics simulation, written by [Dennis Hotson](http://dhotson.tumblr.com/).  For more information about Springy and its parameters, refer to [its documentation](http://getspringy.com).


## Dependencies

 * Cytoscape.js ^2.4.0 || ^3.0.0
 * Springy.js ^2.5.0


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-springy`,
 * via bower: `bower install cytoscape-springy`, or
 * via direct download in the repository (probably from a tag).

`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var cyspringy = require('cytoscape-springy');

cyspringy( cytoscape ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-springy', 'springy'], function( cytoscape, cyspringy, Springy ){
  cyspringy( cytoscape, Springy ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## API

Call the layout, e.g. `cy.layout({ name: 'springy', ... })`, with options:

```js
var defaults = {
  animate: true, // whether to show the layout as it's running
  maxSimulationTime: 4000, // max length in ms to run the layout
  ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
  fit: true, // whether to fit the viewport to the graph
  padding: 30, // padding on fit
  boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
  randomize: false, // whether to use random initial positions
  infinite: false, // overrides all other options for a forces-all-the-time mode
  ready: undefined, // callback on layoutready
  stop: undefined, // callback on layoutstop

  // springy forces and config
  stiffness: 400,
  repulsion: 400,
  damping: 0.5,
  edgeLength: function( edge ){
    var length = edge.data('length');

    if( length !== undefined && !isNaN(length) ){
      return length;
    }
  }
};
```


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-springy https://github.com/cytoscape/cytoscape.js-springy.git`
1. Make a release on GitHub to automatically register a new Zenodo DOI
