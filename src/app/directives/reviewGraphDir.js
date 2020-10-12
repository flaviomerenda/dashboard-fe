/*
    ## D3 Review Graph Directive used to render the graph defined in reviewGraph.js.

    we use a directive capable of manipulating the DOM, so we rely on
    the angularjs `link` function to have access to both the Angular
    `scope` object and the specific DOM `element` to which this
    directive is bound.

    Note: 
        This is the only file that uses the version 5 of the d3 library (d3v5).
        The d3v5 library has been updated from v5.7.0 up to v5.16.0.

    TODO: resize -> rend from scratch
    TODO: convert this to a component? https://docs.angularjs.org/guide/component 

    see: https://docs.angularjs.org/guide/directive
*/

define(
    ['angular',
    'app',
    'underscore',
    'd3v5',
    'd3-force',
    ],

    function (angular, app, _, d3v5, d3force) {
        'use strict';

        var DEBUG = false; // DEBUG mode
        
        angular
        .module('kibana.controllers')
        .directive('reviewGraphDir', function (alertSrv, rgBuilder, rgProcessor) {

            /**
             * Adds SVG elements to the `element` for the nodes and
             * links of `graph`.  
             *
             * It creates the elements and asigns basic attributes
             * such as `id` and `class`. It's the caller's
             * responsibility to set further attributes about style
             * and transforms, which is easy by using the returned
             * selectors.
             *
             * @param graph: a UICredReviewGraph object
             * @return (Object) with links to all the main
             *   selectors created.
             */
            function createElementSelectors(currEl, graph) {
                let width = currEl.clientWidth;
                let height = currEl.clientHeight;

                // define the DOM structure using D3 selectors
                // see https://github.com/d3/d3-selection
                let svg = d3v5.select(currEl).append("svg")
                    .attr("id", "svg_" + graph.id)
                    .attr("class", "review-graph-svg")
                    .attr("width", width)
                    .attr("height", height)

                let container = svg.append("g")
                    .attr("class", "review-graph-container")
                    .attr("id", "container_" + graph.id);

                let linkGroup = container.append("g")
                    .attr("class", "links")
                    .attr("id", "linkGroup_" + graph.id);
                    
                let link = linkGroup
                    .selectAll("polyline") // return group selection
                    .data(graph.links) // bind items to each selected element
                    .join("polyline"); // add a polyline element for each link
                
                let linkTitle = link.append("title") // displayed as tooltip
                    .text(d => d.rel);
                    
                let nodeGroup = container.append("g")
                    .attr("class", "nodes")
                    .attr("id", "nodeGroup_" + graph.id);
                let node = nodeGroup
                    .selectAll("circle")
                    .data(graph.nodes)
                    .join("g")
                let nodeTitle = node.append("title")
                    .text(rgBuilder.itemToTooltipText);
                let nodeUse = node.append("use");
                return {
                    svg: svg,
                    container: container,
                    linkGroup: linkGroup,
                    link: link,
                    linkTitle: linkTitle,
                    nodeGroup: nodeGroup,
                    node: node,
                    nodeTitle: nodeTitle,
                    nodeUse: nodeUse
                }
            }

            /**
             * Modify elements by setting style-related attributes
             * based on their associated data values.
             */
            function setElementStyleAttributes(d3Selectors, graph) {
                let gNodeMapper = rgProcessor.nodeMapper(graph);

                const colorScale = d3v5.scaleOrdinal(d3v5.schemeCategory10);
                /** 
                 * Calculates a color for a node based on its group
                 * and hierarchyLevel.
                 * 
                 * @param d a node in a UICredReviewGraph
                 */
                function colorByGroupAndHLevel(d) {
                    return colorScale(d.group + (d.hierarchyLevel || 0));
                }
                
                d3Selectors.link
                    /*.attr("id", d => {
                        // note UICredReviewGraph link source and target are objects,
                        // not strings like the standard acred graph
                        let source = d.source.index
                        let target = d.target.index
                        return "link_" + source + "_" + target;
                    })*/
                    .attr("stroke-width", d => Math.max(1, Math.sqrt(d.value)))
                    .attr("stroke", "#999")
                    .attr("stroke-opacity", d => d.opacity || 0.6)
                    .attr("fill", d => "none")
                    .attr("stroke-dasharray", d => {
                        let rel = d.rel;
                        if (rel == "itemReviewed") {
                            return "2 1";
                        } else {
                            return null;
                        }
                    })
                    .attr("marker-mid", d => "url(#arrow)");
                d3Selectors.nodeUse
                    .attr("xlink:href", gNodeMapper.calcSymbolId)
                    .attr("transform", gNodeMapper.calcNodeTransform(null))
                    .attr("style", d => "opacity:" + (d.opacity || 0.8));
                d3Selectors.node //.attr("id", d => "node_" + d.id)
                    .attr("stroke", colorByGroupAndHLevel)
                    .attr("fill", colorByGroupAndHLevel)
                    .attr("stroke-width", 1.5)
            }

            function createSimulationPositionalForces(currEl, graph) {
                // assign force to a specific list of nodes
                function isolate_force(force, nodes) {
                    let init = force.initialize;
                    force.initialize = function() { 
                        init.call(force, nodes); 
                    };
                    return force;
                }

                // assign a simulation force depending by the node hierarchy level on the horizontal axis
                let yForces = [graph.maxHLevel] //FIXME: only uses maxHLevel?
                    .map( hLevel => {
                        let targetY = hLevel * currEl.clientHeight / (1 + graph.maxHLevel)
                        let hLevelFilter = n => n.hierarchyLevel == hLevel;
                        let targetNodes = graph.nodes.filter(hLevelFilter);
                        return ["hierarchy_y_" + hLevel,
                                isolate_force(d3v5.forceY(targetY), targetNodes)]
                    });
                return new Map(yForces);
            }

            /**
             * Creates simulation forces for the graph to be displayed inside a currEl
             *
             * @param currEl html Element where the graph should be
             *   displayed, forces should aim to fit inside the
             *   boundaries of this element
             * @param graph UICredReviewGraph 
             * @returns Map of force names to force objects
             * @see https://github.com/d3/d3-force#forces
             */
            function createSimulationForces(currEl, graph) {
                /** all nodes repulse each other  */
                let charge = d3force.forceManyBody().strength(-400); // TODO: transfer -400 value to a config file

                // applies the force to the source and target node of each link.
                let link_force = d3force.forceLink(graph.links)
                    .id(d => d.id) // refer to nodes via id field, https://github.com/d3/d3-force#link_id
                    .distance(rgProcessor.linkMapper(graph).calcLinkDistance); // let distance depend on...?


                /** Center mass of all nodes should be close to the center of the view */
                let center = d3force.forceCenter(currEl.clientWidth / 2, currEl.clientHeight / 2);

                let positionalForces = createSimulationPositionalForces(currEl, graph);
                
                return new Map([
                    ['charge', charge],
                    ['center', center],
                    ['links', link_force],
                    ...positionalForces
                ])
            }

            /**
             * Creates a Simulation for the graph nodes
             *
             * @see https://github.com/d3/d3-force#simulation
             */
            function createSimulation(currEl, graph) {
                let simulation = d3force.forceSimulation(graph.nodes);
                return simulation;
            }
            
            let link = function(scope, element) {

                // Receive and handle render events
                scope.$on('render', function () {
                    render_panel(scope.wholeGraph);
                });

                let width = element[0].clientWidth;
                let height = element[0].clientHeight;
                
                // Function for rendering panel
                function render_panel(graph) {
                    // the graph should be a UICredReviewGraph as produce by the rgProcessor

                    //first, let's reuse search and mapping functions 
                    let gSearch = rgProcessor.search(graph);
                    let gNodeMapper = rgProcessor.nodeMapper(graph);

                    // get nodes and links
                    let nodes = graph.nodes; 
                    let links = graph.links; 

                    // Create svg element tree for the graph and return selectors
                    let d3Selectors = createElementSelectors(element[0], graph);

                    // add attributes to all link elements as given by the link group selector
                    setElementStyleAttributes(d3Selectors, graph);
                    
                    console.log("Defining forceSimulation")
                    let simulation = createSimulation(element[0], graph);
                    let simForces = createSimulationForces(element[0], graph);
                    simForces.forEach((force, name) => simulation.force(name, force));


                    // the rest is event handling and setting of initial state?
                    



                    var handleNeighbhd = function(neighbhdNodes, neighbhLinks, alfa=0.2) {
                        neighbhdNodes.filter(n => n.opacityFilter).forEach(n => {
                            n.opacityFilter = false;
                            n.opacity = alfa;
                            n.neighbhdActivation = true;
                            n.enabledNode = true;
                        });
                        updateNodeIconOpacity(d3v5.select("#nodeGroup_" + graph.id).selectAll("use"));
                        neighbhLinks.filter(l => l.opacityFilter).forEach(l => {
                            l.opacityFilter = false;
                            l.opacity = alfa;
                            l.neighbhdActivation = true;
                            l.enabledNode = true;
                        });
                        updateLinkIconOpacity(d3v5.select("#linkGroup_" + graph.id).selectAll("polyline"));
                        // reset activation flag of each node
                        //neighbhdNodes.forEach(d=> d.enabledNode = true)
                        // reset the sidebar attributes
                        //var sidebarIcons = d3v5.selectAll("img")
                        //sidebarIcons.nodes().filter(d => d.id.includes('sideButton'))
                        // reset the buttons opacity
                        //sidebarIcons.attr("style", d => "opacity:" + "1")
                        // reset the state of the sidebar icons
                        //sidebarIcons.nodes().forEach(d => d.iconState = false)
                    }



                    // create usr feedback (review)
                    var getCoinformUserReviewSchema = () => {
                        return {
                            "context": "http://schema.org",
                            "type": "CoinformUserReview",
                            "url": "",
                            "author": {
                                "context": "http://coinform.eu",
                                "type": "CoinformUser",
                                "url": "",
                                "identifier": ""
                            },
                            "text": "",
                            "name": "string",
                            "supportingItem": [{
                                    "context": "http://schema.org",
                                    "type": "",
                                    "url": ""
                                }],
                            "reviewAspect": "accuracy",
                            "reviewRating": {
                                "context": "string",
                                "type": "CoinformAccuracyRating",
                                "ratingValue": "",
                                "reviewAspect": "accuracy"
                            },
                            "itemReviewed": {
                                "context": "http://schema.org",
                                "type": "",
                                "url": ""
                            },
                            "dateCreated": "",
                            "requestFactCheck": true
                        };
                    }

                    const coinformUrl = "http://coinform.eu/";
                    const coinformUsrPath = coinformUrl + "users";
                    const mockDevUser = "mock-dev-user";

                    var dateTime = () => {
                        return new Date().toISOString();
                    }

                    var mockUserUrl = () => {
                        return coinformUsrPath + "/" + mockDevUser
                    };

                    var accurateSupportingTextReview = () => {
                        return "The " + getCoinformUserReviewSchema().type + " is correct";
                    };

                    var inaccurateSupportingTextReview = () => {
                        return "The " + getCoinformUserReviewSchema().type + " is incorrect";
                    };

                    var itemReviewedType = (selectedReview) => {
                        return selectedReview['@type']
                    };

                    var itemReviewedUrl = (selectedReview) => {
                        var itemRev = gSearch.lookupObject(selectedReview, 'itemReviewed') || {};
                        if (itemRev.title) {
                            return "http://coinform.eu/" + itemReviewedType(selectedReview) + "?title=" + itemRev.title.replace(/ /g, '&');
                        }
                        else {
                            return "";
                        }
                    };

                    var createCoinformUserReview = (selectedReview, coinformUserReviewSchema) => {
                        coinformUserReviewSchema = getCoinformUserReviewSchema();
                        coinformUserReviewSchema.dateCreated = dateTime();
                        // TODO: changing with the current dashboard user information
                        coinformUserReviewSchema.author.url = mockUserUrl();
                        coinformUserReviewSchema.author.identifier = mockDevUser;
                        coinformUserReviewSchema.text = prompt("If you want, insert your review comment please:", "Write your comment here");
                        coinformUserReviewSchema.itemReviewed.context = "http://schema.org";
                        coinformUserReviewSchema.itemReviewed.type = itemReviewedType(selectedReview);
                        coinformUserReviewSchema.itemReviewed.url = itemReviewedUrl(selectedReview);
                        return coinformUserReviewSchema;
                    }

                    var mockPostReview = function() {
                        return alertSrv.set('Warning', 'This feature is not implemented yet');
                    }

                    scope.rateReviewAsAccurate = function (selectedReview) {
                        var accurateUserReview = createCoinformUserReview(selectedReview);
                        accurateUserReview.reviewRating.ratingValue = "accurate";
                        if (!accurateUserReview.text || 
                            accurateUserReview.text == null ||
                            accurateUserReview.text == "Write your comment here") {
                            accurateUserReview.text = accurateSupportingTextReview();
                        }
                        if (DEBUG) {
                            console.debug("User says review ", selectedReview, "is inaccurate");
                            console.debug("The user review feedback is: ", inaccurateUserReview);
                        };
                        mockPostReview();
                        // TODO: activate no-mock POST request
                        //postReview(accurateUserReview)
                    }

                    scope.rateReviewAsInaccurate = function (selectedReview) {
                        var inaccurateUserReview = createCoinformUserReview(selectedReview);
                        inaccurateUserReview.reviewRating.ratingValue = "inaccurate";
                        if (!inaccurateUserReview.text || 
                            inaccurateUserReview.text == null ||
                            inaccurateUserReview.text == "Write your comment here") {
                            inaccurateUserReview.text = inaccurateSupportingTextReview();
                        }
                        if (DEBUG) {
                            console.debug("User says review ", selectedReview, "is inaccurate");
                            console.debug("The user review feedback is: ", inaccurateUserReview);
                        };
                        mockPostReview();
                        // TODO: activate no-mock POST request
                        //postReview(inaccurateUserReview)
                    }

                    

                    // these functions allow to move the pointer to an object, 
                    // press and hold to grab it and “drag” the object to a new location
                    var drag = function(simulation) {
                        function dragstarted(d) {
                            if (d3v5.event.active) return;
                            simulation.alphaTarget(0.3).restart();
                            d.fx = d.x;
                            d.fy = d.y;
                        }
                        function dragged(d) {
                            d.fx = d3v5.event.x;
                            d.fy = d3v5.event.y;
                        }
                        function dragended(d) {
                            if (d3v5.event.active) return;
                            simulation.alphaTarget(0);
                            d.fx = null;
                            d.fy = null;
                        }
                        return d3v5.drag()
                            .on("start", dragstarted)
                            .on("drag", dragged)
                            .on("end", dragended);
                    }

                    console.log("Adding node svg elts");

                    var clickedNode = function(d) {
                        scope.$emit('selectNode', d);
                    }

                    d3Selectors.nodeUse.on("click", d => {
                        if (DEBUG) {console.debug("clicked on ", d)};
                        // d3Selectors.nodeUse.attr("transform", gNodeMapper.calcNodeTransform(d.id)) //recalculate transform for all nodes based on current selected nodeId?
                        if (scope.prunedGraphActivation) {
                            let targetNodes = gSearch.findNeighbhd(d)
                            let outLinks = gSearch.outLinks(d)
                            handleNeighbhd(targetNodes, outLinks)
                        }
                        scope.$apply(function() { 
                            clickedNode(d);
                        });
                    });
                    

                    d3Selectors.node.call(drag(simulation));
                        
                    console.log("Setting node titles");
                                
                    console.log("Register tick event handlers");
                    simulation.on("tick", () => {
                        d3Selectors.link
                            .attr("points", d => {
                                var src = d.source.x + "," + d.source.y;
                                var tgt = d.target.x + "," + d.target.y;
                                
                                var midx = d.source.x + (d.target.x - d.source.x) * 0.8;
                                var midy = d.source.y + (d.target.y - d.source.y) * 0.8;
                                var mid = midx + "," + midy;
                                
                                return src + " " + mid + " " + tgt;
                            });
                        
                        d3Selectors.node
                            .attr("x", d => d.x)
                            .attr("y", d => d.y)
                            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
                    });


                    var activeArrows = function(active) {
                        var linkGroup = d3v5.select("#linkGroup_" + graph.id);
                        if (active) {
                            linkGroup.selectAll(".link-active").attr("marker-mid", l => {
                                if (l.opacity > 0) {
                                    return "url(#arrow-active)"
                                }
                            });
                        }
                        else {
                            linkGroup.selectAll("polyline").attr("marker-mid", l => {
                                if (l.opacity > 0) {
                                    return "url(#arrow)"
                                }
                            });
                        }
                    }

                    var linkedByIndex = {};
                    links.forEach(function(d) {
                        linkedByIndex[d.source.index + "," + d.target.index] = 1;
                    });

                    var isConnected = function (a, b) {
                        return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index];
                    }
                    
                    d3Selectors.node.on("mouseover", function(d) {
                        d3Selectors.node.classed("node-active", function(o) {
                            var thisOpacity = isConnected(d, o) ? true : false;
                            this.setAttribute('fill-opacity', thisOpacity);
                            return thisOpacity;
                        });
                        d3Selectors.link.classed("link-active", function(o) {
                            return o.source === d || o.target === d ? true : false;
                        });
                        var active = true;
                        activeArrows(active)
                        d3v5.select(this).classed("node-active", true);
                    })

                    d3Selectors.node.on("mouseout", function(d) {
                        d3Selectors.node.classed("node-active", false);
                        d3Selectors.link.classed("link-active", false);
                        activeArrows()
                    });

                    var updateNodeIconOpacity = function (nodeGroup) {
                        nodeGroup.attr("style", d => "opacity:" + d.opacity)
                    }
                        
                    var updateLinkIconOpacity = function (linkGroup) {
                        linkGroup
                            .attr("stroke-opacity", l => l.opacity)
                            .attr("marker-mid", d => {
                                if (d.opacity == 0) {
                                    return ""
                                }
                                else {
                                    return "url(#arrow)"
                                }
                            });
                    }

                    var handleNodeActivation = function(nodeGroup, criticalPath=false, alfa=0.2) {
                        nodeGroup.forEach(n => {
                            var np = n; //Object.getPrototypeOf(n);
                            // handle neighbhd nodes
                            if ((np.neighbhdActivation == true) && (criticalPath)) {
                                np.opacityFilter = true;
                                var originalOpacity = alfa;
                            } 
                            else {
                                originalOpacity = np.originalOpacity
                            }
                            var nodeActive = np.opacityFilter ? false : true;
                            var newNodeOpacity = nodeActive ? 0 : originalOpacity;
                            // handle the sidebar actions
                            if (criticalPath == false) {
                                if ((np.neighbhdActivation == true) && (np.enabledNode == false) && (np.opacityFilter == false)) {
                                    newNodeOpacity = 0;
                                    // Update node opacity
                                    np.opacity = newNodeOpacity;
                                    // Update node flag activation
                                    np.opacityFilter = nodeActive;
                                    }
                                else if ((np.neighbhdActivation == true) && (np.enabledNode == false) && (np.opacityFilter == true)) {
                                    newNodeOpacity = alfa;
                                    // Update node opacity
                                    np.opacity = newNodeOpacity;
                                    // Update node flag activation
                                    np.opacityFilter = nodeActive;
                                }
                                if (np.enabledNode == true) {
                                    if ((np.neighbhdActivation == true) && (np.opacityFilter == true)) {
                                        newNodeOpacity = alfa;
                                    }
                                    // Update node opacity
                                    np.opacity = newNodeOpacity;
                                    // Update node flag activation
                                    np.opacityFilter = nodeActive;
                                }
                            }
                            else {
                                // Update node opacity
                                np.opacity = newNodeOpacity;
                                // Update node flag activation
                                np.opacityFilter = nodeActive;
                            }
                        });
                        // Hide/show selected nodes icons
                        updateNodeIconOpacity(d3v5.select("#nodeGroup_" + graph.id).selectAll("use"));
                    }
                        
                    var handleLinkActivation = function(nodeGroup, alfa=0.2) {
                        // Hide/show related links
                        // Filter links related to selected nodes
                        var linkGroup = links.filter(l =>
                                                     nodeGroup.map(n => n.index).includes(l.source.index) || 
                                                     nodeGroup.map(n => n.index).includes(l.target.index)
                                                    );
                        // Isolate target nodes
                        var targetNodes = nodes.filter(nod => linkGroup.map(l => 
                                                                            l.target.index).includes(nod.index));
                        // Isolate source nodes                     
                        var sourceNodes = nodes.filter(nod => linkGroup.map(l => 
                                                                            l.source.index).includes(nod.index));

                        linkGroup.map(l => {
                            var lp = l; //Object.getPrototypeOf(l);
                            // handle neighbhd links
                            if (lp.neighbhdActivation == true) {
                                lp.opacityFilter = true;
                                originalOpacity = alfa;
                            } 
                            else {
                                var originalOpacity = lp.originalOpacity
                            }
                            // Determine if current link is visible
                            var linkActive = lp.opacityFilter ? false : true;
                            if (linkActive) {
                                var newLinkOpacity = 0;
                            }
                            else {                            
                                var targetNodeOpacity = targetNodes.filter(n => 
                                                                           (n.index == l.target.index) && ((n.opacityFilter 
                                                                                                            ? n.opacityFilter : false) == false));
                                var sourceNodeOpacity = sourceNodes.filter(n => 
                                                                           (n.index == l.source.index) && ((n.opacityFilter 
                                                                                                            ? n.opacityFilter : false) == false));
                                if ((targetNodeOpacity.length) && (sourceNodeOpacity.length)) {
                                    newLinkOpacity = originalOpacity;
                                }
                                else {
                                    newLinkOpacity = 0;
                                }
                            }
                            // Update link opacity
                            lp.opacity = newLinkOpacity
                            // Update link flag activation
                            lp.opacityFilter = linkActive;
                        });
                        // Hide/show selected nodes icons
                        updateLinkIconOpacity(d3v5.select("#linkGroup_" + graph.id).selectAll("polyline"));
                    }

                    scope.sidebarGraphEvent = function(nodeIconId){
                        // Sidebar actions
                        var iconType = nodeIconId.split(":")[0]
                        var iconId = nodeIconId.split(":")[1]
                        var sideIconId = iconType + "_sideButton_" + iconId;
                        // Hide/show the selected sidebar icon
                        // Store the original opacity of a sidebar button
                        var selectedIcon = d3v5.select("#" + sideIconId).node()
                        var currentIconOpacity = 1
                        // Define the current sidebar icon state
                        var iconState = selectedIcon.iconState ? false : true;
                        var newIconOpacity = iconState ? 0.3 : currentIconOpacity;
                        // Hide or show the elements
                        selectedIcon.style.opacity = newIconOpacity;
                        // Update the current icon opacity
                        selectedIcon.origIconOpacity = currentIconOpacity;
                        // Update the current icon state
                        selectedIcon.iconState = iconState;
                        // Filter nodes selected by type over the sidebar
                        var nodeGroup = nodes.filter(d => gNodeMapper.calcSymbol(d) == iconType);
                        // change the properties of each node corresponding to the selected type
                        // handle node activation in order to show/hide nodes 
                        handleNodeActivation(nodeGroup)
                        // handle link activation in order to show/hide links 
                        handleLinkActivation(nodeGroup)
                    };


                    // create a criticalPath click event
                    scope.clickCriticalPath = function() {
                        scope.manageCriticalPath = !scope.manageCriticalPath
                        //scope.hideSidebarWhenCriticalPath = !scope.hideSidebarWhenCriticalPath
                    }

                    var resetGraphAttributes = function() {
                        // reset attributes of each node (opacity, opacityFilter)
                        nodes.forEach(n => {
                            var np = n; //Object.getPrototypeOf(n);
                            (np.opacity = np.originalOpacity) && (np.opacityFilter = false);
                        });
                        updateNodeIconOpacity(d3v5.select("#nodeGroup_" + graph.id).selectAll("use"));
                        // reset attributes of each link (opacity, opacityFilter)
                        links.forEach(l => {
                            var lp = l; //Object.getPrototypeOf(l);
                            (lp.opacity = lp.originalOpacity) && (lp.opacityFilter = false);
                        });
                        updateLinkIconOpacity(d3v5.select("#linkGroup_" + graph.id).selectAll("polyline"));
                        // reset activation flag of each node
                        nodes.forEach(d=> d.enabledNode = true)
                        // reset the sidebar attributes
                        var sidebarIcons = d3v5.selectAll("img")
                        sidebarIcons.nodes().filter(d => d.id.includes('sideButton'))
                        // reset the buttons opacity
                        sidebarIcons.attr("style", d => "opacity:" + "1")
                        // reset the state of the sidebar icons
                        sidebarIcons.nodes().forEach(d => d.iconState = false)
                    }

                    var getGraphNodesToManage = function() {
                        var mainNode = (nodes.filter(n=> n.id == graph.mainNode)[0])
                        let criticalPath = gSearch.findCriticalPath(mainNode, 'isBasedOnKept')
                        return nodes.filter(n => !criticalPath.includes(n));
                    }

                    // manage the criticalPath activation
                    scope.$watch("manageCriticalPath", function(newVal) {
                        resetGraphAttributes()
                        var graphNodesToManage = getGraphNodesToManage()
                        if (newVal) {
                            graphNodesToManage.forEach(d=> d.enabledNode = false)
                            var criticalpath = true
                            handleNodeActivation(graphNodesToManage, criticalpath);
                            handleLinkActivation(graphNodesToManage);
                            scope.criticalPathButtonText = "Show discarded evidence"
                            scope.prunedGraphActivation = true
                        }
                        else {
                            scope.criticalPathButtonText = "Hide discarded evidence"
                            scope.prunedGraphActivation = false
                        }
                    });

                    scope.$watch("selectedNode", function(newVal, oldVal) {
                        let newId = (newVal) ? newVal.id : null;
                        d3Selectors.nodeUse.attr("transform", gNodeMapper.calcNodeTransform(newId))
                    });
                    
                    console.log("Register zoom handler")
                    var zoom = d3v5.zoom()
                        .scaleExtent([0.1, 4])
                        .on("zoom", function () {
                            d3Selectors.container.attr("transform", d3v5.event.transform);
                        });
                    
                    d3Selectors.svg.call(zoom);
                        
                    scope.zoomFit = function (paddingPercent, transitionDuration) {
                        var bounds = d3Selectors.container.node().getBBox();
                        var parent = d3Selectors.container.node().parentElement;
                        var fullWidth = parent.clientWidth,
                            fullHeight = parent.clientHeight;
                        var width = bounds.width,
                            height = bounds.height;
                        var midX = bounds.x + width / 2,
                            midY = bounds.y + height / 2;
                        if (width == 0 || height == 0) return; // nothing to fit
                            var scale = (paddingPercent || 0.85) / Math.max(width / fullWidth, height / fullHeight);
                        var translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
                        
                        if (DEBUG) {
                            console.trace("zoomFit", translate, scale)
                        };
                        
                        var transform = d3v5.zoomIdentity
                            .translate(translate[0], translate[1])
                            .scale(scale);
                        
                        d3Selectors.svg.transition()
                            .duration(transitionDuration || 0) // milliseconds
                            .call(zoom.transform, transform);
                    }
                    
                    //scope.selectMainReviewNode()

                    // this is the first needed click to show the criticalPath as default
                    scope.clickCriticalPath()
                }
            }

            
            return {
                restrict: 'A', // only match attribute name in html template
                link: link
            }
        });
    }
);
