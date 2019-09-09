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
      'cytoscape-spread',
      'weaverjs',
      'cytoscape-cose-bilkent',
      'cytoscape-dblclick'

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
      spread,
      weaver,
      coseBilkent,
      dblclick
      // Backbone

    ) {

      // Load menu extension
      cxtmenu(cytoscape);
      fcose(cytoscape);
      dagre(cytoscape);
      popper(cytoscape);
      klay(cytoscape);
      spread(cytoscape, weaver);
      coseBilkent(cytoscape); // register extension
      dblclick( cytoscape );

      // var master = mvc.Components.get('master');
      // var modal = new ModalView();


      var preFilter;
      var directedGlobal;
      var pathAlgoGlobal;
      var preRemove;
      var initialRun;
      var element_preRemove;
      var boxedNodes;
      var bgColor;
      var textColor;
      var removeNodesByCount;

      return SplunkVisualizationBase.extend({

        initialize: function () {
          SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
          this.$el = $(this.el);

          if (SplunkVisualizationUtils.getCurrentTheme && SplunkVisualizationUtils.getCurrentTheme() === 'dark') {
            bgColor = "#212527";
            textColor = "#ffffff";
          }

        },

        _getEscapedProperty: function (name, config) {
          var propertyValue = config[this.getPropertyNamespaceInfo().propertyNamespace + name];
          return SplunkVisualizationUtils.escapeHtml(propertyValue);
        },

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
                this.layoutStyle = this._getEscapedProperty('layoutStyle', config) || 'fcose';
                this.directed = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('directed', config), {
                  default: false
                });
                this.pathAlgo = this._getEscapedProperty('pathAlgo', config) || 'dijkstra';

                break;
            }
            return;
          } else {
            // debugger;
            this.layoutStyle = this._getEscapedProperty('layoutStyle', config) || 'fcose';
            this.directed = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('directed', config), {
              default: false
            });
            this.pathAlgo = this._getEscapedProperty('pathAlgo', config) || 'dijkstra';
            return;
          }


        },

        onConfigChange: function (configChanges, previousConfig) {
          // Get Configuration Data
          // debugger;
          // if the previous config is the same as the configured menu item.  Do Nothing.  Handling first time opening the format menu
          if (Object.keys(previousConfig).length == 1 && previousConfig["display.visualizations.custom.drilldown"] == "all" && Object.keys(configChanges).length > 1) {
            //this._getConfigParams(configChanges);
            return;
          }

          /*
          // if the previous config is the same as the configured menu item.  Do Nothing.  Handling first time opening the format menu
          else if (previousConfig["display.visualizations.custom.link_analysis_app.link_analysis.directed"] == this.directed.toString() &&
            previousConfig["display.visualizations.custom.link_analysis_app.link_analysis.pathAlgo"] == this.pathAlgo.toString() &&
            previousConfig["display.visualizations.custom.link_analysis_app.link_analysis.layoutStyle"] == this.layoutStyle.toString() ) {
            return;
          } 
*/

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

          this.format_info = {};
          // Create nodes dictionary for ID creation purposes.
          var nodesByName = {};
          format_info = {};
          // Create an empty group array to allow group assignment
          group_list = [];
          // Take the first data point
          datum = data.rows;
          // Create empty array to place all of the nodes in
          var nodesArray = [];

          var linksArray = [];

          this._getConfigParams(config);

          // Update group items
          // For each field in the output if the regex matches the pattern variable push it to the columns array
          // Set x to 0 so the line numbers match up.
          x = 0;
          data.fields.forEach(function (column) {
            var str = String(column.name);

            switch (str) {
              case "line_label":
                format_info['line_label'] = x;
                break;

              case "line_color":
                format_info['line_color'] = x;
                break;

              case "line_colour":
                format_info['line_color'] = x;
                break;

              case "filter_start":
                format_info['filter_start'] = x;
                preFilter = data.rows[0][x].toString();
                break;
              case "filter_end":
                format_info['filter_end'] = x;
                break;
              case "remove":
                format_info['remove'] = x;
                preRemove = data.rows[0][x].toString();
                break;
              default:
                break;
            }

            x++;
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

          // Throw warning if there is more than 10,000 rows
          /*
          if (data.rows.length >10000) {
            var message = 'Warning: This visualization renders up to 10,000 data points. Results might be truncated.';
            this.el.innerHTML = message;
          }
          */

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
          var x = 0;

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

          var width = this.$el.width()
          var height = this.$el.height()
          // Check to see if cy element exists
          var getCy = document.getElementById("cy")
          if (getCy == null) {
            // Specify a width and height that matches the Splunk console
            // Append an SVG Element
            var svg = d3.select(this.el)
              .append("div")
              .attr('width', width)
              .attr('height', height)
              .attr('id', 'cy')
              .attr('active-bg-color', '#555');
          }

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

          if (groupCount) {
            // Return group counts which have a rollup value of greater than 1
            var groups = groupCount.filter(function (group) {
              return group.value > 1;
            });
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
          nodesUnique = nodesArray.filter(unique);

          // Create an incrementer variable for node id
          var n = 0;
          // Foreach unique node add to the node list

          nodesUnique.forEach(function (node) {
            node_id = "n" + n;
            nodeById(node, node_id)
            node_color = color(nodesByName[node].group);
            cy.add({
              data: {
                id: node_id,
                weight: 1,
                label: node,
                color: node_color
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

          // Cytoscape Styling
          cy.style()
            .selector('edge')
            .style({
              'width': 3,
              'edge-text-rotation': 'autorotate',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'text-background-color': 'white',
              'text-background-opacity': 0.8,
              'text-background-shape': 'roundrectangle',
              'min-zoomed-font-size': '20',
              'text-valign"': 'top',
              'text-halign': 'center',
              'min-zoomed-font-size': '1',
              'control-point-weight': '0.5', // '0': curve towards source node, '1': towards target node.

            })
          if (bgColor) {
            cy.style()
              .selector('core')
              .style({
                'background': bgColor
              })
            cy.style()
              .selector('edge')
              .style({
                'color': textColor,
                'text-background-color': bgColor
              })

            cy.style()
              .selector('node')
              .style({
                'color': textColor
              })


          }

          if (this.format_info.line_label) {
            cy.style()
              .selector('edge')
              .style({
                'label': 'data(label)'
              })
          }
          if (this.format_info.line_color) {
            cy.style()
              .selector('edge')
              .style({
                'line-color': 'data(color)',
              })
          }

          // Cytoscape Styling
          cy.style()
            .selector('node')
            .style({
              'background-color': 'data(color)',
              'min-zoomed-font-size': '20'
            })

          // Node Highlighting
          cy.style()
            .selector('.nodehighlighted')
            .style({
              'border-width': 5,
              'border-color': 'red',
              'width': '60px',
              'height': '60px',
              'transition-duration': '1s'
            });

          cy.style()
            .selector('.nodehighlightedchildren')
            .style({
              'border-width': 5,
              'border-color': 'red',
              'transition-duration': '1s'
            });


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



          runLayout(this.layoutStyle)

          // End Styling


          function runLayout(layoutStyle, initialRun = true) {

            // If Prefilter has been configured
            if (preFilter) {
              if (initialRun == true) {
                if (preFilter.length > 0) {
                  // If the node exists
                  if (nodesByName[preFilter].id) {
                    node_id = "#" + nodesByName[preFilter].id;
                    highlightCollection = cy.collection(cy.elements().bfs(node_id, 1, directedGlobal).path);
                    var element_del = cy.elements().not(cy.$(highlightCollection));
                    // Remove elements
                    cy.remove(element_del);
                  }
                }
              }
            }
            if (preRemove && initialRun == true) {

              if (preRemove.length > 0) {
                if (nodesByName[preRemove].id) {
                  var initialRun = false;

                  node_id = "#" + nodesByName[preRemove].id;
                  initial_node = cy.$(node_id);
                  successor_preRemove = initial_node.successors()
                  predecessor_preRemove = initial_node.predecessors()
                  jointNodes_preRemove = successor_preRemove.union(predecessor_preRemove);
                  nodesByName[preRemove].children = jointNodes_preRemove;

                  // Delete the rest and push the element_preRemove to a variable that can be used later for adding back in a compute efficient way.
                  element_preRemove = cy.$().not(cy.$(node_id));

                  // Iterate through nodes and add predecessors and successors to the nodeByName array
                  for (var x = 0; x < element_preRemove.length; x++) {
                    if (element_preRemove[x].successors().length > 1 || element_preRemove[x].predecessors().length > 1) {
                      var successor_preRemove = element_preRemove[x].successors()
                      var predecessor_preRemove = element_preRemove[x].predecessors()
                      var jointNodes_preRemove = successor_preRemove.union(predecessor_preRemove);
                      node_id = "#" + element_preRemove[x].id();
                      node_label = cy.$(node_id).data('label');
                      if (nodesByName[node_label]) {
                        nodesByName[node_label].children = jointNodes_preRemove
                      }

                    }
                  }

                  // Remove elements
                  cy.remove(element_preRemove);
                }
              }
            }

            var fcoseOptions = {
              stop: function () {
                cy.removeAllListeners();
                launchPostProcess();
              },
              name: layoutStyle,
              quality: "proof",
              // number of ticks per frame; higher is faster but more jerky
              //refresh: 300,
              // Whether to enable incremental mode
              //randomize: true,
              // Type of layout animation. The option set is {'during', 'end', false}
              animate: false,
              fit: false,
              // For enabling tiling
              tile: true,

              hideEdgesOnViewport: true,
              hideLabelsOnViewport: true,
              // interpolate on high density displays instead of increasing resolution
              pixelRatio: 1,
              // a motion blur effect that increases perceived performance for little or no cost
              motionBlur: true,
              nodeDimensionsIncludeLabels: true,
              nodeRepulsion: 20000,
              nodeOverlap: 300,
              // separation amount between nodes
              nodeSeparation: 300,
              // Nesting factor (multiplier) to compute ideal edge length for nested edges
              nestingFactor: 0.1,
              // Gravity force (constant)
              gravity: 0.1,

            };

            var coseBilkentOptions = {
              stop: function () {
                cy.removeAllListeners();
                launchPostProcess();
              },
              name: layoutStyle,
              // number of ticks per frame; higher is faster but more jerky
              //refresh: 300,
              // Whether to enable incremental mode
              //randomize: true,
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

            switch (layoutStyle) {
              case "fcose":
                cy.layout(fcoseOptions).run();
                break;
              case "cose-bilkent":
                cy.layout(coseBilkentOptions).run();
                break;


              case "spread":
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
                  fit: false
                }).run();

                break;

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
            if (document.getElementById('node_list') == undefined){
            // Create a Datalist for the search nodes
            var nodeListDataList = document.createElement("datalist");
            nodeListDataList.setAttribute("id", "node_list");
            document.body.appendChild(nodeListDataList);

            // Add nodes to list
            var list = document.getElementById('node_list');
            nodesUnique.forEach(function (node) {
              var option = document.createElement('option');
              option.value = node;
              list.appendChild(option);
            });

            // Create a list element
            var menuDataList = document.createElement("datalist");
            menuDataList.setAttribute("id", "menu_list");
            document.body.appendChild(menuDataList);

            // Add Menu Items
            menu_list_items = ['Delete Highlighted Items', 'Delete Non-Highlighted Items', 'Refresh', 'Clear Formatting', 'Save State', 'Remove Nodes by Count'];
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
              selector: 'node, edge',
              commands: [
                {
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
                }

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
                    /*
                    $(myModal.$el).on("hide", function() {
                    })*/
                    myModal.body
                      .append($('<p>Use the search menu to find and zoom into a node.</p>'));

                    myModal.body
                      .append($('<input>').attr({
                        'name': 'node_search',
                        'id': 'node_search',
                        'type': 'text',
                        'list': 'node_list',
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
                    /*
                    $(myModal.$el).on("hide", function() {
                    })*/
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

          cy.on('dblclick', function(e){
            debugger;
            this.drilldownToCategory('_raw', 'test',e);
          }.bind(this));

          // End - Add Menu for nodes and background


          function searchNodes(ele) {
            document.getElementById("node_search").value;
            var node_value = document.getElementById("node_search").value;
            if (nodesByName[node_value]) {
              node_id = "#" + nodesByName[node_value].id;
              // Set the zoom level
              cy.zoom(1);
              // Center on the node
              cy.center(node_id);
              // Adjust view to ensure that the node is ~ centre
              cy.$(node_id).flashClass('nodehighlighted', 2500);

            }
            // Delete the search box
            var element = document.getElementById('node_search');
            element.parentNode.removeChild(element);
            var data_node_list = document.getElementById("node_list");
            data_node_list.remove(data_node_list);

          }

          // Begin - Path Highlighting Function

          function highlightNextEle(start_id, end_id) {
            console.log(directedGlobal);
            // debugger;
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
                /*
                $(myModal.$el).on("hide", function() {
                })*/
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
                          // debugger;
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
                    // debugger;
                    cy.remove(removeNodesByCount);
                  } else(
                    console.log("Error not a number")
                  )

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

          function displayMessage(time, message) {
            let popper2 = cy.popper({
              content: () => {
                // Create an input box
                var x = document.createElement("p");
                x.setAttribute("name", "message_box");
                x.textContent("test");
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


        },


        // Search data params
        getInitialDataParams: function () {
          return ({
            outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
            count: 10000
          });
        },

        drilldownToCategory: function(categoryName, categoryFieldValue, browserEvent) {
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