  /*
  * Visualization source
  Random ID C ator - https://stackoverflow.com/questions/6860853/generate-random-string-for-div-id
  Unique List - https://medium.com/front-end-weekly/getting-unique-values-in-javascript-arrays-17063080f836
  */
  define([
      'jquery',
      'underscore',
      'api/SplunkVisualizationBase',
      'api/SplunkVisualizationUtils',
      'cytoscape',
      'cytoscape-cola',
      'cytoscape-cxtmenu',
      'cytoscape-cose-bilkent',
      'd3'
      // Add required assets to this list
    ],
    function (
      $,
      _,
      SplunkVisualizationBase,
      SplunkVisualizationUtils,
      cytoscape,
      cxtmenu,
      cola,
      coseBilkent,
      d3,
      vizUtils
    ) {
      // Register Bilkent
      coseBilkent(cytoscape);
      // Register Cola
      cola(cytoscape);
      // Extend from SplunkVisualizationBase

      // Load menu extension
      cxtmenu(cytoscape);

      return SplunkVisualizationBase.extend({

        initialize: function () {
          SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
          this.$el = $(this.el);

          // Add a css selector class
          this.$el.addClass('splunk-cytoforce');

          // Initialization logic goes here

        },

        // Optionally implement to format data returned from search.
        // The returned object will be passed to updateView as 'data'
        formatData: function (data) {

          // Format data
          return data;
        },

        // Implement updateView to render a visualization.
        // 'data' will be the data object returned from formatData or from the search
        // 'config' will be the configuration property object
        updateView: function (data, config) {


          // Guard for empty data
          if (data.rows.length < 1) {
            return;
          }
          // Take the first data point
          datum = data.rows;

          // Get color config or use a default yellow shade
          var themeColor = config[this.getPropertyNamespaceInfo().propertyNamespace + 'theme'] || 'light';

          // Get layout style
          var layoutStyle = config[this.getPropertyNamespaceInfo().propertyNamespace + 'layoutStyle'] || 'circle';

          // Clear the div
          this.$el.empty();

          // Specify a width and height that matches the Splunk console
          var width = this.$el.width()
          var height = this.$el.height()

          // Create nodes dictionary for ID creation purposes.
          var nodesByName = {};

          // Create an array that is used to highlight neighbouring links
          var linkedByIndex = {};

          // Create an empty group array to allow group assignment
          var group_list = [];

          // Create an empty dictionary for placing the results of the headers in
          var headers = {};

          // Create empty array to place all of the links in
          var linksArray = [];

          // Create empty array to place all of the nodes in
          var nodesArray = [];

          // Create a variable of x that is 0 to enable iteration
          var x = 0;

          // Create empty array for storing header rows / fields
          columns = [];

          // Create pattern for matching header rows / fields to match nodeXX
          var pattern = /node\d{2}$/i;

          // String Icon Dictionary
          var stringIcon = {};

          // String Icon Dictionary
          var regexIcon = {};

          // Path Finding Algo
          var start;
          var end;

          // Animation Options
          var layoutPadding = 50;
          var aniDur = 500;
          var easing = 'linear';

          // Append an SVG Element
          var svg = d3.select(this.el)
            .append("div")
            .attr('width', width)
            .attr('height', height)
            .attr('id', 'cy');

          // Add Cytoscape Element
          var cy = cytoscape({
            container: document.getElementById('cy'),
            style: [{
              selector: 'node',
              style: {
                label: 'data(label)'
              }
            }]
          });

          // Create a group for the box highlight
          let boxedNodes = cy.collection();

          // For each element in box highlight
          let handleElements = debounce(function () {
            boxedNodes = cy.collection();
          });

          d3.csv("/static/app/link_analysis_app/icons.csv", function (csvData) {
            // Empty Number for Regex
            x = 0;
            csvData.forEach(function (d) {

              if (d.searchType == "string") {
                // If the pattern is a string search
                stringIcon[d.fieldValue] = d.icon;

              } else if (d.searchType == "regex") {
                // If the pattern is a regex pattern
                regexIcon[x] = {
                  "fieldValue": d.fieldValue,
                  "icon": d.icon
                }
                x++;
              }
            });

            // For each field in the output if the regex matches the pattern variable push it to the columns array
            data.fields.forEach(function (column) {
              var str = String(column.name);
              if (str.match(pattern)) {
                columns.push(x);
              }
              x++;
            });

            datum.forEach(function (link) {
              // Create a list of nodes and add to array
              nodesArray.push(link[0]);
              nodesArray.push(link[1]);
            });

            // Create a unique list of nodes
            const unique = (value, index, self) => {
              return self.indexOf(value) === index;
            }
            nodesUnique = nodesArray.filter(unique);

            // Create an incrementer variable for node id
            var n = 0;
            // Foreach unique node add to the node list
            nodesUnique.forEach(function (node) {
              node_id = "n" + n;
              nodesByName[node] = node_id;
              nodeIcon = searchIcon(node);

              cy.add({
                data: {
                  id: node_id,
                  background: nodeIcon,
                  weight: 1,
                  label: node
                }
              });
              n++;
            });

            datum.forEach(function (link) {
              group_id = 0;
              // Create a link object to push the target and source to the linksArray array.
              /*
                  object = {};
                  object.id = group_id
                  object.source = nodeByName(link[0]);
                  object.target = nodeByName(link[1]);
                  */
              // Add nodes to list

              source_out = nodesByName[link[0]]
              target_out = nodesByName[link[1]]

              // Add Group
              cy.add({
                data: {
                  source: source_out,
                  target: target_out,
                  label: String(link[2])
                }
              });

              group_id++

            });

            // Cytoscape Styling     
            cy.style()
              .selector('edge')
              .style({
                'width': 3,
                'edge-text-rotation': 'autorotate',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'control-point-distance': '30px',
                'control-point-step-size': 40,
                'control-point-weight': '0.5', // '0': curve towards source node, '1': towards target node.
                'avoidOverlap': true,
                'padding': 300,
                'label': 'data(label)'
              }).update();

            // Highlighted Class
            cy.style()
              .selector('.highlighted')
              .style({
                'background-color': '#61bffc',
                'line-color': '#cc0000',
                'target-arrow-color': '#cc0000',
                'transition-property': 'background-color, line-color, target-arrow-color',
                'transition-duration': '0.5s'
              }).update();

            cy.style()
              .selector('node')
              .style({
                'background-image': 'data(background)',
                'background-fit': 'contain'
              }).update();

            // Cytoscape Layout
            cy.layout({
              name: layoutStyle,
              padding: 30,
              fit: true,
              nodeDimensionsIncludeLabels: true,
              animationDuration: aniDur,
              // Node repulsion (non overlapping) multiplier
              animationEasing: easing
            }).run();


            // End CSV Load
          });

          // After The layout has been updated.  Perform additional tasks.

          // Begin - Add Menu for nodes and background
          cy.cxtmenu({
            selector: 'node, edge',
            commands: [{
                content: 'Placeholder',
                select: function (ele) {},
                enabled: false
              },
              {
                content: 'Placeholder',
                select: function (ele) {},
                enabled: false

              },
              {
                content: "Path Select",
                select: function (ele) {
                  if (start) {
                    end = ele.id();
                    highlightNextEle(start, end);
                  } else {
                    start = ele.id();
                    cy.getElementById(start).addClass('highlighted')
                  };
                }
              }
            ]
          });


          cy.cxtmenu({
            selector: 'core',
            commands: [{
                content: 'Clear Paths',
                select: function (ele) {
                  start = undefined;
                  end = undefined;
                  cy.elements().removeClass('highlighted');
                },
              },
              {
                content: 'Delete Items',
                select: function (ele) {
                  cy.remove(boxedNodes);
                },
              }
            ]
          });

          // End - Add Menu for nodes and background

          // When you highlight a group of nodes add a highlighted class
          cy.on('box', function (e) {
            let node = e.target;
            boxedNodes = boxedNodes.union(node);
            boxedNodes.addClass('highlighted');
          });

          // Begin - Path Highlighting Function

          var highlightNextEle = function (start_id, end_id) {
            // Highlight Elements
            startid_hash = "#" + start_id
            endid_hash = "#" + end_id
            var dijkstra = cy.elements().dijkstra(startid_hash, function (eles) {
              return 1
            }, false);
            debugger;
            var bfs = dijkstra.pathTo(endid_hash);

            for (var x = 0; x < bfs.length; x++) {
              var el = bfs[x];
              el.addClass('highlighted');
            }

            start = undefined;
            end = undefined;

          }

          // End - Path Highlighting Function

          // Debounce Function for improved performance
          function debounce(func, wait, immediate) {
            var timeout;
            return function () {
              var context = this,
                args = arguments;
              var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
              };
              var callNow = immediate && !timeout;
              clearTimeout(timeout);
              timeout = setTimeout(later, wait);
              if (callNow) func.apply(context, args);
            };
          };

          // Search Icon Function
          function searchIcon(searchFieldValue) {
            // If there is a direct match for the field value
            if (stringIcon[searchFieldValue]) {
              return stringIcon[searchFieldValue]
            }
            // Iterate through regexes to try and match the string
            else if (regexIcon) {
              // For each regex in list
              for (i = 0; i < Object.keys(regexIcon).length + 1; i++) {
                // Check if regex is valid if not throw message

                if (regexIcon[i]) {
                  try {
                    var re = RegExp(regexIcon[i].fieldValue);
                  } catch (e) {
                    throw new SplunkVisualizationBase.VisualizationError(
                      'Invalid Regex of ' + escapeHtml(regexIcon[i].fieldValue))
                  }

                  // Check if the regex matches
                  if (re.test(searchFieldValue)) {
                    // If so return the icon
                    return regexIcon[i].icon
                  }
                } else {
                  return "/static/app/link_analysis_app/default.png"
                }
              }
            } else {
              // No matches so return a default image.
              return "/static/app/link_analysis_app/default.png"
            }
          }
        },

        // Search data params
        getInitialDataParams: function () {
          return ({
            outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
            count: 1000
          });
        },

        // Override to respond to re-sizing events
        reflow: function () {}
      });
    });
