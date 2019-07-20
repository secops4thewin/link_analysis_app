  /*
  * Visualization source

  SANKEY Diagram - Used filtering functions
  Unique List - https://medium.com/front-end-weekly/getting-unique-values-in-javascript-arrays-17063080f836
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
    popper,
    klay,
    dagre,
    fcose,
    d3,
    vizUtils
  ) {

    // Load menu extension
    cxtmenu(cytoscape);
    fcose(cytoscape);
    dagre(cytoscape);
    popper(cytoscape);
    klay(cytoscape);

    var preFilter;
    var directedGlobal;
    var pathAlgoGlobal;

    return SplunkVisualizationBase.extend({

        initialize: function () {
          SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
          this.$el = $(this.el);

          /*if (SplunkVisualizationUtils.getCurrentTheme && SplunkVisualizationUtils.getCurrentTheme() === 'dark'){
            this.$el.addClass('dark');
          }
          */
          // Initialization logic goes here

        },


        _getEscapedProperty: function (name, config) {
          var propertyValue = config[this.getPropertyNamespaceInfo().propertyNamespace + name];
          return SplunkVisualizationUtils.escapeHtml(propertyValue);
        },

        _getConfigParams: function (config) {
          changedConfig = Object.keys(config)[0];
          // If there is only one configuration change (This happens after the first click of formatter menu)
          if (Object.keys(config).length == 1){
          switch (changedConfig) {
            case "display.visualizations.custom.link_analysis_app.link_analysis.layoutStyle":
                this.layoutStyle = this._getEscapedProperty('layoutStyle', config);
              break;

            case "display.visualizations.custom.link_analysis_app.link_analysis.pathAlgo":
                this.pathAlgo = this._getEscapedProperty('pathAlgo', config);
              break;

            case "display.visualizations.custom.link_analysis_app.link_analysis.disableImages":
                this.disableImages = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('disableImages', config));
              break;

            case "display.visualizations.custom.link_analysis_app.link_analysis.directed":
                this.directed = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('directed', config));
              break;

            default:
                this.layoutStyle = this._getEscapedProperty('layoutStyle', config) || 'fcose';
                this.directed = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('directed', config), {
                  default: false
                });
                this.disableImages = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('disableImages', config), {
                  default: true
                });
                this.pathAlgo = this._getEscapedProperty('pathAlgo', config) || 'dijkstra';

              break;
          }
          return;
        }
        else{
          //debugger;
          this.layoutStyle = this._getEscapedProperty('layoutStyle', config) || 'fcose';
          this.directed = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('directed', config), {
            default: false
          });
          this.disableImages = SplunkVisualizationUtils.normalizeBoolean(this._getEscapedProperty('disableImages', config), {
            default: true
          });
          this.pathAlgo = this._getEscapedProperty('pathAlgo', config) || 'dijkstra';
          return;
        }
          
          
        },

        onConfigChange: function (configChanges, previousConfig) {
          // Get Configuration Data
          var disableImages_key = "display.visualizations.custom.link_analysis_app.link_analysis.disableImages";

            // if the previous config is the same as the configured menu item.  Do Nothing.  Handling first time opening the format menu
          if( Object.keys(previousConfig).length == 1 && previousConfig["display.visualizations.custom.drilldown"] == "all" && Object.keys(configChanges).length > 1){
            //this._getConfigParams(configChanges);
            return;
          }
          // if the previous config is the same as the configured menu item.  Do Nothing.  Handling first time opening the format menu
          else if (previousConfig["display.visualizations.custom.link_analysis_app.link_analysis.directed"] == this.directed.toString() &&
            previousConfig["display.visualizations.custom.link_analysis_app.link_analysis.pathAlgo"] == this.pathAlgo.toString() &&
            previousConfig["display.visualizations.custom.link_analysis_app.link_analysis.layoutStyle"] == this.layoutStyle.toString() &&
            previousConfig[disableImages_key] == undefined) {
            return;
          }
          else if (previousConfig[disableImages_key] == undefined){
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

              case "display.visualizations.custom.link_analysis_app.link_analysis.disableImages":
                  this.invalidateUpdateView();
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
        stringIcon = {};
        regexIcon = {};
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

        $.ajax({
          url: "/static/app/link_analysis_app/icons.csv",
          type: 'get',
          dataType: "text",
          async: false,
          success: function (data) {
            var csvSplit = data.split('\n');
            for (var x = 1; x < csvSplit.length; x++) {
              var searchType = csvSplit[x].split(',')[0];
              var fieldValue = csvSplit[x].split(',')[1];
              var icon = csvSplit[x].split(',')[2];
              if (searchType == "string") {
                // If the pattern is a string search
                stringIcon[fieldValue] = icon;

              } else if (searchType == "regex") {
                // If the pattern is a regex pattern
                regexIcon[x] = {
                  "fieldValue": fieldValue,
                  "icon": icon
                }
              }
            }
          },
          error: function (jqXHR) {
            console.log(jqXHR);
          }
        })

        this.stringIcon = stringIcon;
        this.regexIcon = regexIcon;
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

        // String Icon Dictionary
        var stringIcon = this.stringIcon;

        // String Icon Dictionary
        var regexIcon = this.regexIcon;

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
          if (datum.length < 1000) {
            nodeIcon = searchIcon(node);
          } else {
            nodeIcon = ""
          }
          cy.add({
            data: {
              id: node_id,
              background: nodeIcon,
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

          if (format_info['line_label']) {
            line_label_num = format_info['line_label']
            node_data.data.label = link[line_label_num]
          }
          node_data.data.color = format_info['line_color'] ? node_data.data.color = link[format_info['line_color']] : "#808080"

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
            'control-point-distance': '30px',
            'control-point-step-size': 40,
            'control-point-weight': '0.5', // '0': curve towards source node, '1': towards target node.

          })
        cy.style()
          .selector('core')
          .style({
            'active-bg-color': '#555',
          })

        if (format_info.line_label) {
          cy.style()
            .selector('edge')
            .style({
              'label': 'data(label)'
            })
        }
        if (format_info.line_color) {
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


        // Highlighted Class
        if (this.disableImages == false) {
          cy.style()
            .selector('node')
            .style({
              'background-image': 'data(background)',
              'background-fit': 'contain'
            }).update();
        }

        runLayout(this.layoutStyle)

        // End Styling


        function runLayout(layoutStyle) {

          // If Prefilter has been configured
          if (preFilter) {
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


          var fcoseOptions = {
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
            fit: true,

            hideEdgesOnViewport: true,
            hideLabelsOnViewport: true,
            // interpolate on high density displays instead of increasing resolution
            pixelRatio: 1,
            // a motion blur effect that increases perceived performance for little or no cost
            motionBlur: true
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
            fit: true,

            hideEdgesOnViewport: true,
            hideLabelsOnViewport: true,
            // interpolate on high density displays instead of increasing resolution
            pixelRatio: 1,
            // a motion blur effect that increases perceived performance for little or no cost
            motionBlur: true
          };

          switch (layoutStyle) {
            case "fcose":
              cy.layout(fcoseOptions).run();
              break;
            case "cose-bilkent":
              cy.layout(coseBilkentOptions).run();
              break;

            default:
              cy.layout({
                stop: function () {
                  cy.removeAllListeners();
                  launchPostProcess();
                  cy.on('tap', function (event) {
                    // target holds a reference to the originator
                    // of the event (core or element)
                    var evtTarget = event.target;
                  });
                },
                name: layoutStyle,
                nodeDimensionsIncludeLabels: true,
                // Performance Options
                hideEdgesOnViewport: true,
                hideLabelsOnViewport: true,
                // interpolate on high density displays instead of increasing resolution
                pixelRatio: 1,
                // a motion blur effect that increases perceived performance for little or no cost
                motionBlur: true
              }).run();
              break;
          }
        }

        function launchPostProcess() {
          let boxedNodes = cy.collection();

          // Add box highlight function
          cy.on('box', function (e) {
            let node = e.target;
            boxedNodes = boxedNodes.union(node);
            boxedNodes.addClass('highlighted');
          });

          // Begin - Add Menu for nodes and background
          cy.cxtmenu({
            selector: 'node, edge',
            commands: [{
                content: 'Placeholder',
                select: function (ele) {},
                enabled: false
              },
              {
                content: 'PlaceholderN',
                select: function (ele) {},
                enabled: true

              },
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
                content: "Highlight All Paths",
                select: function (ele) {
                  start = ele.id();
                  highlightAllPathsFrom(start);
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
                content: 'Delete Highlighted Items',
                select: function (ele) {
                  cy.remove(boxedNodes);
                  var element_del = cy.elements(cy.$('.highlighted'));
                  // Remove elements
                  cy.remove(element_del);

                },
              },
              {
                content: 'Delete Non Highlighted Nodes',
                select: function (ele) {
                  // Select all elements that are not highligted
                  var element_del = cy.elements().not(cy.$('.highlighted'));
                  // Remove elements
                  cy.remove(element_del);
                },
              },
              {
                content: 'Refresh',
                select: function () {
                  runLayout(layoutStyle_global);
                },
              },
              {
                content: 'Search',
                select: function (ele) {
                  // create a basic popper on the core
                  let popper2 = cy.popper({
                    content: () => {
                      // Create an input box
                      var x = document.createElement("input");
                      x.setAttribute("name", "node_search");
                      x.setAttribute("id", "node_search");
                      x.setAttribute("type", "text");
                      x.setAttribute("list", "node_list");
                      x.setAttribute("style", "z-index:9999")
                      x.addEventListener("keydown", function (e) {
                        if (!e) {
                          var e = window.event;
                        }
                        // Enter is pressed
                        if (e.keyCode == 13) {
                          e.preventDefault(); // sometimes useful
                          searchNodes();
                        }
                      }, false);;
                      document.body.appendChild(x);

                      // Create a list element
                      var y = document.createElement("datalist");
                      y.setAttribute("id", "node_list");
                      document.body.appendChild(y);

                      // Add nodes to list
                      var list = document.getElementById('node_list');
                      nodesUnique.forEach(function (node) {
                        var option = document.createElement('option');
                        option.value = node;
                        list.appendChild(option);
                      });
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

            ]
          });

          // Set Min Zoom / Max Zoom
          cy.minZoom(0.16);
          cy.maxZoom(1.5);
          cy.fit()

        }

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
          count: 3000
        });
      },

      // Override to respond to re-sizing events
      reflow: function () {}
    });
  });