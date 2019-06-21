cytoscape-arbor
================================================================================

[![DOI](https://zenodo.org/badge/42204006.svg)](https://zenodo.org/badge/latestdoi/42204006)

## Description

The Arbor physics simulation layout for Cytoscape.js

**The `arbor` layout gives relatively slow and poor results compared to other physics simulation layouts.  Consider using [`cose`](http://js.cytoscape.org/#layouts/cose), [`cose-bilkent`](https://github.com/cytoscape/cytoscape.js-cose-bilkent), or [`cola`](https://github.com/cytoscape/cytoscape.js-cola) instead.**

The `arbor` layout uses a [force-directed](http://en.wikipedia.org/wiki/Force-directed_graph_drawing) physics simulation.  For more information about Arbor and its parameters, refer to [its documentation](http://arborjs.org/reference).

Notes about Arbor:

 * For webworkers to work properly, you need to point your browser to a server URL (e.g. `http://`) rather than a local address (e.g. `file://`).
 * Please note that the `liveUpdate` option can potentially be expensive, so if you are concerned about running time (e.g. for large graphs), you should set it to `false`.
 * Arbor does some automatic path finding because it uses web workers, meaning you have to directly include it in a `<script>` in your `<head>`.  Therefore, you can not combine `arbor.js` with your other JavaScript files &mdash; as you probably would as a part of the minification of the scripts in your webapp.
 * You probably want to use the version of `arbor.js` included with Cytoscape.js (or the unpatched, original [`arbor.js`](http://arborjs.org) if you are unaffected by the issues it contains). If using npm, note that Arbor is not downloaded as an npm package automatically and needs special attention when including it as explained in the point above.


## Dependencies

 * Cytoscape.js ^2.4.0 || ^3.0.0
 * Arbor.js >= 0.91
 * jQuery, as required by Arbor


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-arbor`,
 * via bower: `bower install cytoscape-arbor`, or
 * via direct download in the repository (probably from a tag).

`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var cyarbor = require('cytoscape-arbor');
var arbor = require('arbor');

cyarbor( cytoscape, arbor ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-arbor', 'arbor'], function( cytoscape, cyarbor, arbor ){
  cyarbor( cytoscape, arbor ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## API

Call the layout, e.g. `cy.layout({ name: 'arbor', ... })`, with the following options:

```js
var defaults = {
  animate: true, // whether to show the layout as it's running
  maxSimulationTime: 4000, // max length in ms to run the layout
  fit: true, // on every layout reposition of nodes, fit the viewport
  padding: 30, // padding around the simulation
  boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
  ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
  randomize: false, // uses random initial node positions on true

  // callbacks on layout events
  ready: undefined, // callback on layoutready
  stop: undefined, // callback on layoutstop

  // forces used by arbor (use arbor default on undefined)
  repulsion: undefined,
  stiffness: undefined,
  friction: undefined,
  gravity: true,
  fps: undefined,
  precision: undefined,

  // static numbers or functions that dynamically return what these
  // values should be for each element
  // e.g. nodeMass: function(n){ return n.data('weight') }
  nodeMass: undefined,
  edgeLength: undefined,

  stepSize: 0.1, // smoothing of arbor bounding box

  // function that returns true if the system is stable to indicate
  // that the layout can be stopped
  stableEnergy: function( energy ){
    var e = energy;
    return (e.max <= 0.5) || (e.mean <= 0.3);
  },

  // infinite layout options
  infinite: false // overrides all other options for a forces-all-the-time mode
};
```


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-arbor https://github.com/cytoscape/cytoscape.js-arbor.git`
1. Make a release on GitHub to automatically register a new Zenodo DOI
