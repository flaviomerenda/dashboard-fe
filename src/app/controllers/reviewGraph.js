/*
  ## D3 Review Graph integrated in the Table panel.
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

        var module = angular.module('kibana.controllers');
        app.useModule(module);

        module.controller('reviewGraph', function ($scope, dashboard, $http, alertSrv, $element, solrSrv) {
            // This controller preprocess and creates a d3 graph of an acred review.
            // Nodes and links are generated taking into account different features.
            // A force simulation spreads out nodes by their hierarchy and groups them by node type.
            // The controller also manages click/tooltip/sidebar/table events.
            $scope.init = function (ciDoc) {
                $scope.ciDoc = ciDoc;
                $scope.getReviewGraph($scope.ciDoc);
            };
            
            // Load graph from json and add chart-specific fields to nodes and links
            // The chart-specific fields are tailored to the d3-force requirements 
            $scope.getReviewGraph = function (doc) {

                // preprocess the reviewGraph
                var preProcessedGraph = function(graph) {
                    // add group property to nodes and value property to links
                    // this is just so the current force chart implementation works, 

                    // extract node type
                    var calcNodeType = function(d) {
                        var dt = d['@type'] || d['type'] || 'Thing';
                        var bot = ['ClaimReviewNormalizer', 'SentenceEncoder']
                        var org = ['Article', 'Tweet', 'WebSite', 'Dataset', 'Sentence', 'SentencePair']
                        if (dt.endsWith('Review')) {
                            return 'Review';
                        } 
                        else if (dt == 'Rating') {
                            return 'Review'; // incorrect, but OK for now, this is a bug upstream
                        } 
                        else if (bot.includes(dt)) {
                            return 'Bot';
                        } 
                        else if (dt.endsWith('Reviewer')) {
                            return 'Bot';
                        } 
                        else if (org.includes(dt)) {
                            return 'CreativeWork'; // content
                        } 
                        else if (dt.endsWith('Organization')) {
                            return 'Organization';
                        } 
                        else {
                            return dt;
                        }
                    }
                
                    // calculate node opacity based on its attributes
                    var calcNodeOpacity = function(d) {
                        var dt = calcNodeType(d);
                        var minOpacity = 0.2;
                        if (dt == 'Review') {
                            var rating = d['reviewRating'] || {};
                            var conf = rating['confidence'] || 0.7;
                            var opacity = minOpacity + ((1 - minOpacity) * conf**2);
                            return opacity;
                        } 
                        else if (dt == 'Bot') {
                            // inherit the hierarchy level of the review
                            var revNode = lookupSubject(d, 'author');
                            if (revNode) {  
                                return calcNodeOpacity(revNode);
                            } 
                            else {
                                return minOpacity;
                            }
                        } 
                        else {
                            // assume it's some content that was reviewed
                            var revNode = lookupSubject(d, 'itemReviewed');
                            if (revNode) {
                                return calcNodeOpacity(revNode);
                            }
                            else {
                                return minOpacity;
                            }
                        }
                    }
                    
                    // calculate link opacity based on its attributes
                    var calcLinkOpacity = function(link) {
                        var rel = link['rel'];
                        var sent = ['sentA', 'sentB'];
                        var author = ['author', 'creator'];
                        if (sent.includes(rel)) {
                            return 0.8;
                        } 
                        else if (rel == 'isBasedOn') {
                            return calcNodeOpacity($scope.nodeById(link['target']));
                        } 
                        else if (author.includes(rel)) {
                            return 0.4;
                        } 
                        else if (rel == 'itemReviewed') {
                            return calcNodeOpacity($scope.nodeById(link['source']));
                        } 
                        else if (rel == 'basedOn') {
                            return calcNodeOpacity($scope.nodeById(link['source']));
                        } 
                        else if (rel == 'appearance') {
                            return 0.8;
                        } 
                        else {
                            return 0.8;
                        }
                    }
                
                    // calculate link value
                    var calcLinkValue = function(link) {
                        return 2.0;
                    }
                
                    // calculate node size based on its type
                    var calcNodeSize = function(d) {
                        var minSize = 10;
                        var maxSize = 30;
                        var maxReviewCount = 20;
                        var dt = d['@type'] || d['type'] || 'Thing';
                        if (dt == 'NormalisedClaimReview') {
                            return maxSize;
                        }
                        if (dt.endsWith('Review')) {
                            var rating = d['reviewRating'] || {};
                            var revCnt = Math.min(maxReviewCount, rating['reviewCount'] || 1);
                            var rate = revCnt / maxReviewCount;
                            return minSize + Number((maxSize - minSize) * rate)
                        }
                        else {
                            return minSize;
                        }
                    }
                
                    // calculate node scale
                    var calcNodeScale = function(d) {
                        var maxScale = 2.5; 
                        var maxReviewCount = 20;
                        var dt1 = d['@type'] || d['type'] || 'Thing';
                        var dt2 = calcNodeType(d) 
                        if (dt1 == 'NormalisedClaimReview') {
                            return maxScale;
                        }
                        if (dt2.endsWith('Review')) {
                            var rating = d['reviewRating'] || {};
                            var revCnt = Math.min(maxReviewCount, rating['reviewCount'] || 1);
                            var rate = revCnt / maxReviewCount;
                            return Math.max(1.0, maxScale*rate);
                        }
                        else if (dt2 == 'CreativeWork') {
                            var revN = lookupSubject(d, 'itemReviewed');
                            if (revN) {
                                return calcNodeScale(revN);
                            }
                            else {
                                return 1.0
                            }
                            } 
                        else {
                            return 1.0
                        }
                    }
                
                    // get node by its id
                    $scope.nodeById = function(nid) {
                        var matching = graph['nodes'].filter(n => n['id'] == nid);
                        if (matching.length > 0) {
                            return matching[0];
                        }
                        else {
                            return null;
                        }
                    }
                
                    // look for linked nodes
                    var lookupNodes = function(qnode, qrel, qnodeRole) {
                        if ('id' in qnode == false) {
                            console.log('Cannot lookup triple for node without id. Node: ', qnode);
                            return [];
                        };
                        if (qnodeRole == 'source') {
                            var resRole = 'target';
                        }
                        else {
                            var resRole = 'source';
                        };
                        var qnodeId = qnode['id'];
                        // TODO: fix the coinfo-apy bug and remove the option "basedOn"
                        var resIds = graph['links'].filter(link => ((link['rel'] == qrel) || 
                                                                    (link['rel'] == "basedOn")) && 
                                                                    (qnodeId == link[qnodeRole])).map(link => link[resRole])
                        return resIds.map(n => $scope.nodeById(n));
                    }
                
                    // look for respective targer node
                    var lookupSubject = function(node, rel) {
                        var matchingNodes = lookupNodes(node, rel, 'target');
                        if (matchingNodes.length == 0) {
                            return undefined;
                        } 
                        else {
                            return matchingNodes[0];
                        }
                    }
                    
                    // look for respective source node
                    $scope.lookupObject = function(node, rel, searchCriticalPath=false) {
                        var matchingNodes = lookupNodes(node, rel, 'source');
                        if (matchingNodes.length == 0) {
                            return undefined;
                        }
                        if (searchCriticalPath == true) {
                            if (node.hierarchyLevel == 0) {
                                if (rel == 'isBasedOn') {
                                    // filter the right first critical node 
                                    // (it will be removed when acred will take care of the criticalPath)
                                    var filteredMatching = matchingNodes.filter(n => 
                                        n.reviewRating.confidence == node.reviewRating.confidence)
                                    return filteredMatching[0];
                                }
                                else {
                                    return matchingNodes[0];
                                }
                            }
                            else {
                                return matchingNodes[0];
                            }
                        }
                        else {
                            return matchingNodes[0];
                        }
                    }
                
                    // calculate the main itemreviewed
                    var calcMainItemReviewed = function() {
                        var nid = graph['mainNode'];
                        if (nid == null) {
                            return "??";
                        }
                        var crev = $scope.nodeById(nid);
                        if (crev) {
                            var itReved = $scope.lookupObject(crev, 'itemReviewed') || {};
                            var itType = itReved['@type'] || itReved['type'] || 'Thing';
                            var text = itReved['headline'] || itReved['text'] || itReved['content'] || '??';
                            if (text.length > 60) {
                                text = text.slice(0, 60) + "...";
                            }
                            return String(itType) + ': ' + '"' + String(text) + '"';
                        }
                    }
                
                    // calculate the node hierarchy
                    var calcNodeHierarchy = function(d) {
                        var dt = calcNodeType(d);
                        var topNid = graph['mainNode'];
                        if (dt == "Review") {
                            if (topNid == d['id']) {
                                return 0;
                            } 
                            else {
                                var parentN = lookupSubject(d, 'isBasedOn');
                                if (parentN) {
                                    return 1 + parseInt(calcNodeHierarchy(parentN));
                                }
                                else {
                                    console.log('Could not find parent node')
                                    return undefined;
                                }
                            }
                        }
                        else if (dt == 'Bot') {
                            // inherit the hierarchy level of the review
                            var revN = lookupSubject(d, 'author');
                            if (revN) {
                                return parseInt(calcNodeHierarchy(revN));
                            } 
                            else {
                                return undefined;
                            }
                        }
                        else {
                            // assume it's some content that was reviewed
                            var nReviewer = lookupSubject(d, 'itemReviewed');
                            if (nReviewer) {
                                return parseInt(calcNodeHierarchy(nReviewer));
                            }
                            else {
                                return undefined;
                            }
                        }
                    }
                
                    var ntypes = Array.from(new Set($scope.reviewGraph['nodes'].map(n => calcNodeType(n))));
                
                    var processGraph = function(graph) {
                        for (var n of graph['nodes']) {
                            var nid = n['identifier'] || n['@id'] || n['url'];
                            n['id'] = nid;
                        }
                        for (var n of graph['nodes']) {
                            var hlevel = calcNodeHierarchy(n);
                            n['hierarchyLevel'] = hlevel;
                        }
                        for (n of graph['nodes']) {
                            var nt = calcNodeType(n);
                            n['group'] = ntypes.indexOf(nt);
                            n['originalOpacity'] = calcNodeOpacity(n);
                            n['opacity'] = n['originalOpacity'];
                            n['nodeSize'] = calcNodeSize(n);
                            n['nodeScale'] = calcNodeScale(n);
                            n['enabledNode'] = true
                        }
                        for (var l of graph['links']) {
                            l['value'] = calcLinkValue(l);
                            l['originalOpacity'] = calcLinkOpacity(l);
                            l['opacity'] = l['originalOpacity'];
                        };
                        graph['mainItemReviewed'] = calcMainItemReviewed();
                        graph['mainNodeLabel'] = $scope.ciDoc.credibility_label
                        graph['id'] = $scope.reviewGraph.mainNode
                        return graph
                    }
                
                    var processedGraph = processGraph($scope.reviewGraph)
                    if (DEBUG) {
                        var hlevels = processedGraph['nodes'].filter(n => n.hierarchyLevel != null).map(n => n['hierarchyLevel']);
                        console.debug('min/max hierarchy levels: ', Math.min(...hlevels), Math.max(...hlevels))
                    }

                    return processedGraph;
                }

                // request the corresponding reviewGraph
                let rg = solrSrv.fetchReviewGraph(doc);
                rg.success(function(data, status) {
                    var result = data['results'][0]
                    $scope.reviewGraph = result['reviewGraph'];
                    if ($scope.reviewGraph == null) {
                        alertSrv.set('Warning', 'No review available for this document. Sorry.');
                    }

                    var processedData = preProcessedGraph($scope.reviewGraph)
                    if (DEBUG) {console.debug('reviewGraph data: ', processedData)}

                    $scope.graph = processedData

                    // trigger rendering of the graph
                    $scope.renderGraph($scope.graph);
                });
            };

            // Function for rendering graph
            $scope.renderGraph = function (graph) {
                // get nodes and links
                const nodes = graph.nodes.map(d => Object.create(d));
                const links = graph.links.map(d => Object.create(d));

                // get the current element where to add the graph
                // get the height and width parent values
                var currEl = $element[0].children[1].children[1];
                var width = currEl.parentNode.clientWidth;
                var height = currEl.parentNode.clientHeight;

                var svg = d3v5.select(currEl).append("svg")
                    .attr("id", "svg_" + graph.id)
                    .attr("class", "review-graph-svg")
                    .attr("width", width)
                    .attr("height", height)

                // TODO: transfer these values to a config file
                var calcLinkDistance = function(link) {
                    var rel = link.rel || "isRelatedTo";
                    if (rel == "sentA") { //sentPair to query sent
                        return 60;
                    } 
                    else if (rel == "sentB") { //sentPair to db sent
                        return 20;
                    } 
                    else if (rel == "isBasedOn") {
                        return 20;
                    } 
                    else if (rel == "appearance") {
                        return 30;
                    } 
                    else if (rel == "author") {
                        return 60;
                    } 
                    else if (rel == "itemReviewed") {
                        return 40; 
                    } 
                    else if (rel == "basedOn") {
                        return 30;
                    } 
                    else if (rel == "creator") {
                        return 60;
                    }
                    return 30;
                }

                var container = svg.append("g")
                    .attr("class", "review-graph-container")
                    .attr("id", "container_" + graph.id);

                // applies the force to the source and target node of each link.
                var link_force = d3force.forceLink(links)
                    .id(function (d) {
                        return d.id;
                        })
                    .distance(calcLinkDistance); // let distance depend on the type of relation

                console.log("Defining forceSimulation")

                var simulation = d3force.forceSimulation()
                    // TODO: transfer -400 value to a config file
                    .force("charge_force", d3force.forceManyBody().strength(-400))
                    .force("center_force", d3force.forceCenter(width / 2, height / 2))
                    .nodes(nodes)
                    .force("links", link_force);

                // assingn a force to a node subset
                var isolate_force = function(force, nodeFilter) {
                    let init = force.initialize;
                    force.initialize = function() { 
                        let fnodes = nodes.filter(nodeFilter);
                        init.call(force, fnodes); 
                    };
                    return force;
                }

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
                    isolate_force(d3v5.forceY(targetY), hLevelFilter))
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
                    isolate_force(d3v5.forceX(targetX), groupFilter));
                })*/

                var clickedNode = function(d) {
                    var selectedNode = Object.getPrototypeOf(d);
                    
                    // TODO: change this table with a proper "card"
                    d3v5.select("#selectedNodeDetailsFor_" + graph.id)
                        .html("<p>" + node_as_html_table(selectedNode) + "</p>");

                    // TODO: allow users to produce a feedback when selectedNode is "Review"
                    d3v5.select("#accRev")
                        .on("click", handleAccurate(selectedNode))
                    d3v5.select("#inaccRev")
                        .on("click", handleInaccurate(selectedNode))
                }

                var svg_node = function(d) {
                    var result = d.append("g")
                        .attr("stroke", colorByGroupAndHLevel)
                        .attr("fill", colorByGroupAndHLevel)
                        .attr("id", d => {
                            return "node_" + d.id;
                        })
                
                    var use = result.append("use")
                        .attr("xlink:href", calcSymbolId)
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
                        clickedNode(d);
                    });
                    return result
                }
                
                var selectedNodeId = null;

                const colorScale = d3v5.scaleOrdinal(d3v5.schemeCategory10);
                
                var colorByGroupAndHLevel = function(d) {
                    return colorScale(d.group + (d.hierarchyLevel || 0));
                }

                // Given a node object, return the appropriate symbol id stored in src/index.html
                // The symbol must be defined as part of the encompassing svg element.
                var calcSymbolId = function(d) {
                    var itType = d["@type"]
                    if (typeof itType == "undefined") {
                        return "#thing";
                    } 
                    else if (itType == "NormalisedClaimReview") {
                        return "#revCred";
                    } 
                    else if (itType.endsWith("Review")) {
                        return "#claimRev";
                    } 
                    else if (itType == "ClaimReviewNormalizer") {
                        return "#bot";
                    } 
                    else if (itType == "SentenceEncoder") {
                        return "#bot";
                    } 
                    else if (itType.endsWith("Reviewer")) {
                        return "#bot";
                    } 
                    else if (itType == "Sentence") {
                        return "#singleSent";
                    } 
                    else if (itType == "Article") {
                        return "#article";
                    } 
                    else if (itType == "WebSite") {
                        return "#website";
                    } 
                    else if (itType == "SentencePair") {
                        return "#sentPair";
                    } 
                    else {
                        return "#thing";
                    }
                }

                // wrapper of number.toFixed in case v is not a number
                var myToFixed = function(v) {
                    if (typeof v == "number") {
                        return v.toFixed(3);
                    } 
                    else {
                        return v;
                    }
                }

                // Given a node object, return the tooltip text
                var itemToTooltipText = function(d) {
                    const itType = d["@type"];
                    if (typeof itType == "undefined") {
                        return "undefined type";
                    } 
                    const defaultVal = itType + ": " + d.id;
                    if (itType == "NormalisedClaimReview") {
                        var claimReved = d.claimReviewed || "unknown claim";
                        var rating = d.reviewRating || {};
                        var explanation = rating.ratingExplanation || "no explanation";
                        return "Normalised ClaimReview" + 
                            "\n\tclaim: " + claimReved + 
                            "\n\texplanation: " + explanation;
                    } 
                    else if (itType == "ClaimReviewNormalizer") {
                        var description = d.description || "missing";
                        var name = d.name || itType;
                        var version = d.softwareVersion || "unknown";
                        return name +
                            "\n\tversion: " + version +
                            "\n\tdescription: " + description;
                    } 
                    else if (itType == "SentenceEncoder") {
                        var description = d.description || "missing";
                        var name = d.name || itType;
                        var version = d.softwareVersion || "unknown";
                        return name +
                            "\n\tversion: " + version +
                            "\n\tdescription: " + description;
                    } 
                    else if (itType == "Sentence") {
                        var text = d.text || "missing text";
                        return itType + ":\n\t" + text;
                    } 
                    else if (itType == "Article") {
                        var url = d.url || "unknown";
                        var publisher = d.publisher || "unkown";
                        return itType + 
                            "\n\turl: " + url +
                            "\n\tpublisher: " + publisher;
                    } 
                    else if (itType == "WebSite") {
                        var name = d.name || "unkown";
                        return itType + ": " + name;
                    } 
                    else if (itType == "SentencePair") {
                        var text = d.text || "missing text";
                        var roleA = d.roleA || "first";
                        var roleB = d.roleB || "second";
                        return itType + ":\n\t" + text +
                            "\n\t1st role: " + roleA +
                            "\n\t2nd role: " + roleB;
                    } 
                    else if (itType.endsWith("Review")) {
                        var rating = d.reviewRating || {};
                        var aspect = rating.reviewAspect || "unknown";
                        var ratingValue = myToFixed(rating.ratingValue || "unknown");
                        var conf = myToFixed(rating.confidence || "unknown");
                        var explanation = rating.ratingExplanation || "none";
                        return itType + "(" + aspect + ")" +
                            "\n\tvalue and confidence: " + ratingValue + "(" + conf + ")" +
                            "\n\texplanation: " + explanation;
                    } 
                    else if (itType.endsWith("Reviewer")) {
                        var description = d.description || "missing";
                        var name = d.name || itType;
                        var version = d.softwareVersion || "unknown";
                        return name +
                            "\n\tversion: " + version +
                            "\n\tdescription: " + description;
                    } 
                    else if (itType == "Organization") {
                        var name = d.name || "unkown";
                        return itType + ": " + name;
                    } 
                    else {
                        return defaultVal;
                    }
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
                    var itemRev = $scope.lookupObject(selectedReview, 'itemReviewed') || {};
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
                    alert('This feature is not implemented yet');
                }

                var handleAccurate = (selectedReview) => {
                    return function () {
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
                }

                var handleInaccurate = (selectedReview) => {
                    return function() {
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
                }

                var replaceNull = function (entry) {
                    var key = entry[0]
                    var val = (entry[1] == null) ? String() : entry[1];
                    return [key, val]
                }

                var node_as_key_vals = (node, maxDepth, privateFields) => Object.entries(node)
                    .filter(entry => !privateFields.includes(entry[0]))
                    .flatMap(entry => {
                        let [key, val] = replaceNull(entry);
                        if (typeof val == "object" && maxDepth > 0) {
                            return node_as_key_vals(val, maxDepth - 1, privateFields)
                            .map(entry2 => [key + "." + entry2[0], entry2[1]]);
                        } 
                        else if (typeof val == "object") {
                            return [[key, "Object"]];
                        }
                        return [entry]
                    })

                var node_as_html_table = function(node) {
                    const privateFields = ["id", "hierarchyLevel", "group", "opacity", "nodeSize", "nodeScale", "originalNodeOpacity", "filtered"];
                    if (DEBUG) {console.debug("", node["@type"], node["id"], "as table")};

                    let rows = node_as_key_vals(node, 2, privateFields)
                    .map(entry => {
                        let [key, val] = replaceNull(entry);
                        return ["<tr><td>" + key.toString() + "</td><td>" +  val.toString() + "</td></tr>"]
                    })
                    .join(" ");
                    let table = rows
                    return table;
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
                    .text(itemToTooltipText);
                        
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

                console.log("Register zoom handler")
                var zoom = d3v5.zoom()
                    .scaleExtent([0.1, 4])
                    .on("zoom", function () {
                        container.attr("transform", d3v5.event.transform);
                    });

                svg.call(zoom);

                var linkedByIndex = {};
                links.forEach(function(d) {
                    linkedByIndex[d.source.index + "," + d.target.index] = 1;
                });

                var isConnected = function (a, b) {
                    return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index];
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
                    d3v5.select(this).classed("node-active", true);
                    d3v5.select(this).select("use").transition()
                        .duration(750)
                        // TODO: fix node size growth
                        //.attr("transform", "scale(" + (d.nodeScale * 2)  + ")"); 
                })

                node.on("mouseout", function(d) {
                    node.classed("node-active", false);
                    link.classed("link-active", false);
                    d3v5.select(this).select("use").transition()
                        .duration(750)
                        // TODO: fix node size growth
                        //.attr("transform", "scale(" + (d.nodeScale)  + ")");
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

                $scope.sidebarGraphEvent = function(nodeIconId){
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
                    var nodeGroup = nodes.filter(d => calcSymbolId(d).slice(1,) == iconType);
                    // change the properties of each node corresponding to the selected type
                    // handle node activation in order to show/hide nodes 
                    handleNodeActivation(nodeGroup)
                    // handle link activation in order to show/hide links 
                    handleLinkActivation(nodeGroup)
                };

                $scope.displayMainNode = function() {
                    let nodeGroup = d3v5.select("#nodeGroup_" + graph.id).selectAll("use");
                    var mainNode = nodeGroup.filter(n => n.id == graph.id).node().__data__
                    nodeGroup.attr("transform", d => {
                        let selectedFactor = (d.id == mainNode.id) ? 2.0 : 1.0;
                        let scale = (d.nodeScale || 1.0) * selectedFactor;
                        return "scale(" + scale  + ")"
                    });
                    clickedNode(mainNode);
                };

                // activate the flag value in order to show the main node
                $scope.showMainNode = function() {
                    $scope.activateMainNode = true
                }

                // display the main node as default node/table
                $scope.$watch('activateMainNode', function(val) {
                    if (val) {
                        $scope.displayMainNode();
                    }
                })

                $scope.displayMainItemRev = function() {
                    let nodeGroup = d3v5.select("#nodeGroup_" + graph.id).selectAll("use");
                    var crev = $scope.nodeById(graph.id);
                    if (crev) {
                        var mainItRev = $scope.lookupObject(crev, 'itemReviewed') || {};
                    }
                    nodeGroup.attr("transform", d => {
                        let selectedFactor = (d.id == mainItRev.id) ? 2.0 : 1.0;
                        let scale = (d.nodeScale || 1.0) * selectedFactor;
                        return "scale(" + scale  + ")"
                    });
                    var ItRev = nodeGroup.filter(n => n.id == mainItRev.id).node().__data__
                    clickedNode(ItRev);
                };

                var getCriticalLinkedNodes = function(criticalNode) {
                    var rels = ['sentA', 'sentB', 'author', 'creator', 'itemReviewed', 'appearance']
                    var searchCriticalPath = true
                    var linkedNodes = []
                    for (var rel of rels) {
                        var pathNode = $scope.lookupObject(criticalNode, rel, searchCriticalPath);
                        if (pathNode) {
                            linkedNodes.push(pathNode);
                        }
                    }
                    return linkedNodes
                }

                var findCriticalPath = function(mainNode) {
                    let criticalPath = lookupCriticalNodes(mainNode)
                    var criticalLinkedNodes = []
                    for (var cn of criticalPath) {
                        var linkedNode = getCriticalLinkedNodes(cn);
                        if (linkedNode) {
                            criticalLinkedNodes.push(...linkedNode)
                        }
                    };
                    return criticalPath.concat(criticalLinkedNodes);
                }

                var lookupCriticalNodes = function(node, criticalPath=[node]) {
                    var searchCriticalPath = true
                    var pathNode = $scope.lookupObject(node, 'isBasedOn', searchCriticalPath);
                    if (pathNode) {
                        return lookupCriticalNodes(pathNode, criticalPath.concat(pathNode));
                    }
                    return criticalPath
                };

                // set a criticalPath flag
                $scope.manageCriticalPath = false;

                // set the default critical path button text
                $scope.criticalPathButtonText = "Click to show the criticalPath"

                // create a criticalPath click event
                $scope.clickCriticalPath = function() {
                    $scope.manageCriticalPath = !$scope.manageCriticalPath
                    //$scope.hideSidebarWhenCriticalPath = !$scope.hideSidebarWhenCriticalPath
                }

                var resetGraphAttributes = function() {
                    // reset attributes of each node (opacity, opacityFilter)
                    nodes.forEach(n=> (Object.getPrototypeOf(n).opacity = Object.getPrototypeOf(n).originalOpacity) && 
                        (Object.getPrototypeOf(n).opacityFilter = false));
                    updateNodeIconOpacity(d3v5.select("#nodeGroup_" + graph.id).selectAll("use"));
                    // reset attributes of each link (opacity, opacityFilter)
                    links.forEach(l=> (Object.getPrototypeOf(l).opacity = Object.getPrototypeOf(l).originalOpacity) && 
                        (Object.getPrototypeOf(l).opacityFilter = false));
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

                // manage the criticalPath activation
                $scope.$watch("manageCriticalPath", function(newVal, oldVal) {
                    resetGraphAttributes()
                    var mainNode = (Object.getPrototypeOf(nodes.filter(n=> n.id == graph.id)[0]))
                    let criticalPath = findCriticalPath(mainNode)
                    var graphNodesToManage = nodes.filter(n => !criticalPath.includes(Object.getPrototypeOf(n)));
                    if (newVal != oldVal) {
                        if (newVal) {
                            graphNodesToManage.forEach(d=> Object.getPrototypeOf(d).enabledNode = false)
                            var criticalpath = true
                            handleNodeActivation(graphNodesToManage, criticalpath);
                            handleLinkActivation(graphNodesToManage, criticalpath);
                            $scope.criticalPathButtonText = "Click to show the whole reviewGraph"
                        }
                        else {
                            $scope.criticalPathButtonText = "Click to show the criticalPath"
                        }
                    }
                });

            };
        });
    }
);