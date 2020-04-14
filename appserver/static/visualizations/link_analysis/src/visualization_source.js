  /*
  * Visualization source

  SANKEY Diagram - Used filtering functions
  Unique List - https://medium.com/front-end-weekly/getting-unique-values-in-javascript-arrays-17063080f836
  SA-devforall - Modal Ideas
  Random Hash Creator - https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript

  */
  define([
      'jquery',
      'underscore',
      'api/SplunkVisualizationBase',
      'api/SplunkVisualizationUtils',
      'cytoscape',
      'cytoscape-cxtmenu',
      'cytoscape-fcose',
      'cytoscape-popper',
      'cytoscape-dagre',
      'cytoscape-klay',
      'd3',
      'Modal.js',
      'cytoscape-cose-bilkent',
      'cytoscape-dblclick',
      'splunkjs/mvc/searchmanager',
      'splunkjs/mvc',

      //      'splunkjs/mvc/simplexml/ready!'
      // Euler cannot work with anything above 300 Nodes
      // Add required assets to this list
    ],
    function (
      $,
      _,
      SplunkVisualizationBase,
      SplunkVisualizationUtils,
      cytoscape,
      cxtmenu,
      fcose,
      popper,
      dagre,
      klay,
      d3,
      Modal,
      coseBilkent,
      dblclick,
      SearchManager,
      mvc
    ) {

      // Load menu extension
      cxtmenu(cytoscape);
      // Load FCose Layout Extension
      fcose(cytoscape);
      // Load Dagre Layout Extension
      dagre(cytoscape);
      // Load Popper Extension
      popper(cytoscape);
      // Load Dagre Layout Extension
      klay(cytoscape);
      // Load Cose Bilkent Layout Extension
      coseBilkent(cytoscape); // register extension
      dblclick(cytoscape);

      /*
      Initiate Global Variables for use throughout code
      */

      // Prefilter variable for use to prefilter the graph
      var preFilter;
      // Variable to specify whether direction in path finding is honored
      var directedGlobal;
      // What path finding algorithm is used
      var pathAlgoGlobal;
      // If items are to be preRemoved before rendering
      var preRemove;
      // Variable to define whether the graph is being loaded for the first time or note
      var initialRun;
      // A collection of elements that are being removed
      var element_preRemove;
      // A variable to store highlighted nodes
      var boxedNodes;
      // Background color
      var bgColor;
      // Text color
      var textColor;
      // Not in use - A number to use when removing nodes by children / parent count
      var removeNodesByCount;
      // Whether to recursively add nodes in the graph
      var recursiveLookup;
      // The existing layout prior to initiating the focus function
      var graphStateForFocus;
      // A variable to tell the graph that it is zoomed in and to not honor mouse over actions on edges
      var isZoomedIn;
      // The incrementer for a dynamic class that is used in edge styling
      var edgeSearchColorNum = 0;
      // Set a global Token to allow for persistence in token selection
      var tokenCheckedGlobal;
      var tokenValueGlobal;

      return SplunkVisualizationBase.extend({

        initialize: function () {
          SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
          this.$el = $(this.el);
          // If the theme is dark mode set the correct background color and text color.
          if (SplunkVisualizationUtils.getCurrentTheme && SplunkVisualizationUtils.getCurrentTheme() === 'dark') {
            bgColor = "#212527";
            textColor = "#ffffff";
          }

        },
        // Escape properties that are passed as configuration items
        _getEscapedProperty: function (name, config) {
          var propertyValue = config[this.getPropertyNamespaceInfo().propertyNamespace + name];
          return SplunkVisualizationUtils.escapeHtml(propertyValue);
        },
        // Get the configuration parameters
        _getConfigParams: function (config) {
          changedConfig = Object.keys(config)[0];
          // If there is only one configuration change (This happens after the first click of formatter menu)
          if (Object.keys(config).length == 1) {
            switch (changedConfig) {
              case "display.visualizations.custom.link_analysis_app.link_analysis.layoutStyle":
                this.layoutStyle = this._getEscapedProperty('layoutStyle', config);
                break;

              case "display.visualizations.custom.link_analysis_app.link_analysis.pathAlgo":
                this.pathAlgo = this._getEscapedProperty('pathAlgo', config);
                break;

              case "display.visualizations.custom.link_analysis_app.link_analysis.directed":
                this.directed = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('directed', config));
                break;

              default:
                // Set default options for the console if this is a fresh load or something else happened.
                this.layoutStyle = this._getEscapedProperty('layoutStyle', config) || 'fcose';
                this.directed = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('directed', config), {
                  default: false
                });
                this.pathAlgo = this._getEscapedProperty('pathAlgo', config) || 'dijkstra';
                this.recursiveLookup = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('recursiveLookup', config), {
                  default: false
                });
                recursiveLookup = this.recursiveLookup;


                break;
            }
            return;
          } else {
            // Set default options for the console if this is a fresh load or something else happened.
            this.layoutStyle = this._getEscapedProperty('layoutStyle', config) || 'fcose';
            this.directed = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('directed', config), {
              default: false
            });
            this.pathAlgo = this._getEscapedProperty('pathAlgo', config) || 'dijkstra';
            this.recursiveLookup = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('recursiveLookup', config), {
              default: false
            });
            recursiveLookup = this.recursiveLookup;


            return;
          }


        },

        onConfigChange: function (configChanges, previousConfig) {
          // Get Configuration Data
          // if the previous config is the same as the configured menu item.  Do Nothing.  Handling first time opening the format menu
          if (Object.keys(previousConfig).length == 1 && previousConfig["display.visualizations.custom.drilldown"] == "all" && Object.keys(configChanges).length > 1) {
            //this._getConfigParams(configChanges);
            return;
          }

          // If Config has been updated then re-run invalidateUpdateView()
          else {
            changedConfig = Object.keys(configChanges)[0];
            switch (changedConfig) {
              case "display.visualizations.custom.link_analysis_app.link_analysis.layoutStyle":
                this.invalidateUpdateView();
                break;

              case "display.visualizations.custom.link_analysis_app.link_analysis.pathAlgo":
                pathAlgoGlobal = configChanges["display.visualizations.custom.link_analysis_app.link_analysis.pathAlgo"];
                this._getConfigParams(configChanges);
                break;


              case "display.visualizations.custom.link_analysis_app.link_analysis.directed":

                directedGlobal = SplunkVisualizationUtils.normalizeBoolean(configChanges["display.visualizations.custom.link_analysis_app.link_analysis.directed"]);
                this._getConfigParams(configChanges);
                break;

              default:
                this.invalidateUpdateView();
                break;
            }
            return;
          }
        },

        // Optionally implement to format data returned from search.
        // The returned object will be passed to updateView as 'data'
        formatData: function (data, config) {
          // A dictionary for formatting
          format_info = {};
          // Create an empty group array to allow group assignment
          group_list = [];
          // Take the first data point
          datum = data.rows;
          // Create empty array to place all of the nodes in
          var nodesArray = [];
          // Create empty array to place all edges / links in
          var linksArray = [];
          // Get updated configuration parameters
          this._getConfigParams(config);

          // Create nodes dictionary for ID creation purposes.
          var nodesByName = {};
          // Update group items
          // For each field in the output if the regex matches the pattern variable push it to the columns array

          // Set x to 0 so the line numbers match up.
          formatIterNum = 0;
          data.fields.forEach(function (column) {
            var str = String(column.name);

            switch (str) {
              case "line_label":
                format_info['line_label'] = formatIterNum;
                break;

              case "line_color":
                format_info['line_color'] = formatIterNum;
                break;

              case "line_colour":
                format_info['line_color'] = formatIterNum;
                break;

              case "filter_start":
                format_info['filter_start'] = formatIterNum;
                preFilter = data.rows[0][formatIterNum].toString();
                break;
              case "filter_end":
                format_info['filter_end'] = formatIterNum;
                break;
              case "src_color":
                format_info['src_color'] = formatIterNum;
                break;
              case "dest_color":
                format_info['dest_color'] = formatIterNum;
                break;
              case "src_shape":
                format_info['src_shape'] = formatIterNum;
                break;
              case "dest_shape":
                format_info['dest_shape'] = formatIterNum;
                break;
              case "remove":
                format_info['remove'] = formatIterNum;
                preRemove = data.rows[0][formatIterNum].toString();
                break;
              default:
                break;
            }

            formatIterNum++;
          });

          //For each row in the data push the value of the first and second column into the group_list array.
          // Create an incrementer variable for node id
          var n = 0;
          datum.forEach(function (link) {
            // Create a list of nodes and add to array
            nodesArray.push(link[0]);
            nodesArray.push(link[1]);
            // Add each node to an array so that we can later use it to create dynamic groups for colouring
            this.group_list.push({
              name: link[0]
            });
            this.group_list.push({
              name: link[1]
            });
            group_id = 0;
            // Create a link object to push the target and source to the linksArray array.
            object = {};
            object.target = nodeByName(link[0], group_id);
            object.source = nodeByName(link[1], group_id);
            object.count = link[2];
            // Push the nodes to the nodesByName array including a group id of 0.
            // Push the object dictionary item from lines above to the linksArray array
            linksArray.push(object);

            // Check if there is a field of src_color or dest_color and then assign it to the color of the field.  
            if (link[format_info['src_color']]) {
              nodesByName[link[0]].color ? "true" : nodesByName[link[0]].color = link[format_info['src_color']]
            }
            if (link[format_info['dest_color']]) {
              nodesByName[link[1]].color ? "true" : nodesByName[link[1]].color = link[format_info['dest_color']]
            }

            // Check if there is a field of src_shape or dest_shape and then assign it to the shape of the field.  
            if (link[format_info['src_shape']]) {
              nodesByName[link[0]].shape ? "true" : nodesByName[link[0]].shape = link[format_info['src_shape']]
            }
            if (link[format_info['dest_shape']]) {
              nodesByName[link[1]].shape ? "true" : nodesByName[link[1]].shape = link[format_info['dest_shape']]
            }

          });
          // For performance reasons if there is more than 1000 edges don't apply dynamic colours.
          if (datum.length < 1000) {
            // Perform a group by count by each source address
            this.groupCount = d3.nest()
              .key(function (d) {
                return d.name;
              })
              .rollup(function (v) {

                return v.length;
              })
              .entries(group_list)
              .sort(function (a, b) {
                return d3.descending(a.value, b.value);
              });

          }
          this.format_info = format_info;
          this.group_list = group_list;
          this.nodesArray = nodesArray;
          this.nodesByName = nodesByName;
          this.linksArray = linksArray;

          // Function to check if a node is in the list and push the name and the group
          function nodeByName(name, groupId) {
            return nodesByName[name] || (nodesByName[name] = {
              name: name,
              group: groupId
            });
          }
          return data;
          // End Format Data Function

        },

        // Implement updateView to render a visualization.
        // 'data' will be the data object returned from formatData or from the search
        // 'config' will be the configuration property object
        updateView: function (data, config) {

          // Guard for empty data
          if (data.rows.length < 1) {
            return false;
          }

          if (data.fields.length < 2) {
            throw new SplunkVisualizationBase.VisualizationError(
              'Need at least two columns formatted <src> <dest>'
            );
          }
          if (data.meta.done === false) {
            var searchRunningMessage = 'Search is still running';
            this.el.innerHTML = 'Status: ' + searchRunningMessage;
          }

          if (data.meta.done) {
            this.el.innerHTML = "";

            // Throw warning if there is more than 10,000 rows
            if (data.rows.length > 10000) {
              var tooManyRowsMessage = 'Status: Maximum Results is 10,000. Results might be truncated.';
              this.el.innerHTML = tooManyRowsMessage;
            }
            debugger;

            // Get configuration
            this._getConfigParams(config);

            // Take the first data point
            datum = data.rows;

            // Create nodes dictionary for ID creation purposes.
            var nodesByName = this.nodesByName;

            // Create an array that is used to highlight neighbouring links
            var linkedByIndex = {};

            // Create an empty dictionary for placing the results of the headers in
            var headers = {};

            // Create empty array to place all of the links in
            var linksArray = this.linksArray;

            // Create a variable of x that is 0 to enable iteration
            // var x = 0;

            var groupCount = this.groupCount;
            // Create variable for line style
            var format_info = {};

            // Create empty array for storing header rows / fields
            columns = [];

            // Create pattern for matching header rows / fields to match nodeXX
            var pattern = /node\d{2}$/i;

            // Create a color gradient for highlighting groups
            var color = d3.scaleOrdinal(d3.schemeCategory20);

            // Nodes Array
            nodesArray = this.nodesArray;
            // Path Finding Algo
            var start;
            var end;

            // Set Layout Style Global var
            layoutStyle_global = this.layoutStyle;

            // Set Directed Global
            directedGlobal = this.directed;

            // Path Algo Global
            pathAlgoGlobal = this.pathAlgo;

            // Grab the width and height of the current element
            var width = this.$el.width();
            var height = this.$el.height();
            
            // Get a unique identifier to ensure that no 'cy' node has the same id
            var uniqueCy = this.el.dataset.cid + "cy";

            // Create a unique node list for each panel
            var panel_node_list = uniqueCy + 'node_list';

            // Check to see if cy element exists
            var getCy = document.getElementById(uniqueCy);
            // If the cy element is null then
            if (getCy == null) {
              // Specify a width and height that matches the Splunk console
              // Append an SVG Element
              var svg = d3.select(this.el)
                .append("div")
                .attr('width', width)
                .attr('height', height)
                .attr('id', uniqueCy)
                .attr('active-bg-color', '#555');

              // Create unique Style for this element
              document.getElementById(uniqueCy).style.width = '100%';
              document.getElementById(uniqueCy).style.height = '100%';
              document.getElementById(uniqueCy).style.position = 'absolute';
              document.getElementById(uniqueCy).style.top = '0px';
              document.getElementById(uniqueCy).style.left = '0px';
              document.getElementById(uniqueCy).style.zIndex = '999';
              document.getElementById(uniqueCy).style.activeBgOpacity = '0.333';
            }
            // Add Cytoscape Element
            var cy = cytoscape({
              container: document.getElementById(uniqueCy),
              style: [{
                selector: 'node',
                style: {
                  label: 'data(label)'
                }
              }]
            });
            // If a group count exists
            if (groupCount) {
              // Return group counts which have a rollup value of greater than 1
              var groups = groupCount.filter(function (group) {
                return group.value > 1;
              });
              // Start from the first group and iterate through
              var z = 1;
              groups.forEach(function (groupArrayMember) {
                groupArrayMember.group = z;
                z++;
              });

              // For each item in the groups array
              groups.forEach(function (groupArrayMember) {
                // Return a subset of the linksArray where a group number hasn't been allocated i.e 0
                linkGroup = linksArray.filter(function (x) {
                  return nodesByName[x.source.name].group === 0 || nodesByName[x.target.name].group === 0;
                });
                // For each item in the linkGroup array
                linkGroup.forEach(function (linkGroupArray) {
                  // If the reduced array group is either the source or target.
                  if (groupArrayMember.key === linkGroupArray.source.name || groupArrayMember.key === linkGroupArray.target.name) {
                    // If the group value of the source is 0
                    if (nodesByName[linkGroupArray.source.name].group === 0) {
                      // Set the group value of both the source to group.group
                      nodesByName[linkGroupArray.source.name].group = groupArrayMember.group;
                    }
                    // If the group value of the target is 0
                    if (nodesByName[linkGroupArray.target.name].group === 0) {
                      // Set the group value of both the target to group.value
                      nodesByName[linkGroupArray.target.name].group = groupArrayMember.group;
                    }
                  }
                });
              });
            }
            // Create a unique list of nodes
            const unique = (value, index, self) => {
              return self.indexOf(value) === index;
            }
            // Create a unique list of items from the nodesArray variable
            nodesUnique = nodesArray.filter(unique);

            // Create an incrementer variable for node id
            var n = 0;

            // Foreach unique node add to the node list
            nodesUnique.forEach(function (node) {
              // Create an incrementer for the node id
              node_id = "n" + n;
              // Add node and node ID
              nodeById(node, node_id)
              // Check to see if the nodesByName[node].color has a value.  If so, set node_color to nodesByName[node].color
              // else set the color to the group color.
              node_color = nodesByName[node].color ? nodesByName[node].color : color(nodesByName[node].group);

              // Check to see if the nodesByName[node].shape has a value.  If so, set node_shape to nodesByName[node].shape
              // else set the shape to a ellipse.
              node_shape = nodesByName[node].shape ? nodesByName[node].shape : 'ellipse';
              cy.add({
                data: {
                  id: node_id,
                  weight: 1,
                  label: node,
                  color: node_color,
                  shape: node_shape
                }
              });
              n++;
            });

            datum.forEach(function (link) {
              // Add nodes to list
              source_out = nodesByName[link[0]].id
              target_out = nodesByName[link[1]].id
              node_data = {
                data: {
                  source: source_out,
                  target: target_out,
                }
              }
              if (this.format_info['line_label']) {
                line_label_num = this.format_info['line_label']
                node_data.data.label = link[line_label_num]
              }
              node_data.data.color = this.format_info['line_color'] ? node_data.data.color = link[this.format_info['line_color']] : "#808080"

              cy.add(node_data)

            });

            /* 
            Cytoscape Styling of graph
            */

            // Style the edges
            cy.style()
              .selector('edge')
              .style({
                'width': 5,
                'edge-text-rotation': 'autorotate',
                'target-arrow-shape': 'triangle',
                'arrow-scale': 2,
                'curve-style': 'bezier',
                'text-background-color': 'white',
                'text-opacity': 0.1,
                'opacity': 0.3,
                'text-background-opacity': 0.8,
                'text-background-shape': 'roundrectangle',
                'min-zoomed-font-size': '15',
                'text-valign"': 'top',
                'text-halign': 'center',
                'control-point-weight': '0.5', // '0': curve towards source node, '1': towards target node.

              })
            // If the background color is set then apply the appropriate background color
            if (bgColor) {
              cy.style()
                .selector('core')
                .style({
                  'background': bgColor
                })

              //Apply the edge color as required including the background color
              cy.style()
                .selector('edge')
                .style({
                  'color': textColor,
                  'text-background-color': bgColor
                })

            }
            // If there is a line_label field in the Splunk search define it as a data field
            if (this.format_info.line_label) {
              cy.style()
                .selector('edge')
                .style({
                  'label': 'data(label)'
                })
            }

            // If there is a line_color field in the Splunk search define it as a data field

            if (this.format_info.line_color) {
              cy.style()
                .selector('edge')
                .style({
                  'line-color': 'data(color)',
                })
            }

            // Cytoscape Styling
            // Apply the node color as defined in the textColor format option
            cy.style()
              .selector('node')
              .style({
                'background-color': 'data(color)',
                'min-zoomed-font-size': '15',
                'color': textColor,
                'shape': 'data(shape)'
              })

            // Node Highlighting class
            cy.style()
              .selector('.nodehighlighted')
              .style({
                'border-width': 5,
                'border-color': 'red',
                'width': '60px',
                'height': '60px',
                'transition-duration': '1s'
              });

            // Node highlighted children class (Used when remove field is present)
            cy.style()
              .selector('.nodehighlightedchildren')
              .style({
                'border-width': 5,
                'border-color': 'red',
                'transition-duration': '1s'
              });


            // Highlighted Class for path highlighted nodes and finally update the style sheet
            cy.style()
              .selector('.highlighted')
              .style({
                'background-color': '#61bffc',
                'line-color': '#cc0000',
                'target-arrow-color': '#cc0000',
                'transition-property': 'background-color, line-color, target-arrow-color',
                'transition-duration': '0.5s'
              }).update();

            // End Styling

            // Run the layout
            runLayout(this.layoutStyle)

            // Run Layout function
            function runLayout(layoutStyle, initialRun = true) {

              // If Prefilter has been configured
              if (preFilter) {
                // If it is the first time the layout has been run for this javascript session
                if (initialRun == true) {
                  if (preFilter.length > 0) {
                    // If the node exists
                    if (nodesByName[preFilter].id) {
                      node_id = "#" + nodesByName[preFilter].id;
                      // Do a path finding process and add to a collection to highlight all nodes outbound and inbound respecting direction for removal
                      highlightCollection = cy.collection(cy.elements().bfs(node_id, 1, directedGlobal).path);
                      var element_del = cy.elements().not(cy.$(highlightCollection));
                      // Remove elements
                      cy.remove(element_del);
                    }
                  }
                }
              }
              // If the remove is specified and it is also the initial run of the graph
              if (preRemove && initialRun == true) {
                // Check to ensure that the preRemove var is not empty
                if (preRemove.length > 0) {
                  // Check to ensure that the node exists.
                  if (nodesByName[preRemove].id) {
                    var initialRun = false;

                    node_id = "#" + nodesByName[preRemove].id;
                    initial_node = cy.$(node_id);
                    // If we are adding children recursively on clicks 
                    if (recursiveLookup == false) {
                      successor_preRemove = initial_node.outgoers()
                      predecessor_preRemove = initial_node.incomers()
                      // If we are only adding immediate children on clicks 
                    } else {
                      successor_preRemove = initial_node.successors()
                      predecessor_preRemove = initial_node.predecessors()
                    }
                    // Create a new colletion from aboce
                    jointNodes_preRemove = successor_preRemove.union(predecessor_preRemove);
                    // Add the children as keys in the nodesByName dictionary
                    nodesByName[preRemove].children = jointNodes_preRemove;

                    // Delete the rest and push the element_preRemove to a variable that can be used later for adding back in a compute efficient way.
                    element_preRemove = cy.$().not(cy.$(node_id));

                    // Iterate through nodes and add predecessors and successors to the nodeByName array
                    for (var x = 0; x < element_preRemove.length; x++) {
                      if (element_preRemove[x].outgoers().length > 1 || element_preRemove[x].incomers().length > 1) {
                        if (recursiveLookup == false) {
                          var successor_preRemove = element_preRemove[x].outgoers()
                          var predecessor_preRemove = element_preRemove[x].incomers()
                        } else {
                          var successor_preRemove = element_preRemove[x].successors()
                          var predecessor_preRemove = element_preRemove[x].predecessors()
                        }
                        var jointNodes_preRemove = successor_preRemove.union(predecessor_preRemove);
                        node_id = "#" + element_preRemove[x].id();
                        node_label = cy.$(node_id).data('label');
                        if (nodesByName[node_label]) {
                          nodesByName[node_label].children = jointNodes_preRemove
                        }

                      }
                    }

                    // Remove all of the elements from the view except the first node.
                    cy.remove(element_preRemove);
                  }
                }
              }
              // Fcose Layout Options
              // Fcose Layout Options
              var fcoseOptions = {
                stop: function () {
                  cy.removeAllListeners();
                  launchPostProcess();
                },
                name: layoutStyle,
                quality: "default",
                // Type of layout animation. The option set is {'during', 'end', false}
                animate: false,
                fit: false,
                // For enabling tiling
                tile: true,
                spacingFactor: 1.2,
                hideEdgesOnViewport: true,
                hideLabelsOnViewport: true,
                nodeDimensionsIncludeLabels: true,
                // interpolate on high density displays instead of increasing resolution
                pixelRatio: 1,
                // a motion blur effect that increases perceived performance for little or no cost
                motionBlur: true,
                nodeDimensionsIncludeLabels: true,
                nodeRepulsion: 20000,
                nodeOverlap: 300,
                // separation amount between nodes
                nodeSeparation: 500,
                // Nesting factor (multiplier) to compute ideal edge length for nested edges
                nestingFactor: 0.1,
                // Gravity force (constant)
                gravity: 0.1,

              };

              // Cose Bilkent Layout options
              var coseBilkentOptions = {
                stop: function () {
                  cy.removeAllListeners();
                  launchPostProcess();
                },
                name: layoutStyle,
                // Type of layout animation. The option set is {'during', 'end', false}
                animate: false,
                fit: false,

                hideEdgesOnViewport: true,
                hideLabelsOnViewport: true,
                // interpolate on high density displays instead of increasing resolution
                pixelRatio: 1,
                // a motion blur effect that increases perceived performance for little or no cost
                motionBlur: true,
                nodeRepulsion: 20000,
                nodeOverlap: 300
              };
              // Standard Cose Animation Options
              var layoutCoseOptions = {
                stop: function () {
                  cy.removeAllListeners();
                  launchPostProcess();
                },
                name: 'cose',
                animate: false,
                padding: 100,
                fit: false,
                nodeOverlap: 30,
                idealEdgeLength: function (edge) {
                  switch (edge.data().type) {
                    case 1:
                      return 30;
                    case 2:
                    case 3:
                      return 120;
                    case 0:
                    default:
                      return 120;
                  }
                },
                edgeElasticity: function (edge) {
                  switch (edge.data().type) {
                    case 1:
                      return 50;
                    case 2:
                    case 3:
                      return 200;
                    case 0:
                    default:
                      return 200;
                  }
                },
                nestingFactor: 1.2,
                initialTemp: 1000,
                coolingFactor: 0.99,
                minTemp: 1.0,
                gravity: 1.4
              };
              // Switch statement to run different operations depending on the layout selected.
              switch (layoutStyle) {
                case "fcose":
                  cy.layout(fcoseOptions).run();
                  break;
                case "cose-bilkent":
                  cy.layout(coseBilkentOptions).run();
                  break;

                case "cose":
                  cy.layout(layoutCoseOptions).run();


                default:
                  cy.layout({
                    stop: function () {
                      cy.removeAllListeners();
                      launchPostProcess();
                    },
                    name: layoutStyle,
                    nodeDimensionsIncludeLabels: true,
                    // Performance Options
                    hideEdgesOnViewport: true,
                    hideLabelsOnViewport: true,
                    // interpolate on high density displays instead of increasing resolution
                    pixelRatio: 1,
                    // a motion blur effect that increases perceived performance for little or no cost
                    motionBlur: true,
                    animate: false,
                    nodeRepulsion: 4096,
                    nodeOverlap: 4,
                    fit: false
                  }).run();
                  break;
              }
            }

            function launchPostProcess() {
              let boxedNodes = cy.collection();
              let elemsWChildren = cy.collection();
              if (preRemove) {
                cy.$(cy.elements()).removeClass('nodehighlightedchildren');
                cy.on('tap', 'node', function (evt) {
                  node_id = "#" + evt.target.id();
                  node_label = cy.$(node_id).data('label');
                  if (nodesByName[node_label].children && nodesByName[node_label].children.length > 0 && nodesByName[node_label].children.difference(cy.elements()).length > 0) {
                    var diff_nodes = nodesByName[node_label].children.difference(cy.elements());
                    cy.add(diff_nodes);
                    runLayout(layoutStyle_global, false);
                  }

                });
                for (var x = 0; x < cy.elements().length; x++) {
                  if (nodesByName[cy.elements()[x].data('label')] && nodesByName[cy.elements()[x].data('label')].children.length > 0 && nodesByName[cy.elements()[x].data('label')].children.difference(cy.elements())) {
                    if (nodesByName[cy.elements()[x].data('label')].children.difference(cy.elements()).length > 0) {
                      elemsWChildren = elemsWChildren.union(cy.elements()[x]);
                    }
                  }
                }
                cy.$(elemsWChildren).addClass('nodehighlightedchildren')
              }
              // If the node list and menus do not exist, add them.
              if (document.getElementById(panel_node_list) == undefined) {
                // Create a Datalist for the search nodes
                var nodeListDataList = document.createElement("datalist");
                nodeListDataList.setAttribute("id", panel_node_list);
                document.body.appendChild(nodeListDataList);

                // Add nodes to list
                var list = document.getElementById(panel_node_list);
                nodesUnique.forEach(function (node) {
                  var option = document.createElement('option');
                  option.value = node;
                  list.appendChild(option);
                });
              }
              if (document.getElementById('menu_list') == undefined) {
                // Create a list element
                var menuDataList = document.createElement("datalist");
                menuDataList.setAttribute("id", "menu_list");
                document.body.appendChild(menuDataList);

                // Add Menu Items
                menu_list_items = ['Delete Highlighted Items', 'Delete Non-Highlighted Items', 'Refresh', 'Clear Formatting', 'Save State', 'Style Edges'];
                menu_list_items = menu_list_items.sort()
                var list = document.getElementById('menu_list');
                menu_list_items.forEach(function (item) {
                  var option = document.createElement('option');
                  option.value = item;
                  list.appendChild(option);
                });

              }
              // Add box highlight function
              cy.on('box', function (e) {
                let node = e.target;
                boxedNodes = boxedNodes.union(node);
                boxedNodes.addClass('highlighted');
              });

              // Begin - Add Menu for nodes and background
              cy.cxtmenu({
                selector: 'node',
                commands: [{
                    content: "Single Path Select",
                    select: function (ele) {
                      if (start) {
                        end = ele.id();
                        highlightNextEle(start, end);
                      } else {
                        start = ele.id();
                        cy.getElementById(start).addClass('highlighted')
                      };
                    }
                  },
                  {
                    content: "Hlt All Paths",
                    select: function (ele) {
                      start = ele.id();
                      n_predecessors = ele.predecessors()
                      n_successors = ele.successors()
                      jointNodes = n_predecessors.union(n_successors);
                      jointNodes.addClass('highlighted')
                      highlightAllPathsFrom(start)

                    }
                  },
                  {
                    content: "Run Search - Beta",
                    select: function (ele) {
                      // Test Remove
                      var drillDownSearch = new SearchManager({
                        id: "mysearch1",
                        earliest_time: "-24h@h",
                        latest_time: "now",
                        search: "index=_internal | head 100 | stats count by source"
                      });
                      drillDownSearch.on("search:done", function (state, job) {
                        if (state.content.resultCount === 0) {
                          console.log("no results");
                        } else {
                          // Get the job from the server to display more info
                          job.fetch(function (err) {
                            // Get the results and display them
                            job.results({}, function (err, results) {
                              // do something with results...
                              console.log(results);
                            });
                          });
                        }
                      });

                    }
                  },
                  {
                    content: "Set Token",
                    select: function (ele) {
                      // Get List of All tokems and push to an array
                      var tokens = mvc.Components.get("default");
                      var tokenList = [];
                      for (const [key, value] of Object.entries(tokens.attributes)) {
                        tokenList.push(key)
                      }



                      if (document.getElementById('token_list') == undefined) {
                        // Create a Datalist for the token list
                        var tokenListDataList = document.createElement("datalist");
                        tokenListDataList.setAttribute("id", "token_list");
                        document.body.appendChild(tokenListDataList);
        
                        // Add tokens to list
                        var list = document.getElementById("token_list");
                        tokenList.forEach(function (token) {
                          var option = document.createElement('option');
                          option.value = token;
                          list.appendChild(option);
                        });
                      }

                      if (tokenCheckedGlobal){
                        console.log('Persistent field checked, updated token with new value');
                        // Change the value of a token the selected value from the graph
                        tokens.set(tokenValueGlobal, cy.$("#" + ele.id()).data().label);
                        debugger;
                      }
                      // If no global token set, create the modal
                      else {
                      // Create a Modal that asks the user which token they want to set this as.
                      // Now we initialize the Modal itself
                      var myModal = new Modal("modal1", {
                        title: "Set Token",
                        backdrop: 'static',
                        keyboard: false,
                        destroyOnHide: true,
                        type: 'normal'
                      });
                      myModal.body
                        .append($('<p>Use this menu to set a token in your visualisation.</p>'));
                      myModal.body
                        .append($('<input>').attr({
                          'name': 'token_list',
                          'id': 'token_input',
                          'type': 'text',
                          'list': 'token_list',
                          'style': 'z-index:9999'
                        }));
                      myModal.body
                      .append($('<h4>Persist Token:</h4>'));
                      myModal.body
                      .append($('<input type="checkbox" id="tokenCheckbox" name="tokenCheckbox">'));

                      myModal.footer.append($('<button>').attr({
                        type: 'button',
                        'data-dismiss': 'modal'
                      }).addClass('btn btn-primary').text('Set Token').on('click', function () {
                        // Do Nothing Function
                        tok = document.getElementById('tokenCheckbox');
                        tokValue = document.getElementById('token_input');
                        tokenCheckedGlobal = tok.checked
                        tokenValueGlobal = tokValue.value
                        var element = document.getElementById('tokenCheckbox');
                        element.parentNode.removeChild(element);

                        // Change the value of a token the selected value from the graph
                        tokens.set(tokenValueGlobal, cy.$("#" + ele.id()).data().label);

                      }))
                      myModal.show(); // Launch it!
                      // End Modal Addition
                    }
                  }
                  },

                  {
                    content: 'Focus',
                    select: function (ele) {
                      var collection;
                      // Save the current state of the graph
                      graphStateForFocus = cy.json();
                      // Find the node if of the currently selected node
                      node_id = "#" + ele.id();
                      node = cy.$(node_id)
                      positionOfNode = ele.position()
                      isZoomedIn = true;
                      focus_Node_Outgoers = ele.outgoers()
                      focus_Node_Incomers = ele.incomers()
                      collection = focus_Node_Outgoers.union(focus_Node_Incomers);
                      collection = collection.union(node);
                      notInCollection = cy.elements().not(cy.$(collection));

                      var layout = collection.layout({
                        name: 'concentric',
                        fit: false,
                        animate: true,
                        spacingFactor: 4,
                        minNodeSpacing: 20,
                        avoidOverlap: true,
                        boundingBox: {
                          x1: positionOfNode.x - 1,
                          x2: positionOfNode.x + 1,
                          y1: positionOfNode.y - 1,
                          y2: positionOfNode.y + 1
                        },
                        concentric: function (ele) {
                          if (ele.same(node)) {
                            return 4;
                          } else {
                            return 1;
                          }
                        },
                        levelWidth: function () {
                          return 1;
                        },


                      });

                      // Run the layout
                      layout.run();
                      // Update the style to make all nodes opacity 1
                      cy.style()
                        .selector(notInCollection)
                        .style({
                          'opacity': 0.1,
                        })

                      cy.style()
                        .selector(collection)
                        .style({
                          'text-opacity': 1.0,
                          'z-index': 999,
                          'opacity': 1.0
                        })
                        .update()


                      cy.animate({
                        zoom: 1,
                        center: {
                          eles: node
                        }
                      }, {
                        duration: 1000

                      });

                      // Create a popper menu to allow resetting the layout
                      let popper2 = cy.popper({
                        content: () => {
                          // Create an input box
                          var x = document.createElement("button");
                          x.setAttribute("name", "reset_view");
                          x.setAttribute("id", "reset_view");
                          x.setAttribute("class", "btn  btn-primary")
                          x.innerHTML = "Reset";
                          x.setAttribute("style", "z-index:9999");
                          x.addEventListener("click", function (e) {
                            // Add the saved graph as the current json
                            cy.json(graphStateForFocus)
                            var layoutStatic = cy.layout({
                              name: 'preset',
                              animation: true,
                              animationEasing: 'linear',
                              animationDuration: 1000

                            });
                            // Prevent mouse over highlight from occuring
                            isZoomedIn = undefined;
                            layoutStatic.run();
                            // Delete the button after using
                            var element = document.getElementById('reset_view');
                            element.parentNode.removeChild(element);
                          }, false);;
                          document.body.appendChild(x);

                          return x;
                        },
                        renderedPosition: () => ({
                          x: 10,
                          y: 10
                        }),
                        popper: {

                        } // my popper options here
                      });

                    },
                  },
                  {
                    content: 'Condense',
                    select: function (ele) {
                      var collection;
                      // Find the node if of the currently selected node
                      node_id = "#" + ele.id();
                      node = cy.$(node_id)
                      positionOfNode = ele.position()
                      focus_Node_Outgoers = ele.outgoers()
                      focus_Node_Incomers = ele.incomers()
                      collection = focus_Node_Outgoers.union(focus_Node_Incomers);
                      collection = collection.union(node);
                      notInCollection = cy.elements().not(cy.$(collection));
                      concentricCount = 0;

                      // Total nodes to calculate the amount of 
                      totalNodes = collection.length
                      if (totalNodes < 50) {
                        spacingFactorVar = 4
                      } else if (totalNodes >= 50 && totalNodes <= 80) {
                        spacingFactorVar = 2

                      } else if (totalNodes >= 81 && totalNodes <= 150) {
                        spacingFactorVar = 1

                      } else {
                        spacingFactorVar = 0.25
                      }
                      var layout = collection.layout({
                        name: 'concentric',
                        fit: false,
                        animate: true,
                        spacingFactor: spacingFactorVar,
                        minNodeSpacing: 5,
                        avoidOverlap: true,
                        boundingBox: {
                          x1: positionOfNode.x - 1,
                          x2: positionOfNode.x + 1,
                          y1: positionOfNode.y - 1,
                          y2: positionOfNode.y + 1
                        },
                        concentric: function (ele) {
                          if (ele.same(node)) {
                            return 4;
                          } else {
                            return 1;
                          }
                        },
                        levelWidth: function () {
                          return 1;
                        },



                      });

                      // Run the layout
                      layout.run();

                      cy.animate({
                        zoom: 0.2,
                        center: {
                          eles: node
                        }
                      }, {
                        duration: 1000

                      });

                    },
                  },

                ]
              });

              cy.cxtmenu({
                selector: 'core',
                commands: [{
                    content: 'Search Nodes',
                    select: function () {
                      // Now we initialize the Modal itself
                      var myModal = new Modal("modal1", {
                        title: "Search Nodes",
                        backdrop: 'static',
                        keyboard: false,
                        destroyOnHide: true,
                        type: 'normal'
                      });
                      myModal.body
                        .append($('<p>Use the search menu to find and zoom into a node.</p>'));
                      myModal.body
                        .append($('<input>').attr({
                          'name': 'node_search',
                          'id': 'node_search',
                          'type': 'text',
                          'list': panel_node_list,
                          'style': 'z-index:9999'
                        }));

                      myModal.footer.append($('<button>').attr({
                        type: 'button',
                        'data-dismiss': 'modal'
                      }).addClass('btn btn-primary').text('Search').on('click', function () {
                        // Do Nothing Function
                        searchNodes();

                      }))
                      myModal.show(); // Launch it!
                    },
                  },

                  {
                    content: 'Menu',
                    select: function (ele) {
                      // Now we initialize the Modal itself
                      var myModal = new Modal("modal1", {
                        title: "Menu",
                        backdrop: 'static',
                        keyboard: false,
                        destroyOnHide: true,
                        type: 'normal'
                      });
                      myModal.body
                        .append($('<p>Select from the list of available functions.</p>'));

                      myModal.body
                        .append($('<input>').attr({
                          'name': 'menu_select',
                          'id': 'menu_select',
                          'type': 'text',
                          'list': 'menu_list',
                          'style': 'z-index:9999'
                        }).addClass('table table-striped table-hover'));

                      myModal.footer.append($('<button>').attr({
                        type: 'button',
                        'data-dismiss': 'modal'
                      }).addClass('btn btn-primary').text('Select').on('click', function () {
                        // Do Nothing Function
                        x = document.getElementById('menu_select')
                        returnMenu(ele, x);

                      }))
                      myModal.show(); // Launch it!
                    },
                  },

                ]
              });

              // Set Min Zoom / Max Zoom
              cy.minZoom(0.05);
              cy.maxZoom(1.5);
              var zIndex;
              // Set a mouse over and mouse out listener for edges to make them easier to view
              cy.on('mouseover', 'edge', function (evt) {
                if (isZoomedIn == undefined) {
                  edge_id = "#" + evt.target.id()
                  zIndex = cy.$(edge_id).style().zIndex
                  cy.style()
                    .selector(edge_id)
                    .style({
                      'text-opacity': 1.0,
                      'opacity': 1.0,
                      'z-index': 999
                    }).update()
                }
              });

              cy.on('mouseout', 'edge', function (evt) {
                if (isZoomedIn == undefined) {
                  edge_id = "#" + evt.target.id()
                  cy.style()
                    .selector(edge_id)
                    .style({
                      'text-opacity': 0.1,
                      'opacity': 0.3,
                      'z-index': zIndex
                    }).update()
                  var zIndez
                }
              });


              if (preFilter) {
                node_id = "#" + nodesByName[preFilter].id;
                cy.fit(node_id);
              } else if (preRemove && initialRun == true) {
                node_id = "#" + nodesByName[preRemove].id;
                cy.fit(node_id);
              } else if (initialRun == false) {
                // Do nothing routine
                pass
              } else {
                cy.fit()
              }


            }

            // Specify interval (in milliseconds)
            const interval = 300;
            cy.dblclick(interval);

            cy.on('dblclick', function (e) {
              this.drilldownToCategory('_raw', 'test', e);
            }.bind(this));

            // End - Add Menu for nodes and background


            function searchNodes(ele) {
              var node_value = document.getElementById("node_search").value;
              if (nodesByName[node_value]) {
                node_id = "#" + nodesByName[node_value].id;
                // Zoom in to the node naturally
                cy.animate({
                  zoom: 1,
                  center: {
                    eles: node_id
                  }
                }, {
                  duration: 1000

                });
                // Adjust view to ensure that the node is ~ centre
                cy.$(node_id).flashClass('nodehighlighted', 2500);

              }
              // Delete the search box
              var element = document.getElementById('node_search');
              element.parentNode.removeChild(element);
              // var data_node_list = document.getElementById("node_list");
              // data_node_list.remove(data_node_list);

            }

            // Begin - Path Highlighting Function

            function highlightNextEle(start_id, end_id) {
              // Highlight Elements
              startid_hash = "#" + start_id
              endid_hash = "#" + end_id
              switch (pathAlgoGlobal) {

                case "dijkstra":
                  // code block
                  var dijkstra = cy.elements().dijkstra(startid_hash, function (eles) {
                    return 1
                  }, directedGlobal);
                  var djs = dijkstra.pathTo(endid_hash);
                  djs.length == 1 ? displayMessage("Error", "No path found between two nodes") : nodesByName[link[1]].color = link[format_info['dest_color']]
                  displayMessage(title, message)

                  for (var x = 0; x < djs.length; x++) {
                    var el = djs[x];
                    el.addClass('highlighted');
                  }
                  break;

                case "aStar":
                  // code block
                  var aStar = cy.elements().aStar({
                    root: startid_hash,
                    goal: endid_hash,
                    directed: directedGlobal
                  });
                  for (var x = 0; x < aStar.path.length; x++) {
                    var el = aStar.path[x];
                    el.addClass('highlighted');
                  }
                  break;

                case "floydWarshall":
                  // code block
                  var fw = cy.elements().floydWarshall();
                  fw_collection = fw.path(startid_hash, endid_hash)
                  for (var x = 0; x < fw_collection.length; x++) {
                    var el = fw_collection[x];
                    el.addClass('highlighted');
                  }
                  break;
                case "bellmanFord":
                  // code block
                  var bellmanFord = cy.elements().bellmanFord({
                    root: startid_hash,
                    directed: directedGlobal
                  });
                  var djs = bellmanFord.pathTo(endid_hash);
                  for (var x = 0; x < djs.length; x++) {
                    var el = djs[x];
                    el.addClass('highlighted');
                  }
                  break;

                default:
                  // code block
                  var dijkstra = cy.elements().dijkstra(startid_hash, function (eles) {
                    return 1
                  }, directedGlobal);
                  var djs = dijkstra.pathTo(endid_hash);

                  for (var x = 0; x < djs.length; x++) {
                    var el = djs[x];
                    el.addClass('highlighted');
                  }
                  break;
              }
              start = undefined;
              end = undefined;
            }

            // End - Single Path Highlighting Function

            // Begin - Higlight All Paths From.
            function highlightAllPathsFrom(start_node) {
              start_node = "#" + start_node;
              console.log(directedGlobal);
              var bfs = cy.elements().bfs(start_node, 1, directedGlobal);
              for (var x = 0; x < bfs.path.length; x++) {
                var el = bfs.path[x];
                el.addClass('highlighted');
              }

            }
            // End Higlight All Nodes between path.

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

            function nodeById(name, node_id) {
              return nodesByName[name].id || (nodesByName[name].id = node_id);
            }

            function returnMenu(ele, x) {

              switch (x.value) {
                case "Delete Highlighted Items":

                  deleteElement('menu_select')

                  var element_del = cy.elements(cy.$('.highlighted'));
                  // Remove elements
                  cy.remove(element_del);
                  break;

                case "Delete Non-Highlighted Items":
                  // deleteElement('menu_list')
                  deleteElement('menu_select')
                  // Select all elements that are not highligted
                  var element_del = cy.elements().not(cy.$('.highlighted'));
                  // Remove elements
                  cy.remove(element_del);
                  cy.elements().removeClass('highlighted');

                  break;

                case "Refresh":
                  // deleteElement('menu_list')
                  deleteElement('menu_select')
                  runLayout(layoutStyle_global, false);
                  break;

                case "Search":
                  // deleteElement('menu_list')
                  deleteElement('menu_select')

                  break;



                case "Clear Formatting":
                  // deleteElement('menu_list')
                  deleteElement('menu_select')
                  start = undefined;
                  end = undefined;
                  cy.elements().removeClass('highlighted');
                  break;

                case "Save State":
                  // deleteElement('menu_list')
                  deleteElement('menu_select')

                  // Create Modal for HTTP Save State
                  var myModal = new Modal("modal1", {
                    title: "Save State",
                    backdrop: 'static',
                    keyboard: false,
                    destroyOnHide: true,
                    type: 'normal'
                  });
                  myModal.body
                    .append($('<p>This menu allows you to save state of your diagram</p>'));


                  myModal.body
                    .append($('<h4>HTTP Event Code</h4>'));
                  myModal.body
                    .append($('<input type="text" autocomplete="on" id="http_event_code" name="http_event_code" required>'));

                  myModal.body
                    .append($('<h4>HTTP Destination</h4>'));
                  myModal.body
                    .append($('<input type="text" id="http_destination" autocomplete="on" name="http_destination" value="https://yoursplunkserver.com:8089/services/collector" required>'));

                  myModal.body
                    .append($('<h4>Description</h4>'));
                  myModal.body
                    .append($('<input type="text" id="http_description" name="http_description" value="This graph shows ...." required>'));


                  myModal.footer.append($('<button>').attr({
                    type: 'button',
                    'data-dismiss': 'modal'
                  }).addClass('btn btn-primary').text('Submit').on('click', function (modalEle) {
                    // Post to HEC
                    var description = document.getElementById("http_description").value;
                    var http_event_code = document.getElementById("http_event_code").value;
                    var http_destination = document.getElementById("http_destination").value;
                    httpRequest(http_destination, http_event_code, cy.json(), description);

                  }))
                  myModal.show(); // Launch it!

                  break;

                case "Remove Nodes by Count":
                  // deleteElement('menu_list')
                  deleteElement('menu_select')

                  // Create Modal for HTTP Save State
                  var myModal = new Modal("modal1", {
                    title: "Remove Nodes By Count",
                    backdrop: 'static',
                    keyboard: false,
                    destroyOnHide: true,
                    type: 'normal'
                  });
                  /*
                  $(myModal.$el).on("hide", function() {
                  })*/
                  myModal.body
                    .append($('<p>This menu allows you to delete nodes that have less than or greater than a number you specify of children or parent nodes recursively</p>'));

                  myModal.body
                    .append($('<select id="lt_gt" name="lt_gt"><option value ="less_than">Less Than</option><option value ="gt_than">Greater Than</option>'));
                  myModal.body
                    .append($('<input type="text" autocomplete="on" id="number" name="number" required>'));

                  myModal.footer.append($('<button>').attr({
                    type: 'button',
                    'data-dismiss': 'modal'
                  }).addClass('btn btn-primary').text('Submit').on('click', function (modalEle) {
                    var lt_gt = document.getElementById("lt_gt").value;
                    var numberInput = document.getElementById("number").value;
                    if (Number(numberInput)) {
                      if (lt_gt == "less_than") {
                        removeNodesByCount = cy.collection()
                        Object.keys(nodesByName).forEach(function (key) {

                          if (nodesByName[key].children && nodesByName[key].children.length < numberInput) {
                            removeNodesByCount.union(nodesByName[key].children)
                          } else {
                            // Delete the node
                            node_id = "#" + nodesByName[key].id
                            removeNodesByCount.union(cy.$(node_id))
                          }
                        })
                      } else if (lt_gt == "gt_than") {
                        if (nodesByName[key].children && nodesByName[key].children.length > numberInput) {
                          removeNodesByCount.union(nodesByName[key].children)
                        }

                      }
                      // Finally
                      cy.remove(removeNodesByCount);
                    } else(
                      console.log("Error not a number")
                    )

                  }))
                  myModal.show(); // Launch it!

                  break;

                case "Style Edges":
                  // deleteElement('menu_list')
                  deleteElement('menu_select')

                  // Create Modal for HTTP Save State
                  var myModal = new Modal("modal1", {
                    title: "Style Edges",
                    backdrop: 'static',
                    keyboard: false,
                    destroyOnHide: true,
                    type: 'normal'
                  });
                  /*
                  $(myModal.$el).on("hide", function() {
                  })*/
                  myModal.body
                    .append($('<p>This menu allows you to style edges that have a string present on the edge and highlight it in a different colour</p>'));
                  myModal.body
                    .append($('<h4>String To Search (Single Phrase)</h4>'));
                  myModal.body
                    .append($('<input type="text" autocomplete="on" id="edgeTextSearch" name="edgeTextSearch" required>'));
                  myModal.body
                    .append($('<h4>Color to Select</h4>'));
                  myModal.body
                    .append($(' <input type="color" id="style_color" name="head" value="#e66465">'));

                  myModal.footer.append($('<button>').attr({
                    type: 'button',
                    'data-dismiss': 'modal'
                  }).addClass('btn btn-primary').text('Submit').on('click', function (modalEle) {
                    var description = document.getElementById("edgeTextSearch").value;
                    var edgeLineColor = document.getElementById("style_color").value;
                    searchString = 'edge[label *= "' + description + '"]';
                    searchFilter = cy.filter(searchString);
                    // Create new edge search color style and apply it.
                    edgeSearchColorNum++

                    // Used to create the style in CSS Format.
                    edgeSearchColorStyle = '.edgeSearchColor' + edgeSearchColorNum.toString()
                    // Used to apply the style in CSS format
                    edgeSearchColorStyleCy = 'edgeSearchColor' + edgeSearchColorNum.toString()
                    // Highlighted Class
                    cy.style()
                      .selector(edgeSearchColorStyle)
                      .style({
                        'line-color': edgeLineColor
                      }).update();
                    cy.$(searchFilter).addClass(edgeSearchColorStyleCy)
                  }))
                  myModal.show(); // Launch it!

                  break;

                default:
                  // deleteElement('menu_list')
                  deleteElement('menu_select')
                  // Do nothing

                  break;

              }
            }

            function deleteElement(elementId) {
              // Delete the search box
              var element = document.getElementById(elementId);
              element.remove(element);
            }

            function makeid() {
              var result = '';
              var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
              var charactersLength = characters.length;
              for (var i = 0; i < 20; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
              }
              return result;
            }

            function displayMessage(title, message) {
              var myModal = new Modal("Temp Model", {
                title: title,
                backdrop: 'static',
                keyboard: false,
                destroyOnHide: true,
                type: 'normal'
              });
              myModal.body
                .append($('<p>' + message + '</p>'));

              myModal.footer.append($('<button>').attr({
                type: 'button',
                'data-dismiss': 'modal'
              }).addClass('btn btn-primary').text('Close').on('click', function () {
                // Do Nothing Function

              }))
              myModal.show(); // Launch it!
            }

            function httpRequest(url, hec_code, message, description) {
              var xhttp = new XMLHttpRequest();
              full_hec = "Splunk " + hec_code;
              full_message = {
                "event": {
                  "description": description,
                  "graph_info": message,
                  "graph_id": makeid()
                },
                "sourcetype": "cyto:graph"
              };
              xhttp.open("POST", url, true);
              xhttp.setRequestHeader("Authorization", full_hec);
              xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
              xhttp.onload = function () {
                // If a non hard error occurs or success
                responseText = JSON.parse(xhttp.responseText)
                // Now we initialize the Modal itself
                var myModal = new Modal("modal1", {
                  title: "Save State Status",
                  backdrop: 'static',
                  keyboard: false,
                  destroyOnHide: true,
                  type: 'normal'
                });
                /*
                $(myModal.$el).on("hide", function() {
                })*/
                myModal.body
                  .append($('<p><b>Response</b> : ' + responseText.text + ' </p>'));

                myModal.footer.append($('<button>').attr({
                  type: 'button',
                  'data-dismiss': 'modal'
                }).addClass('btn btn-primary').text('Close').on('click', function () {
                  // Do Nothing Function

                }))
                myModal.show(); // Launch it!

              };
              xhttp.onerror = function () {
                // If a hard error occurs
                // Now we initialize the Modal itself
                var myModal = new Modal("modal1", {
                  title: "Error Occured in Saving State",
                  backdrop: 'static',
                  keyboard: false,
                  destroyOnHide: true,
                  type: 'normal'
                });
                /*
                $(myModal.$el).on("hide", function() {
                })*/
                myModal.body
                  .append($('<p>Error occured.  Check the Javascript console for the details.</p>'));

                myModal.footer.append($('<button>').attr({
                  type: 'button',
                  'data-dismiss': 'modal'
                }).addClass('btn btn-primary').text('Close').on('click', function () {
                  // Do Nothing Function

                }))
                myModal.show(); // Launch it!

              }
              xhttp.send(JSON.stringify(full_message));

            }

            function toggleModal() {
              modal.classList.toggle("show-modal");
            }

            function getRandomArbitrary(min, max) {
              return Math.ceil(Math.random() * (max - min) + min);
            }
          }
        },


        // Search data params
        getInitialDataParams: function () {
          return ({
            outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
            count: 10000
          });
        },

        drilldownToCategory: function (categoryName, categoryFieldValue, browserEvent) {
          var data = {};
          data[categoryName] = categoryFieldValue;

          this.drilldown({
            action: SplunkVisualizationBase.FIELD_VALUE_DRILLDOWN,
            data: data
          }, browserEvent);
        },


        // Override to respond to re-sizing events
        reflow: function () {}
      });
    });