/*
  ## D3 Review Graph integrated in the Table panel.
*/

define([
    'angular',
    'app',
    'underscore',
    'd3v5',
    'd3-force',
  ],

function (angular, app, _, d3v5, d3force) {
    'use strict';

    var module = angular.module('kibana.controllers');
    app.useModule(module);

    module.controller('reviewGraph', function ($scope, dashboard, $http, alertSrv) {

        $scope.init = function (ciDoc) {
            $scope.ciDoc = ciDoc;
            $scope.get_data();
        };
            
        $scope.get_data = function () {
            // Execute the search and get results
            let doc_id = $scope.ciDoc.id;
            let baseUrl = dashboard.current.solr.server;
            let collection = dashboard.current.solr.core_name;
            $http({
            method: 'GET',
            url: baseUrl + "/reviewGraph/" + collection + "?id=" + doc_id
            }).error(function(data, status) {
            if(status === 0) {
            alertSrv.set('Error', 'Could not retrieve Review Graph at '+baseUrl+
                    '. Please ensure that the server is reachable from your system.' ,'error');
            } else {
            alertSrv.set('Error','Could not retrieve Review Graph data from server (Error status = '+status+')','error');
            }
            }).success(function(data, status) {
            let result = data['results'][0]
            //console.log('Got response back from server for doc_id: ', result['doc_id'], result);
            $scope.graph = result['reviewGraph'];
            if ($scope.graph == null) {
            alertSrv.set('Warning', 'No review available for this document. Sorry.');
            } else {
            console.log('Retrieved review graph with', $scope.graph['nodes'].length, 'nodes and', $scope.graph['links'].length, 'links');
            //TODO: trigger display of graph
            }

            var preProcessedGraph = function(graph) {
                //Load graph from json and add chart-specific fields to nodes and links
                //The chart-specific fields are tailored to the d3-force requirements 
              
                // add group property to nodes and value property to links
                // this is just so the current force chart implementation works, 
                var calcNodeType = function(d){
                    var dt = d['@type'] || d['type'] || 'Thing';
                    var bot = ['ClaimReviewNormalizer', 'SentenceEncoder']
                    var org = ['Article', 'Tweet', 'WebSite', 'Dataset', 'Sentence', 'SentencePair']
                    if (dt.endsWith('Review')) {
                        return 'Review';
                    } else if (dt == 'Rating') {
                        return 'Review'; // incorrect, but OK for now, this is a bug upstream
                    } else if (bot.includes(dt)) {
                        return 'Bot';
                    } else if (dt.endsWith('Reviewer')) {
                        return 'Bot';
                    } else if (org.includes(dt)) {
                        return 'CreativeWork'; // content
                    } else if (dt.endsWith('Organization')) {
                        return 'Organization';
                    } else {
                        return dt;
                    }
                }
              
                var calcNodeOpacity = function(d) {
                  var dt = calcNodeType(d);
                  var minOpacity = 0.2;
                  if (dt == 'Review') {
                    var rating = d['reviewRating'] || {};
                    var conf = rating['confidence'] || 0.7;
                    var opacity = minOpacity + ((1 - minOpacity) * conf**2);
                    return opacity;
                  } else if (dt == 'Bot') {
                    // inherit the hierarchy level of the review
                    var revNode = lookupSubject(d, 'author');
                    if (revNode) {  
                      return calcNodeOpacity(revNode);
                    } else {
                        minOpacity;
                    }
                  } else {
                    // assume it's some content that was reviewed
                    var revNode = lookupSubject(d, 'itemReviewed');
                    if (revNode) {
                      return calcNodeOpacity(revNode);
                    }
                    else {
                      minOpacity;
                    }
                  }
                }
  
                var calcLinkOpacity = function(link) {
                  var rel = link['rel'];
                  var sent = ['sentA', 'sentB'];
                  var author = ['author', 'creator'];
                  if (sent.includes(rel)) {
                    return 0.8;
                  } else if (rel == 'isBasedOn') {
                    return calcNodeOpacity(nodeById(link['target']));
                  } else if (author.includes(rel)) {
                    return 0.4; // calcNodeOpacity(nodeById(link['source']))
                  } else if (rel == 'itemReviewed') {
                    return calcNodeOpacity(nodeById(link['source']));
                  } else if (rel == 'basedOn') {
                    return calcNodeOpacity(nodeById(link['source']));
                  } else if (rel == 'appearance') {
                    return 0.8;
                  } else {
                    return 0.8;
                  }
                }
              
                var calcLinkValue = function(link) {
                  return 2.0; // rtype2i[e.get('rel', 'relatedTo')]
                }
              
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
              
                var calcNodeScale = function(d) {
                  var maxScale = 2.5; 
                  var maxReviewCount = 20;
                  var dt1 = d['@type'] || d['type'] || 'Thing';
                  var dt = calcNodeType(d) 
                  if (dt1 == 'NormalisedClaimReview') { //ground cred signal
                    return maxScale;
                  }
                  if (dt.endsWith('Review')) {
                    var rating = d['reviewRating'] || {};
                    var revCnt = Math.min(maxReviewCount, rating['reviewCount'] || 1);
                    var rate = revCnt / maxReviewCount;
                    return Math.max(1.0, maxScale*rate);
                  }
                  else if (dt == 'CreativeWork') {
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
              
                var nodeById = function(nid) {
                  var matching = graph['nodes'].filter(n => n['id'] == nid);
                  if (matching.length > 0) {
                    return matching[0];
                  } 
                  else {
                    return null;
                  }
                }
              
                var lookupNodes = function(qnode, qrel, qnodeRole) {
                  if ('id' in qnode == false) {
                    console.log('Cannot lookup triple for node without id. Node: ', qnode);
                    return [];
                  }
                  if (qnodeRole == 'source') {
                    var resRole = 'target';
                  }
                  else {
                    var resRole = 'source';
                  }
                  var qnodeId = qnode['id'];
                  var resIds = graph['links'].filter(link => (link['rel'] == qrel) && (qnodeId == link[qnodeRole])).map(link => link[resRole])
                  return resIds.map(n => nodeById(n));
                }
              
                var lookupSubject = function(node, rel) {
                  var matchingNodes = lookupNodes(node, rel, 'target');
                  if (matchingNodes.length == 0) {
                    return;
                  } 
                   else {
                    return matchingNodes[0];
                   }
                }
              
                var lookupObject = function(node, rel) {
                  var matchingNodes = lookupNodes(node, rel, 'source');
                  if (matchingNodes.length == 0) {
                    return;
                  }
                  else {
                    return matchingNodes[0];
                  }
                }
              
                var calcMainItemReviewed = function() {
                  var nid = graph['mainNode'];
                  if (nid == null) {
                    return "??";
                  }
                  var crev = nodeById(nid);
                  if (crev) {
                    var itReved = lookupObject(crev, 'itemReviewed') || {};
                    var itType = itReved['@type'] || itReved['type'] || 'Thing';
                    var text = itReved['headline'] || itReved['text'] || '??';
                    return String(itType) + ': ' + String(text);
                  }
                }
              
                var calcNodeHierarchy = function(d, seen=[]) {
                  var seen = [];
                  var dt = calcNodeType(d);
                  var topNid = graph['mainNode'];
                  if (dt == "Review") {
                    if (topNid == d['id']) {
                      return 0;
                    } else {
                        var parentN = lookupSubject(d, 'isBasedOn');
                        if (parentN) {
                          return 1 + calcNodeHierarchy(parentN, seen + [d]);
                        } else {
                          console.log('Could not find parent node')
                          return;
                        }
                      }
                  } else if (dt == 'Bot') {
                    // inherit the hierarchy level of the review
                    revN = lookupSubject(d, 'author');
                    if (revN) {
                      return calcNodeHierarchy(revN);
                    } else {
                        return;
                      }
                  } else {
                    // assume it's some content that was reviewed
                    var revN = lookupSubject(d, 'itemReviewed');
                    if (revN) {
                    return calcNodeHierarchy(revN);
                    } else {
                      return;
                    }
                  }
                }
              
                var ntypes = Array.from(new Set($scope.graph['nodes'].map(n => calcNodeType(n))));
              
                var processGraph = function(graph) {
                  var n; 
                  for (n of graph['nodes']) {
                    var nid = n['identifier'] || n['@id'] || n['url'];
                    n['id'] = nid;
                    var hlevel = calcNodeHierarchy(n);
                    n['hierarchyLevel'] = hlevel;
                    var nt = calcNodeType(n);
                    n['group'] = ntypes.indexOf(nt);
                    n['opacity'] = calcNodeOpacity(n);
                    n['nodeSize'] = calcNodeSize(n);
                    n['nodeScale'] = calcNodeScale(n);
                  }
                  return graph
                }
            
                var processedGraph = processGraph($scope.graph)
                var hlevels = processedGraph['nodes'].filter(n => n['hierarchyLevel'] || 1 == ('hierarchyLevel' in n) && n['hierarchyLevel']);
                console.log('min/max hierarchy levels: ', Math.min(hlevels), Math.max(hlevels))
                var e;
                for (e of processedGraph['links']) {
                  e['value'] = calcLinkValue(e);
                  e['opacity'] = calcLinkOpacity(e);
                };
                processedGraph['main_itemReviewed'] = calcMainItemReviewed();
                return processedGraph;
             }

            var processedData = preProcessedGraph($scope.graph)
            console.log('reviewGraph data: ', processedData)

            $scope.data = processedData

            // trigger rendering of the graph
            $scope.$broadcast('render');
            });
        };
    });

    module.directive('reviewGraphDir', function (dashboard, alertSrv) {
        return {
        restrict: 'A',
        link: function (scope, element) {
            // Receive render events
            scope.$on('render', function () {
              render_panel();
            });

            // Re-render if the window is resized
            angular.element(window).bind('resize', function () {
            render_panel();
            });

            // Function for rendering panel
            function render_panel() {
            element.html("");
            const links = scope.data.links.map(d => Object.create(d));
            const nodes = scope.data.nodes.map(d => Object.create(d));

            var width = element.parent().width();
            var height = element.parent().width();
            //var height = parseInt(scope.row.height);

            var margin = {top: 20, right: 20, bottom: 20, left: 20};
            width = width - margin.left - margin.right;
            height = height - margin.top - margin.bottom;

            var calcLinkDistance = function(link) {
                var rel = link.rel || "isRelatedTo";
                if (rel == "sentA") { //sentPair to query sent
                return 60;
                } else if (rel == "sentB") { //sentPair to db sent
                return 20;
                } else if (rel == "isBasedOn") {
                return 20;
                } else if (rel == "appearance") {
                return 30;
                } else if (rel == "author") {
                return 60;
                } else if (rel == "itemReviewed") {
                return 40; 
                } else if (rel == "basedOn") {
                return 30;
                } else if (rel == "creator") {
                return 60;
                }
                return 30;
            }

            var svg = d3v5.select(element[0]).append("svg")
                .attr("id", scope.data.mainNode)
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom);

            var container = svg.append("g").attr("class", "container");

            var link_force = d3force.forceLink(links)
                .id(function (d) {
                    return d.id;
                })
                .distance(calcLinkDistance) // let distance depend on the type of relation?

            console.log("defining forceSimulation")

            var simulation = d3force.forceSimulation()
                .force("charge_force", d3force.forceManyBody().strength(-400))
                .force("center_force", d3force.forceCenter(width / 2, height / 2))
                .nodes(nodes)
                .force("links", link_force);

            var isolate_force = function(force, nodeFilter) {
                let init = force.initialize;
                force.initialize = function() { 
                  let fnodes = nodes.filter(nodeFilter);
                  init.call(force, fnodes); 
                };
                return force;
            }

            var drag = function(simulation) {
              function dragstarted(d) {
                if (!d3v5.event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
              }
              function dragged(d) {
                d.fx = d3v5.event.x;
                d.fy = d3v5.event.y;
              }
              function dragended(d) {
                if (!d3v5.event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
              }
              return d3v5.drag()
                  .on("start", dragstarted)
                  .on("drag", dragged)
                  .on("end", dragended);
            }

            var svg_node = function(d) {
              var result = d.append("g")
                .attr("stroke", colorByGroup)
                .attr("fill", colorByGroup);
          
              var svg = result.append("use")
                .attr("xlink:href", calcSymbolId)
                .attr("transform", d => {
                    let selectedFactor = (d.id == selectedNodeId) ? 2.0 : 1.0;
                    let scale = (d.nodeScale || 1.0) * selectedFactor;
                    return "scale(" + scale  + ")"
                })
                .attr("style", d => "opacity:" + (d.opacity || 0.8));

              svg.on("click", d => {
                  console.log("clicked on ", d);
                  var selectedNodeId = d.id;
                  svg.attr("transform", d => { //recalc scale
                      let selectedFactor = (d.id == selectedNodeId) ? 2.0 : 1.0;
                      let scale = (d.nodeScale || 1.0) * selectedFactor;
                      return "scale(" + scale  + ")"
                  })
                  var selectedNode = d.__proto__
                  d3v5.select("#selectedNode_" + scope.data.mainNode)
                    .html("<p>" + node_as_html_table(selectedNode) + "</p>");
                  if (selectedNode.rel == "itemReviewed") {
                  }
                  if (selectedNode['@type'].endsWith("Review")) {
                      d3v5.select("#reviewNode_" + scope.data.mainNode)
                        .html(`
                              <br>
                              <span class="rate" title="This review is accurate (help us improve our AI)" id="accRev">
                              <a class="icon-ok"></a>
                              <span class="accurate-stat" title="Number of Co-inform users who have rate this review as accurate"></span>
                              </span>
                              |
                              <span title="This review is inaccurate (help us improve our AI)" id="inaccRev">
                              <a class="icon-remove"></a>
                              <span class="accurate-stat" title="Number of Co-inform users who have rate this review as inaccurate"></span>
                              </span>
                            `
                            );
                  }
                  else {
                    d3v5.select("#reviewNode_" + scope.data.mainNode).html('')
                  }
      
                  // select neighborhood
                  //selectedRelatedLinks = links.filter(function (i) { 
                  //  return i.__proto__.source == d.__proto__.identifier });
                  //selectedRelatedLink = selectedRelatedLinks.filter(function (i) { 
                  //  return i.__proto__.rel == "itemReviewed" })[0].target.__proto__;
      
                  let isReview = typeof selectedNode == "object" && Object.keys(selectedNode).includes("@type") && selectedNode["@type"].endsWith("Review");
                  console.log("selected node is review?", isReview, typeof d == "object", 
                  Object.keys(d), Object.keys(d).includes("@type"));
      
                  d3v5.select("#accRev")
                    .attr("hidden", isReview ? null : true)
                    .on("click", handleAccurate(selectedNode))

                  d3v5.select("#inaccRev")
                    .on("click", handleInaccurate(selectedNode))

              });

              return result
            }
            
            let hLevels = nodes.filter(n => typeof n.hierarchyLevel == "number")
                .map(n => n.hierarchyLevel || 0);
            let maxHLevel = Math.max(...hLevels);
            console.log("Max HLevel: ", maxHLevel, "of", hLevels);
            [...Array(maxHLevel).keys()].forEach(hLevel => {
                let targetY = hLevel * height / (1 + maxHLevel)
                let hLevelFilter = n => n.hierarchyLevel == hLevel;
                simulation.force("hierarchy_y_" + hLevel, 
                isolate_force(d3v5.forceY(targetY), hLevelFilter))
                });
            
            let groups = nodes.filter(n => typeof n.group == "number")
                .map(n => n.group || 0)
            let maxGroup = Math.max(...groups);
            console.log("Max Groups: ", maxGroup, "of", groups);
            [...Array(maxGroup).keys()].forEach(group => {
                let targetX = group * width / (1 + maxGroup);
                let groupFilter = n => n.group == group;
                simulation.force("group_x_" + group,
                isolate_force(d3v5.forceX(targetX), groupFilter));
            })
            
            var selectedNodeId = null;

            const scale = d3v5.scaleOrdinal(d3v5.schemeCategory10);
            //console.log("scale 0", scale(0), "1:", scale(1), "2:", scale(2))
            var colorByGroup = function(d) {
                return scale(d.group + (d.hierarchyLevel || 0));
            }

            /* Given a node object, return the appropriate symbol id 
            The symbol must be defined as part of the encompassing svg element.
            */
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

            /* wrapper of number.toFixed in case v is not a number */
            var myToFixed = function(v) {
                if (typeof v == "number") {
                return v.toFixed(3);
                } else {
                return v;
                }
            }

            /* Given a node object, return the tooltip text */
            var itemToTooltipText = function(d) {
                // console.log("building tooltip text for", d);
                const itType = d["@type"];
                if (typeof itType == "undefined") {
                return "undefined type";
                } 
                const defaultVal = itType + ": " + d.id;
                // console.log("building tooltip text for type ", itType);
                if (itType == "NormalisedClaimReview") {
                var claimReved = d.claimReviewed || "unknown claim";
                var rating = d.reviewRating || {};
                var explanation = rating.ratingExplanation || "no explanation";
                return "Normalised ClaimReview" + 
                    "\n\tclaim: " + claimReved + 
                    "\n\texplanation: " + explanation;
                } else if (itType == "ClaimReviewNormalizer") {
                var description = d.description || "missing";
                var name = d.name || itType;
                var version = d.softwareVersion || "unknown";
                return name +
                    "\n\tversion: " + version +
                    "\n\tdescription: " + description;
                } else if (itType == "SentenceEncoder") {
                var description = d.description || "missing";
                var name = d.name || itType;
                var version = d.softwareVersion || "unknown";
                return name +
                    "\n\tversion: " + version +
                    "\n\tdescription: " + description;
                } else if (itType == "Sentence") {
                var text = d.text || "missing text";
                return itType + ":\n\t" + text;
                } else if (itType == "Article") {
                var url = d.url || "unknown";
                var publisher = d.publisher || "unkown";
                return itType + 
                    "\n\turl: " + url +
                    "\n\tpublisher: " + publisher;
                } else if (itType == "WebSite") {
                var name = d.name || "unkown";
                return itType + ": " + name;
                } else if (itType == "SentencePair") {
                var text = d.text || "missing text";
                var roleA = d.roleA || "first";
                var roleB = d.roleB || "second";
                return itType + ":\n\t" + text +
                    "\n\t1st role: " + roleA +
                    "\n\t2nd role: " + roleB;
                } else if (itType.endsWith("Review")) {
                var rating = d.reviewRating || {};
                var aspect = rating.reviewAspect || "unknown";
                var ratingValue = myToFixed(rating.ratingValue || "unknown");
                var conf = myToFixed(rating.confidence || "unknown");
                var explanation = rating.ratingExplanation || "none";
                return itType + "(" + aspect + ")" +
                    "\n\tvalue and confidence: " + ratingValue + "(" + conf + ")" +
                    "\n\texplanation: " + explanation;
                } else if (itType.endsWith("Reviewer")) {
                var description = d.description || "missing";
                var name = d.name || itType;
                var version = d.softwareVersion || "unknown";
                return name +
                    "\n\tversion: " + version +
                    "\n\tdescription: " + description;
                } else if (itType == "Organization") {
                var name = d.name || "unkown";
                return itType + ": " + name;
                } else {
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

            var itemReviewedType = () => {
                return scope.ciDoc.type
            };

            var itemReviewedUrl = (nodeId) => {
                return "http://coinform.eu/" + itemReviewedType() + "?sentence=" + scope.ciDoc.title.replace(/ /g, '&')
            };

            var createCoinformUserReview = (coinformUserReviewSchema) => {
                coinformUserReviewSchema = getCoinformUserReviewSchema();
                coinformUserReviewSchema.dateCreated = dateTime();
                coinformUserReviewSchema.author.url = mockUserUrl();
                coinformUserReviewSchema.author.identifier = mockDevUser;
                coinformUserReviewSchema.text = prompt("If you want, insert your review comment please:", "Write your comment here");
                coinformUserReviewSchema.itemReviewed.context = "http://schema.org";
                coinformUserReviewSchema.itemReviewed.type = itemReviewedType();
                coinformUserReviewSchema.itemReviewed.url = itemReviewedUrl();
                return coinformUserReviewSchema;
            }

            var confirmUserReview = (review) => {
                return confirm("Are you sure? This review will be stored in a collection", review)
            }
            
            var mockPostReview = function() {
              alert('This feature is not implemented yet');
          }
            
            var postReview = (review) => {
                jQuery.ajax({
                type: "POST",
                data: JSON.stringify(review),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                url: dashboard.current.solr.server + "user/accuracy-review",
                crossDomain: true,
                beforeSend: function(xhr){
                    xhr.withCredentials = true;
                },
                success: function(data, textStatus, request){
                    console.log(data, textStatus, request)
                    alert("your review has been submitted");
                },
                error: function(data, textStatus, request){
                    console.log(data, textStatus, request)
                    alert('POST request error!');
                }
                });
            }

            var handleAccurate = (nodeId) => {
                return function () {
                var accurateUserReview = createCoinformUserReview();
                accurateUserReview.reviewRating.ratingValue = "accurate";
                if (!accurateUserReview.text || 
                accurateUserReview.text == null ||
                accurateUserReview.text == "Write your comment here") {
                accurateUserReview.text = accurateSupportingTextReview();
                }
                console.log("User says review ", nodeId, "is accurate");
                console.log("The user review feedback is: ", accurateUserReview);
                var conf = confirmUserReview(accurateUserReview);
                if (conf == true) { 
                  mockPostReview();
                  // TODO: activate no-mock POST request
                  //postReview(accurateUserReview)
                }
                }
            }

            var handleInaccurate = nodeId => {
                return function() {
                var inaccurateUserReview = createCoinformUserReview();
                inaccurateUserReview.reviewRating.ratingValue = "inaccurate";
                if (!inaccurateUserReview.text || 
                inaccurateUserReview.text == null ||
                inaccurateUserReview.text == "Write your comment here") {
                inaccurateUserReview.text = inaccurateSupportingTextReview();
                }
                console.log("User says review ", nodeId, "is inaccurate");
                console.log("The user review feedback is: ", inaccurateUserReview);
                var conf = confirmUserReview(inaccurateUserReview);
                if (conf == true) { 
                  mockPostReview();
                  // TODO: activate no-mock POST request
                  //postReview(inaccurateUserReview)
                }
                }
            }

            var node_as_key_vals = (node, maxDepth, privateFields) => Object.entries(node)
              .filter(entry => !privateFields.includes(entry[0]))
              .flatMap(entry => {
                let [key, val] = entry;
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
                const privateFields = ["id", "hierarchyLevel", "group", "opacity", "nodeSize", "nodeScale"];
                console.log("", node["@type"], node["id"], "as table");

                let rows = node_as_key_vals(node, 2, privateFields)
                .map(entry => {
                    let [key, val] = entry;
                    return ["<tr><td>" + key.toString() + "</td><td>" +  val.toString() + "</td></tr>"]
                })
                .join(" ");
                let table = rows
                return table;
            }

            var nodeSize = function (d) {
                return 5;
            };

            var link = container.append("g")
                .attr("class", "link")
                .selectAll("polyline")
                .data(links)
                .join("polyline")
                .attr("stroke-width", d => Math.max(1, Math.sqrt(d.value)))
                .attr("stroke", "#999")
                .attr("stroke-opacity", d => d.opacity || 0.6)
                .attr("fill", d => "none")
                .attr("stroke-dasharray", d => { // some relations use dashed lines
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
            
            console.log("Adding node svg elts")
            var node = container.append("g")
                    .attr("class", "node")
                    .selectAll("circle")
                    .data(nodes)
                    .join(svg_node)
                    .attr("stroke-width", 1.5)
                    .call(drag(simulation));
            
            console.log("Setting node titles")
            node.append("title")
                .text(itemToTooltipText);
                    
            console.log("Register tick event handlers")
            simulation.on("tick", () => {
                link
                    //.attr("x1", d => d.source.x)
                    //.attr("y1", d => d.source.y)
                    //.attr("x2", d => d.target.x)
                    //.attr("y2", d => d.target.y)
                    
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

            function isConnected(a, b) {
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
              d3v5.select(this).select("use").transition() // TODO: fix node size growth
                .duration(750)
                .attr("r", (d.nodeScale * 2 + 12) * 1.5);
            })
      
            node.on("mouseout", function(d) {
              node.classed("node-active", false);
              link.classed("link-active", false);
              d3v5.select(this).select("use").transition() // TODO: fix link size growth
                .duration(750)
                .attr("r", d.nodeScale * 2 + 12);
            });

            scope.sidebarGraphEvent = function(nodeIconId){
              // Sidebar actions
              var nodeList = node._groups[0];
              var iconType = nodeIconId.split(":")[0]
              var iconId = nodeIconId.split(":")[1]
              var sideIconId = iconType + "_sideButton_" + iconId;
              // Hide/show the selected sidebar icon
              // Store the original opacity of a sidebar button
              var selectedIcon = d3v5.select("#" + sideIconId)._groups[0][0]
              var realIconOpacity = 1
              // Define the current sidebar icon state
              var iconState = selectedIcon.iconState ? false : true;
              var newIconOpacity = iconState ? 0.3 : realIconOpacity;
              // Hide or show the elements
              selectedIcon.style.opacity = newIconOpacity;
              // Update the real icon opacity
              selectedIcon.origIconOpacity = realIconOpacity;
              // Update whether or not the elements are active
              selectedIcon.iconState = iconState;

              // Iterate nodes
              var nod;
              for (nod of nodeList) {
                if (nod.innerHTML.includes('#' + iconType)) {
                  // Hide/show selected nodes
                  // Check and store the original opacity of a node
                  var origNodeOpacity = nod.origNodeOpacity ? false : true;
                  var realNodeOpacity = origNodeOpacity ? nod.getElementsByTagName('use')[0].style.opacity : nod.origNodeOpacity;
                  // Determine if current node is visible
                  var nodActive = nod.active ? false : true;
                  var newNodeOpacity = nodActive ? 0 : realNodeOpacity;
                  var nodData = nod.__data__;
                  if (nodData == undefined) {continue;};
                  // Hide or show the elements
                  nod.getElementsByTagName('use')[0].style.opacity = newNodeOpacity;
                  // Update the real node opacity
                  nod.origNodeOpacity = realNodeOpacity;
                  // Update whether or not the elements are active
                  nod.active = nodActive;

                  // Hide/show also related links
                  var linkList = link._groups[0];
                  var lin;
                  for (lin of linkList) {
                    var linkData = lin.__data__;
                    if ((linkData.source.index == nodData.index) ||
                        (linkData.target.index == nodData.index)) {
                      // Check and store the original opacity of a link
                      var origLinkOpacity = lin.origLinkOpacity ? false : true;
                      var realLinkOpacity = origLinkOpacity ? lin.attributes['stroke-opacity']['value'] : lin.origLinkOpacity;
                      // Determine if current link is visible
                      var linkActive = lin.active ? false : true;
                      var newLinkOpacity;
                      if (linkActive) {
                        newLinkOpacity = 0;
                      }
                      else {
                          var sourceNode = nodeList.filter(nod => nod.__data__.index == linkData.source.index);
                          var targetNode = nodeList.filter(nod => nod.__data__.index == linkData.target.index);
                          var sourceNodeOpacity = sourceNode[0].active ? false : true;
                          var targetNodeOpacity = targetNode[0].active ? false : true;
                          if ((sourceNodeOpacity == true) && (targetNodeOpacity == true))
                            {
                            newLinkOpacity = realLinkOpacity;
                          }
                          else {
                            newLinkOpacity = 0;
                          }
                      }
                      // Hide or show the elements
                      lin.attributes['stroke-opacity']['value'] = newLinkOpacity;
                      // Update the real node opacity
                      lin.origLinkOpacity = realLinkOpacity;
                      // Update whether or not the elements are active
                      lin.active = linkActive;
                      // Update also the middle arrow
                      if (lin.attributes['stroke-opacity']['value'] == 0) {
                        lin.attributes['marker-mid']['value'] = ""
                      }
                      else {
                        lin.attributes['marker-mid']['value'] = "url(#arrow)"
                      }
                    }
                  }
                };
              };
            };
           }
          }
        };
    });
});