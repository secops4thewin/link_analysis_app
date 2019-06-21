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
  'cytoscape-cxtmenu',
  'cytoscape-fcose',
  'cytoscape-dagre',
  'cytoscape-klay',
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
  klay,
  dagre,
  fcose,
  coseBilkent,
  d3,
  vizUtils
) {
  // Register Bilkent
  coseBilkent(cytoscape);

  // Load menu extension
  cxtmenu(cytoscape);

  fcose( cytoscape );
  dagre( cytoscape );
  klay( cytoscape );

  return SplunkVisualizationBase.extend({

    initialize: function () {
      SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
      this.$el = $(this.el);

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
      var layoutStyle = config[this.getPropertyNamespaceInfo().propertyNamespace + 'layoutStyle'] || 'cose-bilkent';

      // Whether to fit the viewport or not
      var viewport = config[this.getPropertyNamespaceInfo().propertyNamespace + 'viewport'] || 'true';

      var disableImages = config[this.getPropertyNamespaceInfo().propertyNamespace + 'disableImages'] || 'true';
      var disableImages = (disableImages == "true");   //returns true

      // Define whether path finding is directed, only match from source to dest 
      var directedPathFind = config[this.getPropertyNamespaceInfo().propertyNamespace + 'directed'] || "false";
      
      // Convert directedPathFind String to Boolean
      var directedPathFind = (directedPathFind == "true");   //returns true

      var pathAlgo = config[this.getPropertyNamespaceInfo().propertyNamespace + 'pathAlgo'] || 'dijkstra';

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

      // Create variable for line style
      var line_style = {};

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
      
      /*
      Visualisation Default Options Begin

      */

     var coseBilkentOptions = {
      // Called on `layoutready`
      ready: function () {
        cy.resize();
      },
      // Called on `layoutstop`
      stop: function () {
      },
      name: layoutStyle,
      // number of ticks per frame; higher is faster but more jerky
      refresh: 100,
      // Whether to enable incremental mode
      randomize: true,
      // Type of layout animation. The option set is {'during', 'end', false}
      animate: false,

      hideEdgesOnViewport: true,
      hideLabelsOnViewport: true,
      // interpolate on high density displays instead of increasing resolution
      pixelRatio: 1,
      // a motion blur effect that increases perceived performance for little or no cost
      motionBlur: true,
    };
      /*
      
      Visualisation Default Options End

      */


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
        // Set x to 0 so the line numbers match up.
        x = 0;
        data.fields.forEach(function (column) {
          var str = String(column.name);
          if (str.match(pattern)) {
            columns.push(x);
          }

          else if (str == "line_label"){
            line_style['line_label'] =  x;
          }
          else if (str == "line_color" || str == "line_colour"){
            line_style['line_color'] =  x;
          }
          x++;
        });
        
      // If there are header fields with node then push the nodes to the group_list array
      if (columns.length >0){
        // For each row in the data push the value of the each column into the group_list array.
        datum.forEach(function (link) {
          var z = 1;
          for (i = 0; i < columns.length; i++) {
            var node_row = Number(columns[i]);
            nodesArray.push(link[node_row]);
          }
        });
      }
      // If there are no header fields with node then push the nodes to the group_list array
      else{
         //For each row in the data push the value of the first and second column into the group_list array.  
         datum.forEach(function(link) {
          // Create a list of nodes and add to array
          nodesArray.push(link[0]);
          nodesArray.push(link[1]);
       });
      }

        // Create a unique list of nodes
        const unique = (value, index, self) => {
          return self.indexOf(value) === index;
        }
        nodesUnique = nodesArray.filter(unique);

        // Create an incrementer variable for node id
        var n = 0;
        
        // Create Array for nodes and edges
        node_arr = [];
        edge_arr = [];
        
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


        // If there are header fields with node then push to the link array
        if (columns.length >0){
          // For each link in links create a node and push a 0 value group id.
          datum.forEach(function (link) {

            var z = 1;
            // While i is less than the total amount of columns (count of nodeXX field)
            for (i = 0; z < columns.length; i++) {
              // For the total column length pick 2 columns at a time to push to the linksArray array.
              node_source = Number(columns[i]);
              node_target = Number(columns[z]);

              // Create a link object to push the target and source to the linksArray array.
              target_out = nodesByName[link[node_target]];
              source_out = nodesByName[link[node_source]];

         // Add item to group.  Label must be empty for this
         cy.add({
          data: {
            source: source_out,
            target: target_out,
            label: ""
          }
        });

              // Increment the counter
              z++;
            }
          });
        }
          // If there are no header fields with node then push to the link array
        else {
          // If there is only 3 columns that do not have the title 'nodeXX' 
          datum.forEach(function (link) {
            // Add nodes to list
            source_out = nodesByName[link[0]]
            target_out = nodesByName[link[1]]
            debugger;
            line_label = line_style['line_label'] || ""
            line_color = line_style['line_color'] || ""
            // If the link[line_label] field returns a valid result then return the correct information else return an empty string
            label = link[line_label] || ""
            // If the link[line_label] field returns a valid result then return the correct information else return an empty string
            color = link[line_color] || "#808080"
            // Add Group
            cy.add({
              data: {
                source: source_out,
                target: target_out,
                label: label,
                color: color
              }
            });

          });
      }

        // Cytoscape Styling     
        cy.style()
          .selector('edge')
          .style({
            'width': 3,
            'edge-text-rotation': 'autorotate',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'line-color': 'data(color)',
            'control-point-distance': '30px',
            'control-point-step-size': 40,
            'control-point-weight': '0.5', // '0': curve towards source node, '1': towards target node.
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

        if (disableImages == false){
          cy.style()
          .selector('node')
          .style({
            'background-image': 'data(background)',
            'background-fit': 'contain'
          }).update();
        }

        else if (disableImages == true){
          cy.style()
          .selector('node')
          .style({
            'background-color': '#90FF33'
          }).update();
        }
        
        switch(layoutStyle){
          case "cose-bilkent":
          cy.layout(coseBilkentOptions).run();
          break
          
          default:
            cy.layout({
            name: layoutStyle,
            // Performance Options
            fit: false, // whether to fit the viewport to the graph
            hideEdgesOnViewport: true,
            hideLabelsOnViewport: true,
            // interpolate on high density displays instead of increasing resolution
            pixelRatio: 1,
            // a motion blur effect that increases perceived performance for little or no cost
            motionBlur: true,
          }).run();
          
        }

        // End CSV Load
      });

      // Finally  fit to viewport
      cy.fit()

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
            content: 'PlaceholderN',
            select: function (ele) {
            },
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

      // Begin Helper Function Sections

      // Begin - Single Path Highlighting Function

      var highlightNextEle = function (start_id, end_id) {
        // Highlight Elements
        startid_hash = "#" + start_id
        endid_hash = "#" + end_id

        switch(pathAlgo) {
          case "dijkstra":
            // code block
            var dijkstra = cy.elements().dijkstra(startid_hash, function (eles) {
              return 1
            }, directedPathFind);
            var djs = dijkstra.pathTo(endid_hash);
    
            for (var x = 0; x < djs.length; x++) {
              var el = djs[x];
              el.addClass('highlighted');
            }
            break;

          case "aStar":
            // code block
            var aStar = cy.elements().aStar({ root: startid_hash, goal: endid_hash, directed: directedPathFind });
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
            var bellmanFord = cy.elements().bellmanFord({ root: startid_hash, directed: directedPathFind });
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
            }, directedPathFind);
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
        var bfs = cy.elements().bfs(start_node,1,false);
          for (var x = 0; x < bfs.path.length; x++) {
            var el = bfs.path[x];
            el.addClass('highlighted');
          }
      
  }
      // End Higlight All Nodes between path.

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