/*
    ## D3 Review Graph Directive used to render the graph defined in reviewGraph.js.

    Note: 
        This is the only file that uses the version 5 of the d3 library (d3v5).
        The d3v5 library has been updated from v5.7.0 up to v5.16.0.

    TODO: resize -> rend from scratch
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
        .directive('reviewGraphDir', function (alertSrv, card, rgBuilder, rgProcessor) {
            return {
                restrict: 'A',
                link: function (scope, element) {

                    // Receive render events
                    scope.$on('render', function () {
                        render_panel(scope.wholeGraph);
                    });

                    // Function for rendering panel
                    function render_panel(graph) {
                
                        element.html("");

                        // get nodes and links
                        const nodes = graph.nodes.map(d => Object.create(d));
                        const links = graph.links.map(d => Object.create(d));

                        // get the current element where to add the graph
                        // get the height and width parent values
                        var currEl = element[0];
                        var width = currEl.parentNode.clientWidth;
                        var height = currEl.parentNode.clientHeight;

                        var svg = d3v5.select(currEl).append("svg")
                            .attr("id", "svg_" + graph.id)
                            .attr("class", "review-graph-svg")
                            .attr("width", width)
                            .attr("height", height)

                        var container = svg.append("g")
                            .attr("class", "review-graph-container")
                            .attr("id", "container_" + graph.id);

                        // applies the force to the source and target node of each link.
                        var link_force = d3force.forceLink(links)
                            .id(function (d) {
                                return d.id;
                                })
                            .distance(rgBuilder.calcLinkDistance); // let distance depend on the type of relation

                        console.log("Defining forceSimulation")

                        // these functions allow to move the pointer to an object, 
                        // press and hold to grab it and “drag” the object to a new location
                        var drag = function(simulation) {
                            function dragstarted(d) {
                                if (!d3v5.event.active) {
                                    simulation.alphaTarget(0.3).restart();
                                    d.fx = d.x;
                                    d.fy = d.y;
                                }
                            }
                            function dragged(d) {
                                d.fx = d3v5.event.x;
                                d.fy = d3v5.event.y;
                            }
                            function dragended(d) {
                                if (!d3v5.event.active) {
                                    simulation.alphaTarget(0);
                                    d.fx = null;
                                    d.fy = null;
                                }
                            }
                            return d3v5.drag()
                                .on("start", dragstarted)
                                .on("drag", dragged)
                                .on("end", dragended);
                        }

                        var simulation = d3force.forceSimulation()
                            // TODO: transfer -400 value to a config file
                            .force("charge_force", d3force.forceManyBody().strength(-400))
                            .force("center_force", d3force.forceCenter(width / 2, height / 2))
                            .nodes(nodes)
                            .force("links", link_force);

                        // filter the Hierarchy levels
                        let hLevels = nodes.filter(n => typeof n.hierarchyLevel == "number")
                            .map(n => n.hierarchyLevel || 0);
                        let maxHLevel = Math.max(...hLevels);
                        if (DEBUG) {console.debug("Max HLevel: ", maxHLevel, "of", hLevels)};

                        // assign a simulation force depending by the node hierarchy level on the horizontal axis
                        [...Array(maxHLevel).keys()].forEach(hLevel => {
                            let targetY = hLevel * height / (1 + maxHLevel)
                            let hLevelFilter = n => n.hierarchyLevel == hLevel;
                            simulation.force("hierarchy_y_" + hLevel, 
                            rgBuilder.isolate_force(d3v5.forceY(targetY), hLevelFilter, nodes))
                            });
                        
                        // assign a simulation force depending by the node group on the vertical axis
                        /*let groups = nodes.filter(n => typeof n.group == "number")
                            .map(n => n.group || 0)
                        let maxGroup = Math.max(...groups);
                        if (DEBUG) {console.debug("Max Groups: ", maxGroup, "of", groups);}
                        // assign a simulation force depending by the node group
                        [...Array(maxGroup).keys()].forEach(group => {
                            let targetX = group * width / (1 + maxGroup);
                            let groupFilter = n => n.group == group;
                            simulation.force("group_x_" + group,
                            rgBuilder.isolate_force(d3v5.forceX(targetX), groupFilter));
                        })*/

                        var selectProperCard = function (selectedNode) {
                            var nodeType = rgProcessor.calcNodeType(selectedNode);
                            if (nodeType == 'Review') {
                                scope.activateBotCard = false;
                                scope.activateOrganizationCard = false;
                                reviewAsCard(selectedNode);
                                var relatedItemRev = rgProcessor.lookupObject(selectedNode, 'itemReviewed');
                                if (relatedItemRev) {
                                    itemReviewedAsCard(relatedItemRev);
                                }
                            }
                            else if (nodeType == 'CreativeWork') {
                                scope.activateReviewCard = false;
                                scope.activateBotCard = false;
                                scope.activateOrganizationCard = false;
                                itemReviewedAsCard(selectedNode)
                            }
                            else if (nodeType == 'Bot') {
                                scope.activateReviewCard = false;
                                scope.activateItemReviewedCard = false;
                                scope.activateOrganizationCard = false;
                                botAsCard(selectedNode)
                            }
                            else if (nodeType == 'Organization') {
                                scope.activateReviewCard = false;
                                scope.activateItemReviewedCard = false;
                                scope.activateBotCard = false;
                                organizationAsCard(selectedNode)
                            }
                        }

                        var clickedNode = function(d) {
                            scope.selectedNode = Object.getPrototypeOf(d);
                            selectProperCard(scope.selectedNode)
                        }

                        var svg_node = function(d) {
                            var selectedNodeId;
                            var result = d.append("g")
                                .attr("stroke", colorByGroupAndHLevel)
                                .attr("fill", colorByGroupAndHLevel)
                                .attr("id", d => {
                                    return "node_" + d.id;
                                })
                        
                            var use = result.append("use")
                                .attr("xlink:href", rgBuilder.calcSymbolId)
                                .attr("transform", d => {
                                    let selectedFactor = (d.id == selectedNodeId) ? 2.0 : 1.0;
                                    let scale = (d.nodeScale || 1.0) * selectedFactor;
                                    return "scale(" + scale  + ")";
                                })
                                .attr("style", d => "opacity:" + (d.opacity || 0.8));

                            use.on("click", d => {
                                if (DEBUG) {console.debug("clicked on ", d)};
                                var selectedNodeId = d.id;
                                use.attr("transform", d => { //recalc scale
                                    let selectedFactor = (d.id == selectedNodeId) ? 2.0 : 1.0;
                                    let scale = (d.nodeScale || 1.0) * selectedFactor;
                                    return "scale(" + scale  + ")"
                                })
                                scope.$apply(function() { 
                                    clickedNode(d);
                                });
                            });
                            return result
                        }

                        const colorScale = d3v5.scaleOrdinal(d3v5.schemeCategory10);
                        
                        var colorByGroupAndHLevel = function(d) {
                            return colorScale(d.group + (d.hierarchyLevel || 0));
                        }

                        // create usr feedback (review)
                        var getCoinformUserReviewSchema = () => {
                            var coinformUserReviewDict = {
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
                                "supportingItem": [
                                    {
                                        "context": "http://schema.org",
                                        "type": "",
                                        "url": ""
                                    }
                                ],
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

                        return coinformUserReviewDict;
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
                            var itemRev = rgProcessor.lookupObject(selectedReview, 'itemReviewed') || {};
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

                        var link = container.append("g")
                            .attr("class", "links")
                            .attr("id", "linkGroup_" + graph.id)
                            .selectAll("polyline")
                            .data(links)
                            .join("polyline")
                            .attr("id", d => {
                                var source = d.source.index
                                var target = d.target.index
                                return "link_" + source + "_" + target;
                            })
                            .attr("stroke-width", d => Math.max(1, Math.sqrt(d.value)))
                            .attr("stroke", "#999")
                            .attr("stroke-opacity", d => d.opacity || 0.6)
                            .attr("fill", d => "none")
                            .attr("stroke-dasharray", d => {
                                var rel = d.rel;
                                if (rel == "itemReviewed") {
                                    return "2 1";
                                }
                                else {
                                    return null;
                                }
                            })
                            .attr("marker-mid", d => "url(#arrow)");

                        link.append("title")
                            .text(d => d.rel);
                        
                        console.log("Adding node svg elts");
                        var node = container.append("g")
                            .attr("class", "nodes")
                            .attr("id", "nodeGroup_" + graph.id)
                            .selectAll("circle")
                            .data(nodes)
                            .join(svg_node)
                            .attr("stroke-width", 1.5)
                            .call(drag(simulation));
                        
                        console.log("Setting node titles");
                        node.append("title")
                            .text(rgBuilder.itemToTooltipText);
                                
                        console.log("Register tick event handlers");
                        simulation.on("tick", () => {
                            link
                                .attr("points", d => {
                                var src = d.source.x + "," + d.source.y;
                                var tgt = d.target.x + "," + d.target.y;
                                
                                var midx = d.source.x + (d.target.x - d.source.x) * 0.8;
                                var midy = d.source.y + (d.target.y - d.source.y) * 0.8;
                                var mid = midx + "," + midy;
                                
                                return src + " " + mid + " " + tgt;
                                });
                        
                            node
                                .attr("x", d => d.x)
                                .attr("y", d => d.y)
                                .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
                            });

                        var linkedByIndex = {};
                        links.forEach(function(d) {
                            linkedByIndex[d.source.index + "," + d.target.index] = 1;
                        });

                        var isConnected = function (a, b) {
                            return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index];
                        }

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

                        node.on("mouseover", function(d) {
                            node.classed("node-active", function(o) {
                                var thisOpacity = isConnected(d, o) ? true : false;
                                this.setAttribute('fill-opacity', thisOpacity);
                                return thisOpacity;
                            });
                            link.classed("link-active", function(o) {
                                return o.source === d || o.target === d ? true : false;
                            });
                            var active = true;
                            activeArrows(active)
                            d3v5.select(this).classed("node-active", true);
                        })

                        node.on("mouseout", function(d) {
                            node.classed("node-active", false);
                            link.classed("link-active", false);
                            activeArrows()
                        });

                        var updateNodeIconOpacity = function (nodeGroup) {
                            nodeGroup
                                .attr("style", d => "opacity:" + d.opacity)
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

                        var handleNodeActivation = function(nodeGroup, criticalPath=false) {
                            nodeGroup.forEach(n => {
                                var np = Object.getPrototypeOf(n);
                                var nodeActive = n.opacityFilter ? false : true;
                                var newNodeOpacity = nodeActive ? 0 : np.originalOpacity;
                                // handle the sidebar actions
                                if (criticalPath == false) {
                                    if (np.enabledNode == true) {
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
                        
                        var handleLinkActivation = function(nodeGroup) {
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
                                var lp = Object.getPrototypeOf(l);
                                // Determine if current link is visible
                                var linkActive = lp.opacityFilter ? false : true;
                                if (linkActive) {
                                    var newLinkOpacity = 0;
                                }
                                else {                            
                                    var targetNodeOpacity = targetNodes.filter(n => 
                                        (n.index == l.target.index) && ((Object.getPrototypeOf(n).opacityFilter 
                                            ? Object.getPrototypeOf(n).opacityFilter : false) == false));
                                    var sourceNodeOpacity = sourceNodes.filter(n => 
                                        (n.index == l.source.index) && ((Object.getPrototypeOf(n).opacityFilter 
                                            ? Object.getPrototypeOf(n).opacityFilter : false) == false));
                                    if ((targetNodeOpacity.length) && (sourceNodeOpacity.length)) {
                                        newLinkOpacity = lp.originalOpacity;
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
                            var nodeGroup = nodes.filter(d => rgBuilder.calcSymbolId(d).slice(1,) == iconType);
                            // change the properties of each node corresponding to the selected type
                            // handle node activation in order to show/hide nodes 
                            handleNodeActivation(nodeGroup)
                            // handle link activation in order to show/hide links 
                            handleLinkActivation(nodeGroup)
                        };

                        var getCredibilityAssessor = function(selectedReview) {
                            var reviewer = rgProcessor.lookupObject(selectedReview, 'author');
                            return (reviewer.name || reviewer['@type'])
                        }

                        var organizationAsCard = function(selectedOrg) {
                            scope.organizationName = selectedOrg.name
                            scope.organizationUrl = selectedOrg.url
                            scope.organizationIconType = rgBuilder.calcSymbolId(selectedOrg).slice(1)
                            scope.activateOrganizationCard = true;
                        }

                        var botAsCard = function(selectedBot) {
                            scope.botName = (selectedBot.name || selectedBot['@type'])
                            scope.botUrl = selectedBot.url
                            scope.botDescription = selectedBot.description
                            scope.botDateCreated = card.pubDate(selectedBot.dateCreated)
                            scope.botIconType = rgBuilder.calcSymbolId(selectedBot).slice(1)
                            scope.activateBotCard = true;
                        }

                        var itemReviewedAsCard = function(selectedItemReviewed) {
                            scope.pubDate = card.pubDate(selectedItemReviewed.publishedDate)
                            scope.viewableContent = card.viewableContent((selectedItemReviewed.content || selectedItemReviewed.text))
                            scope.itRevTitle = (selectedItemReviewed.title || selectedItemReviewed.name)
                            scope.itRevUrl = (selectedItemReviewed.url)
                            scope.itRevDomain = (selectedItemReviewed.domain)
                            scope.itRevCardIconType = rgBuilder.calcSymbolId(selectedItemReviewed).slice(1)
                            scope.activateItemReviewedCard = true;
                        }

                        var reviewAsCard = function(selectedReview) {
                            scope.credibilitylabel = card.ratingLabel(selectedReview.reviewRating)
                            scope.credLabelDescription = card.credLabelDescription(scope.credibilitylabel)
                            scope.reviewConfidence = card.reviewConfidence(selectedReview.reviewRating.confidence)
                            scope.credibilityAssessor = getCredibilityAssessor(selectedReview)
                            scope.revExplanation = card.explanation(selectedReview.reviewRating.ratingExplanation)
                            scope.revCardIconType = rgBuilder.calcSymbolId(selectedReview).slice(1)
                            scope.activateReviewCard = true;
                        }

                        scope.displayMainReview = function() {
                            let nodeGroup = d3v5.select("#nodeGroup_" + graph.id).selectAll("use");
                            scope.mainNode = rgProcessor.nodeById(graph.id)
                            nodeGroup.attr("transform", d => {
                                let selectedFactor = (d.id == scope.mainNode.id) ? 2.0 : 1.0;
                                let scale = (d.nodeScale || 1.0) * selectedFactor;
                                return "scale(" + scale  + ")"
                            });
                            scope.selectedNode = scope.mainNode
                            selectProperCard(scope.selectedNode);
                        };

                        scope.displayMainItemReviewed = function() {
                            let nodeGroup = d3v5.select("#nodeGroup_" + graph.id).selectAll("use");
                            var crev = rgProcessor.nodeById(graph.id);
                            if (crev) {
                                var mainItRev = rgProcessor.lookupObject(crev, 'itemReviewed') || {};
                            }
                            nodeGroup.attr("transform", d => {
                                let selectedFactor = (d.id == mainItRev.id) ? 2.0 : 1.0;
                                let scale = (d.nodeScale || 1.0) * selectedFactor;
                                return "scale(" + scale  + ")"
                            });
                            var ItemReviewed = Object.getPrototypeOf(nodeGroup.filter(n => n.id == mainItRev.id).node().__data__);
                            scope.selectedNode = ItemReviewed
                            selectProperCard(scope.selectedNode)
                        };

                        // create a criticalPath click event
                        scope.clickCriticalPath = function() {
                            scope.manageCriticalPath = !scope.manageCriticalPath
                            //scope.hideSidebarWhenCriticalPath = !scope.hideSidebarWhenCriticalPath
                        }

                        var resetGraphAttributes = function() {
                            // reset attributes of each node (opacity, opacityFilter)
                            nodes.forEach(n => {
                                var np = Object.getPrototypeOf(n);
                                (np.opacity = np.originalOpacity) && (np.opacityFilter = false);
                            });
                            updateNodeIconOpacity(d3v5.select("#nodeGroup_" + graph.id).selectAll("use"));
                            // reset attributes of each link (opacity, opacityFilter)
                            links.forEach(l => {
                                var lp = Object.getPrototypeOf(l);
                                (lp.opacity = lp.originalOpacity) && (lp.opacityFilter = false);
                            });
                            updateLinkIconOpacity(d3v5.select("#linkGroup_" + graph.id).selectAll("polyline"));
                            // reset activation flag of each node
                            nodes.forEach(d=> Object.getPrototypeOf(d).enabledNode = true)
                            // reset the sidebar attributes
                            var sidebarIcons = d3v5.selectAll("img")
                            sidebarIcons.nodes().filter(d => d.id.includes('sideButton'))
                            // reset the buttons opacity
                            sidebarIcons.attr("style", d => "opacity:" + "1")
                            // reset the state of the sidebar icons
                            sidebarIcons.nodes().forEach(d => d.iconState = false)
                        }

                        // manage the criticalPath activation ("scope.prunedGraph" version)
                        //scope.$watch("manageCriticalPath", function(newVal, oldVal) {
                        //    resetGraphAttributes()
                        //    if (newVal != oldVal) {
                        //        if (newVal) {
                        //            render_panel(scope.wholeGraph)
                        //            scope.criticalPathButtonText = "Show the criticalPath"
                        //        }
                        //        else {
                        //            render_panel(scope.prunedGraph)
                        //            scope.criticalPathButtonText = "Show the whole reviewGraph"
                        //        }
                        //    }
                        //    // this is the first case to show the criticalPath as default
                        //    else if (!newVal || !oldVal) {
                        //        scope.criticalPathButtonText = "Show the whole reviewGraph"
                        //    }
                        //});

                        // manage the criticalPath activation
                        scope.$watch("manageCriticalPath", function(newVal, oldVal) {
                            resetGraphAttributes()
                            var mainNode = (Object.getPrototypeOf(nodes.filter(n=> n.id == graph.id)[0]))
                            let criticalPath = rgProcessor.findCriticalPath(mainNode, 'isBasedOnKept')
                            var graphNodesToManage = nodes.filter(n => !criticalPath.includes(Object.getPrototypeOf(n)));
                            if (newVal != oldVal) {
                                if (newVal) {
                                    graphNodesToManage.forEach(d=> Object.getPrototypeOf(d).enabledNode = false)
                                    var criticalpath = true
                                    handleNodeActivation(graphNodesToManage, criticalpath);
                                    handleLinkActivation(graphNodesToManage, criticalpath);
                                    scope.criticalPathButtonText = "Show the whole reviewGraph"
                                }
                                else {
                                    scope.criticalPathButtonText = "Show the criticalPath"
                                }
                            }
                            // this is the first case to show the criticalPath as default
                            else if (!newVal || !oldVal) {
                                scope.clickCriticalPath()
                            }
                        });

                        console.log("Register zoom handler")
                        var zoom = d3v5.zoom()
                            .scaleExtent([0.1, 4])
                            .on("zoom", function () {
                                container.attr("transform", d3v5.event.transform);
                            });
                        
                        svg.call(zoom);
                        
                        scope.zoomFit = function (paddingPercent, transitionDuration) {
                            var bounds = container.node().getBBox();
                            var parent = container.node().parentElement;
                            var fullWidth = parent.clientWidth,
                                fullHeight = parent.clientHeight;
                            var width = bounds.width,
                                height = bounds.height;
                            var midX = bounds.x + width / 2,
                                midY = bounds.y + height / 2;
                            if (width == 0 || height == 0) return; // nothing to fit
                            var scale = (paddingPercent || 0.75) / Math.max(width / fullWidth, height / fullHeight);
                            var translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
                        
                            if (DEBUG) {
                                console.trace("zoomFit", translate, scale)
                            };

                            var transform = d3v5.zoomIdentity
                                .translate(translate[0], translate[1])
                                .scale(scale);

                            svg.transition()
                                .duration(transitionDuration || 0) // milliseconds
                                .call(zoom.transform, transform);
                        }

                        scope.displayMainReview()

                    }
                }
            }
        });
    }
);