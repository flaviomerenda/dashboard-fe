/*
  ## D3 Force Diagram Integrated with Banana.
*/

define([
    'angular',
    'app',
    'underscore',
    'jquery',
    'kbn',
    'd3',
    'd3-force'
  ],
  function (angular, app, _, $, kbn, d3, d3force) {
    'use strict';

    var FORCE_SEARCH_FOR_NODE_EVENT = "reviewGraph-search-for-node";

    var module = angular.module('kibana.panels.reviewGraph', []);
    app.useModule(module);

    module.controller('reviewGraph', function ($scope, querySrv, dashboard, filterSrv, $rootScope, $http) {
      $scope.panelMeta = {
        modals: [{
          description: "Inspect",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }],
        editorTabs: [{
          title: 'Queries',
          src: 'app/partials/querySelect.html'
        }],
        status: "Experimental",
        description: "Display a reviewGraph diagram."
      };

      $scope.init = function () {
        $scope.$on('refresh', function () {
          $scope.get_data();

        });
        $scope.get_data();
      };

      // default values
      var _d = {
        queries: {
          mode: 'all',
          ids: [],
          query: '*:*',
          custom: ''
        },
        facet_limit: "10,20", // maximum number of rows returned from Solr
        node_size_weight: 0,
        link_width_weight: 0,
        link_strength_weight: 0,
        link_distance_weight: 0,
        strength: -400,
        colors: "#1f77b4, #ff7f0e, #2ca02c, #d62728, #9467bd, #8c564b, #e377c2, #7f7f7f, #bcbd22, #17becf",
        mute_category_1: false,
        mute_category_2: true,
        spheres: true,
        spyable: true,
        show_queries: true,
      };

      _.defaults($scope.panel, _d);
      var DEBUG = false;

      $scope.get_data = function () {
        // Show progress by displaying a spinning wheel icon on panel
        $scope.panelMeta.loading = true;
        delete $scope.panel.error;

        var request, results;
        // Set Solr server
        $scope.sjs.client.server(dashboard.current.solr.server + dashboard.current.solr.core_name);
        // -------------------- TODO: REMOVE ALL ELASTIC SEARCH AFTER FIXING SOLRJS --------------
        $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
        // This could probably be changed to a BoolFilter
        var boolQuery = $scope.sjs.BoolQuery();
        _.each($scope.panel.queries.ids, function (id) {
          boolQuery = boolQuery.should(querySrv.getEjsObj(id));
        });
        request = $scope.sjs.Request().indices(dashboard.indices);
        request = request.query(
          $scope.sjs.FilteredQuery(
            boolQuery,
            filterSrv.getBoolFilter(filterSrv.ids)
          )); // Set the size of query result
        $scope.populate_modal(request);
        // --------------------- END OF ELASTIC SEARCH PART ---------------------------------------

        // Construct Solr query
        var fq = '';
        if (filterSrv.getSolrFq()) {
          fq = '&' + filterSrv.getSolrFq();
        }
        var wt_json = '&wt=json';
        var rows = '&rows=10';

        $scope.panel.queries.query = querySrv.getORquery() + fq + wt_json + rows;
        if (DEBUG) {
          console.log($scope.panel.queries.query);
        }
        console.log('query: ', $scope.panel.queries.query) // query
        
        // Set the additional custom query
        if ($scope.panel.queries.custom != null) {
          request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
        } else {
          request = request.setQuery($scope.panel.queries.query);
        }

        // Execute the search and get results
        results = request.doSearch();
        results.then(function (results) {
          let doc = results.response.docs[0]
          let doc_id = doc['id'];
          let baseUrl = dashboard.current.solr.server
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
            let graph = result['reviewGraph'];
            if (graph == null) {
            alertSrv.set('Warning', 'No review available for this document. Sorry.');
            } else {
            console.log('Retrieved review graph with', graph['nodes'].length, 'nodes and', graph['links'].length, 'links');
            //TODO: trigger display of graph
            }

            var preProcessedGraph = function(graph) {
              //Load graph from json and add chart-specific fields to nodes and links
              //The chart-specific fields are tailored to the d3-force requirements 
            
              // add group property to nodes and value property to links
              // this is just so the current force chart implementation works, 
              // TODO: modify the chart implementation to assign correct values to different 
              // nodes based on their property values
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
                  else minOpacity;
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
                  var revCnt = Math.min(maxReviewCount, rating['reviewCount'], 1);
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
                  var revCnt = Math.min(maxReviewCount, rating['reviewCount'], 1);
                  var rate = revCnt / maxReviewCount;
                  return Math.max(1.0, maxScale*rate);
                }
                else if (dt == 'CreativeWork') {
                  var revN = lookupSubject(d, 'itemReviewed');
                  if (revN) {
                    return calcNodeScale(revN);
                  }
                    else 1.0
                  } 
                else {
                  return 1.0
                }
              }
            
              var nodeById = function(nid) {
                var matching = graph['nodes'].filter(n => n['id'] == nid);
                if (matching.length > 0) {
                  return matching[0];
                } return;
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
                var resIds = graph['links'].filter(link => link[resRole] == link['rel'] == qrel && qnodeId == link[qnodeRole]);
                // var resIds = [for (link of graph['links']) if ( link['rel'] == qrel && qnodeId == link[qnodeRole]) link[res_role]];
                // [link[res_role] for link in graph.get('links', []) if link.get('rel', '') == qrel and qnode_id == link.get(qnode_role)]
                return [resIds.filter(nid => nodeById(nid))];
              }
            
              var lookupSubject = function(node, rel) {
                var matchingNodes = lookupNodes(node, rel, 'target');
                if (matchingNodes.length == 0) {
                  return;
                } 
                 else {
                  matchingNodes[0];
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
                }
                return "??"
              }
            
              var calcNodeHierarchy = function(d) {
                var seen = [];
                var dt = calcNodeType(d);
                var topNid = graph['mainNode'];
                if (dt == "Review") {
                  if (topNid == d['id']) {
                    return 0;
                  } else {
                      var parentN = lookupSubject(d, 'isBasedOn');
                      if (parentN) {
                        return 1 + calcNodeHierarchy(parentN, seen + [d])
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
            
              var ntypes = Array.from(new Set(graph['nodes'].map(n => calcNodeType(n))));
              var rtypes = Array.from(new Set(graph['links'].map(e => e['rel'] || e['relatedTo'])));
            
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
            
              var processedGraph = processGraph(graph)
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

            var processedData = preProcessedGraph(graph)
            console.log('this is the data: ', processedData)
            $scope.data = processedData
            $scope.adjlist = [];
            $scope.selList = {};
            $scope.selListCopy = {};
            $scope.hoverList = {};
            $scope.taList = [];
            $scope.$on('typeahead-updated', function() {
              $scope.searchForNode();
            });

            $scope.data.nodes.forEach(function (d) {
              if ((d.group === 1 && $scope.panel.mute_category_1) || (d.group === 2 && $scope.panel.mute_category_2)) {
                $scope.selList["n" + d.node] = false;
              } else {
                $scope.selList["n" + d.node] = true;
              }

              $scope.taList.push(d.name);
            });

            $scope.selListCopy = _.extend({}, $scope.selList);

            $scope.data.links.forEach(function (d) {
              $scope.adjlist[d.source + "-" + d.target] = true;
              $scope.adjlist[d.target + "-" + d.source] = true;
            });

            $scope.render();
          }, function (error) {
            console.log(error);
          });
        });
      };

      $scope.dash = dashboard;
      $scope.set_refresh = function (state) {
        $scope.refresh = state;
      };

      $scope.close_edit = function () {
        if ($scope.refresh) {
          $scope.get_data();
        }
        $scope.refresh = false;
        $scope.$emit('render');
      };

      $scope.render = function () {
        $scope.$emit('render');
      };

      $scope.populate_modal = function (request) {
        $scope.inspector = angular.toJson(JSON.parse(request.toString()), true);
      };

      $scope.pad = function (n) {
        return (n < 10 ? '0' : '') + n;
      };

      $scope.set_filters = function (d) {
        if (DEBUG) {
          console.log("Setting Filters to " + d);
        }
        for (var i = 0; i < d.length; i++) {
          filterSrv.set({
            type: 'terms',
            field: $scope.panel.facet_pivot_strings[i].replace(/ /g, ''),
            mandate: 'must',
            value: d[i]
          });
          console.log($scope.panel.facet_pivot_strings[i].replace(/ /g, '') + ' - ' + d[i]);

        }

        dashboard.refresh();
      };

    });

    module.directive('reviewGraphChart', function ($rootScope) {
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
            console.log("Loaded", nodes.length, "nodes and", links.length, "links")

            var width = element.parent().width();
            var height = parseInt(scope.row.height);

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

            console.log("Creating svg node")

            var svg = d3.select(element[0]).append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom);

            var container = svg.append("g").attr("class", "container");

            console.log("Register zoom handler")
            var zoom = d3.zoom()
              .scaleExtent([0.1, 4])
              .on("zoom", function () {
                container.attr("transform", d3.event.transform);
              });

            svg.call(zoom);

            var link_force = d3force.forceLink(links)
              .id(function (d) {
                return d.id;
              })
              .distance(calcLinkDistance) // let distance depend on the type of relation?

            if (scope.panel.link_strength_weight !== 0) {
              link_force.strength(function (d) {
                return Math.sqrt(d.value * scope.panel.link_strength_weight);
              });
            }
            if (scope.panel.link_distance_weight !== 0) {
              link_force.distance(function (d) {
                return Math.sqrt(d.value * scope.panel.link_distance_weight);
              });
            }

            console.log("defining forceSimulation")

            var simulation = d3force.forceSimulation()
              .force("charge_force", d3force.forceManyBody().strength(scope.panel.strength))
              .force("center_force", d3force.forceCenter(width / 2, height / 2))
              .nodes(nodes)
              .force("links", link_force);

            var isolate_force = function(force, nodeFilter) {
              let init = force.initialize;
              force.initialize = function() { 
                let fnodes = nodes.filter(nodeFilter);
                init.call(force, fnodes); };
              return force;
            }

            var link = container.append("g")
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
                  } else {
                    return null;
                  }
                })
                .attr("marker-mid", d => "url(#arrow)");

            link.append("title")
                .text(d => d.rel)
            
            let hLevels = nodes.filter(n => typeof n.hierarchyLevel == "number")
              .map(n => n.hierarchyLevel || 0);
            let maxHLevel = Math.max(...hLevels);
            console.log("Max HLevel: ", maxHLevel, "of", hLevels);
            [...Array(maxHLevel).keys()].forEach(hLevel => {
              let targetY = hLevel * height / (1 + maxHLevel)
              let hLevelFilter = n => n.hierarchyLevel == hLevel;
              simulation.force("hierarchy_y_" + hLevel, 
                isolate_force(d3.forceY(targetY), hLevelFilter))
              });
            
            let groups = nodes.filter(n => typeof n.group == "number")
              .map(n => n.group || 0)
            let maxGroup = Math.max(...groups);
            console.log("Max Groups: ", maxGroup, "of", groups);
            [...Array(maxGroup).keys()].forEach(group => {
              let targetX = group * width / (1 + maxGroup);
              let groupFilter = n => n.group == group;
              simulation.force("group_x_" + group,
                isolate_force(d3.forceX(targetX), groupFilter));
            })
            
            var selectedNodeId = null;

            // TODO: remove this? or define groups that make sense in the context of ClaimReviews
            const scale = d3.scaleOrdinal(d3.schemeCategory10);
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
              } else if (itType == "NormalisedClaimReview") {
                return "#claimReview_accurate";
              } else if (itType.endsWith("Review")) {
                return "#review";
              } else if (itType == "ClaimReviewNormalizer") {
                return "#bot";
              } else if (itType == "SentenceEncoder") {
                return "#bot";
              } else if (itType.endsWith("Reviewer")) {
                return "#bot";
              } else if (itType == "Sentence") {
                return "#sentence";
              } else if (itType == "Article") {
                return "#article";
              } else if (itType == "WebSite") {
                return "#website";
              } else if (itType == "SentencePair") {
                return "#sentence_pair";
              } else {
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
                  "\\n\\tclaim: " + claimReved + 
                  "\\n\\texplanation: " + explanation;
              } else if (itType == "ClaimReviewNormalizer") {
                var description = d.description || "missing";
                var name = d.name || itType;
                var version = d.softwareVersion || "unknown";
                return name +
                  "\\n\\tversion: " + version +
                  "\\n\\tdescription: " + description;
              } else if (itType == "SentenceEncoder") {
                var description = d.description || "missing";
                var name = d.name || itType;
                var version = d.softwareVersion || "unknown";
                return name +
                  "\\n\\tversion: " + version +
                  "\\n\\tdescription: " + description;
              } else if (itType == "Sentence") {
                var text = d.text || "missing text";
                return itType + ":\\n\\t" + text;
              } else if (itType == "Article") {
                var url = d.url || "unknown";
                var publisher = d.publisher || "unkown";
                return itType + 
                  "\\n\\turl: " + url +
                  "\\n\\tpublisher: " + publisher;
              } else if (itType == "WebSite") {
                var name = d.name || "unkown";
                return itType + ": " + name;
              } else if (itType == "SentencePair") {
                var text = d.text || "missing text";
                var roleA = d.roleA || "first";
                var roleB = d.roleB || "second";
                return itType + ":\\n\\t" + text +
                  "\\n\\t1st role: " + roleA +
                  "\\n\\t2nd role: " + roleB;
              } else if (itType.endsWith("Review")) {
                var rating = d.reviewRating || {};
                var aspect = rating.reviewAspect || "unknown";
                var ratingValue = myToFixed(rating.ratingValue || "unknown");
                var conf = myToFixed(rating.confidence || "unknown");
                var explanation = rating.ratingExplanation || "none";
                return itType + "(" + aspect + ")" +
                  "\\n\\tvalue and confidence: " + ratingValue + "(" + conf + ")" +
                  "\\n\\texplanation: " + explanation;
              } else if (itType.endsWith("Reviewer")) {
                var description = d.description || "missing";
                var name = d.name || itType;
                var version = d.softwareVersion || "unknown";
                return name +
                  "\\n\\tversion: " + version +
                  "\\n\\tdescription: " + description;
              } else if (itType == "Organization") {
                var name = d.name || "unkown";
                return itType + ": " + name;
              } else {
                return defaultVal;
              }
              return defaultVal;
            }

            // create usr feedback (review)

            var getCoinformUserReviewSchema = () => {
              var coinformUserReviewDict = `{
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
            }`;

            return JSON.parse(coinformUserReviewDict);
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

            var mockReviewUrl = () => {
              var mockId = Math.random().toString().slice(2,);
              return mockUserUrl() + "/" + mockId
            };

            var accurateSupportingTextReview = () => {
              return "The " + getCoinformUserReviewSchema().type + " is correct";
            };

            var inaccurateSupportingTextReview = () => {
              return "The " + getCoinformUserReviewSchema().type + " is incorrect";
            };

            var itemReviewedType = (selectedRelatedLink) => {
              return selectedRelatedLink["@type"]
            };

            var itemReviewedUrl = (selectedRelatedLink) => {
              return "http://coinform.eu/sentence?text=" + selectedRelatedLink.text
            };

            var createCoinformUserReview = (coinformUserReviewSchema) => {
              coinformUserReviewSchema = getCoinformUserReviewSchema();
              coinformUserReviewSchema.dateCreated = dateTime();
              coinformUserReviewSchema.url = mockReviewUrl();
              coinformUserReviewSchema.author.url = mockUserUrl();
              coinformUserReviewSchema.author.identifier = mockDevUser;
              coinformUserReviewSchema.text = prompt("If you want, insert your review comment please:", "Write your comment here");
              //coinformUserReviewSchema.itemReviewed.context = "http://schema.org";
              //coinformUserReviewSchema.itemReviewed.type = itemReviewedType(selectedRelatedLink);
              //coinformUserReviewSchema.itemReviewed.url = itemReviewedUrl(selectedRelatedLink);
              return coinformUserReviewSchema;
            }

            var confirmUserReview = (review) => {
              return confirm("Are you sure? This review will be stored in a collection", review)
            }

            var postReview = (review) => {
              jQuery.ajax({
                type: "POST",
              data: JSON.stringify(review),
              contentType: "application/json; charset=utf-8",
                dataType: "json",
                url: "http://127.0.0.1:8070/test/api/v1/user/accuracy-review",
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
                  postReview(accurateUserReview)
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
                  postReview(inaccurateUserReview)
                }
              }
            }

            var drag = function(simulation) {
              function dragstarted(d) {
                if (!d3.event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
              }
              function dragged(d) {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
              }
              function dragended(d) {
                if (!d3.event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
              }
              return d3.drag()
                  .on("start", dragstarted)
                  .on("drag", dragged)
                  .on("end", dragended);
            }

            var node_as_key_vals = (node, maxDepth, privateFields) => Object.entries(node)
              .filter(entry => !privateFields.includes(entry[0]))
              .flatMap(entry => {
                let [key, val] = entry;
                if (typeof val == "object" && maxDepth > 0) {
                  return node_as_key_vals(val, maxDepth - 1, privateFields)
                    .map(entry2 => [key + "." + entry2[0], entry2[1]]);
                } else if (typeof val == "object") {
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
              let table = "<font size='3'>  <table id=t01>" + rows + "</table> </font>"
              return table;
            }

            var nodeSize = function (d) {
              if (scope.panel.node_size_weight === 0) {
                return 5;
              } else {
                return (scope.panel.node_size_weight * Math.sqrt(d.count)) + 4;
              }
            };

            var svg_node = function(d) {
              var result = d.append("g")
                .attr("stroke", colorByGroup)
                .attr("fill", colorByGroup);
          
                var use = result.append("use")
                  .attr("xlink:href", calcSymbolId)
                  .attr("transform", d => {
                      let selectedFactor = (d.id == selectedNodeId) ? 2.0 : 1.0;
                      let scale = (d.nodeScale || 1.0) * selectedFactor;
                      return "scale(" + scale  + ")"
                    })
                  .attr("style", d => "opacity:" + (d.opacity || 0.8));

                use.on("click", d => {
                  console.log("clicked on ", d);
                  var selectedNodeId = d.id;
                  use.attr("transform", d => { //recalc scale
                      let selectedFactor = (d.id == selectedNodeId) ? 2.0 : 1.0;
                      let scale = (d.nodeScale || 1.0) * selectedFactor;
                      return "scale(" + scale  + ")"
                    })
                    var selectedNode = d.__proto__
                          d3.select("#selectedNode")
                            .html("<h2> > check and review the selected node</h2> <p>" + node_as_html_table(selectedNode) + "</p>");
                            if (selectedNode.rel == "itemReviewed") {
                              console.log("this is the target: ", selectedNode.target)
                            }
                            if (selectedNode['@type'].endsWith("Review")) {
                              d3.select("#reviewNode")
                                .html("<p><button class='button' id='accRev'>Accurate</button>" +
                                      "<button class='button' id='inaccRev'>Incorrect</button></p>");
                                }
                            else {
                              d3.select("#reviewNode")
                                .html("<p>cannot be reviewed</p>")
                            }
              
                          // select neighborhood
                          //selectedRelatedLinks = links.filter(function (i) { 
                          //  return i.__proto__.source == d.__proto__.identifier });
                          //selectedRelatedLink = selectedRelatedLinks.filter(function (i) { 
                          //  return i.__proto__.rel == "itemReviewed" })[0].target.__proto__;
              
                          let isReview = typeof selectedNode == "object" && Object.keys(selectedNode).includes("@type") && selectedNode["@type"].endsWith("Review");
                          console.log("selected node is review?", isReview, typeof d == "object", 
                            Object.keys(d), Object.keys(d).includes("@type"));
              
                          d3.select("#accRev")
                            .attr("hidden", isReview ? null : true)
                            .on("click", handleAccurate(selectedNode))
              
                          d3.select("#inaccRev")
                            .on("click", handleInaccurate(selectedNode))
                  });

              return result
            }
            
            console.log("Adding node svg elts")
            var node = container.append("g")
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

            $rootScope.$on(FORCE_SEARCH_FOR_NODE_EVENT, function (e, q) {
              var lq = q.toLowerCase().trim();

              if (lq === "") {
                scope.selList = _.extend({}, scope.selListCopy);
              } else {
                scope.selListCopy = _.extend({}, scope.selList);

                node.each(function(d) {
                  scope.selList["n" + d.node] = d.name.toLowerCase().indexOf(lq) !== -1;
                });
              }
            });

            scope.panelMeta.loading = false;
          }
        }
      };
    });
  });
