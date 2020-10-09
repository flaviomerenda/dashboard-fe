/* rgProcessor.js service for:
 1. enriching acred credibility review Graphs to make them compatible with D3js force-graphs
   * both graphs contains nodes and links
   * Adds calculated field values id, hierarchyLevel, group, originalOpacity, opacity, nodeSize, nodeScale and enabledNode to nodes.
   * Adds calculated field values value, originalOpacity and opacity to links

 2. providing common extractor functions to access and calculate information about
   nodes and links in the graph
*/
define([
    'angular',
    'underscore',
    'config',
    ],

    function (angular, _) {
        'use strict';

        var module = angular.module('kibana.services');
        var DEBUG = false; // DEBUG mode

        /////
        //  Searcher constructor, object provides functions to search
        //  nodes or links in the graph
        /////
        function Searcher(graph) {

            // given the role name in a link, return the inverse
            let inverseLinkRole = function(role) {
                if (role == 'source') return 'target'
                else return 'source';
            }
            this.inverseLinkRole = inverseLinkRole;
            
            // given a node id, find a matching node object in the graph
            //  may return null, of course
            let nodeById = function(nid) {
                let matching = graph['nodes'].filter(n => n['id'] == nid);
                if (matching.length > 0) {
                    return matching[0];
                }
                return null;
            }
            this.nodeById = nodeById;
            
            // Find nodes associated to a query node and link
            //  qnode: obj query node in the graph
            //  qrel: str name of a link type
            //  qnodeRole: str whether the qnode is the source or target
            let lookupNodes = function(qnode, qrel, qnodeRole) {
                if ('id' in qnode == false) {
                    console.log('Cannot lookup triple for node without id. Node: ', qnode);
                    return [];
                };
                let resRole = inverseLinkRole(qnodeRole);
                let qnodeId = qnode['id'];
                let resIds = graph['links']
                    .filter(link => (link['rel'] == qrel) && (qnodeId == link[qnodeRole]))
                    .map(link => link[resRole])
                return resIds.map(n => nodeById(n));
            }

            this.lookupNodes = lookupNodes;
            
            // find a source node given a start node and a link type
            //  e.g. if g = [(n2, r1, n1), (n3, r1, n1)]
            //   lookupSubject(n1, r1) will return either n2 or n3
            this.lookupSubject = function(node, rel) {
                let matchingNodes = this.lookupNodes(node, rel, 'target');
                if (matchingNodes.length == 0) {
                    return undefined;
                } 
                return matchingNodes[0];
            }
            
            // find a target node given a start node and a link type
            this.lookupObject = function(node, rel) {
                let matchingNodes = this.lookupNodes(node, rel, 'source');
                if (matchingNodes.length == 0) {
                    return undefined;
                }
                return matchingNodes[0];
            }

            this.findMainItemReviewed = function() {
                var nid = graph['mainNode'];
                if (nid == null) {
                    return null;
                }
                var crev = this.nodeById(nid);
                if (crev) {
                    return this.lookupObject(crev, 'itemReviewed');
                }
                return null;
            }

            // Given a start node and a relation (type), return the closure of all nodes
            // reachable by following relevant links.
            // FIXME: Note that if there are cycles in the graph, this never ends!!
            //   add a parameter of seen nodes, so we can break the cycle.
            this.lookupNodesInRelClosure = function(node, rel) {
                let directObjects = this.lookupNodes(node, rel, 'source');
                return [node].concat(
                    directObjects.flatMap(subNode => this.lookupNodesInRelClosure(subNode, rel)));
            }

            // Given a node, assumed to be a review, return
            // neighbouring nodes for certain relations
            this.getReviewLinkedNodes = function(reviewNode) {
                let rels = ['sentA', 'sentB', 'author', 'creator', 'itemReviewed', 'appearance'];
                let linkedNodes = rels.flatMap(rel => lookupNodes(reviewNode, rel, 'source'))
                return linkedNodes
            }

            this.findCriticalPath = function(mainNode, rel='isBasedOnKept') {
                let nodesInClosure = this.lookupNodesInRelClosure(mainNode, rel)
                let neighNodes = nodesInClosure.flatMap(this.getReviewLinkedNodes);
                return nodesInClosure.concat(neighNodes);
            }
            
        };

        /////
        // NodeMapper constructor. Object provides functions to map nodes in the graph to
        // relevant calculated values such as nodeTypes, countRates, scale and opacity.
        /////
        function NodeMapper(graph) {

            let search = new Searcher(graph);
            
            // extract node type, this reduces many subtypes into top-level types
            // Review, Bot, CreativeWork, Organization, Thing, ??
            // e.g. TweetCredReview is just a Review
            this.calcNodeType = function(d) {
                let dt = d['@type'] || d['type'] || 'Thing';
                let botTypes = ['ClaimReviewNormalizer', 'SentenceEncoder']
                let creativeWorkTypes = ['CreativeWork', 'Article', 'Tweet', 'WebSite',
                                         'Dataset', 'Sentence', 'SentencePair']
                if (dt.endsWith('Review')) {
                    return 'Review';
                } 
                else if (dt == 'Rating') {
                    return 'Review'; // incorrect, but OK for now, this is a bug upstream
                } 
                else if (botTypes.includes(dt)) {
                    return 'Bot';
                } 
                else if (dt.endsWith('Reviewer')) {
                    return 'Bot';
                } 
                else if (creativeWorkTypes.includes(dt)) {
                    return 'CreativeWork'; // content
                }
                else if (dt.endsWith('Organization')) {
                    return 'Organization';
                } 
                else {
                    return dt;
                }
            }

            // list of unique high-level NodeTypes
            this.ntypes = Array.from(new Set(graph['nodes'].map(this.calcNodeType)));

            // Given a Review node, return a rate between 0.0 and 1.0
            //  which is the percentage of reviewRating.reviewCount relative to a maxReviewCount
            this.reviewCountRate = function(d, maxReviewCount=20) {
                //let maxReviewCount = 20;
                if (maxReviewCount <= 0.0)
                    throw Exception('maxReviewCount must be a positive number, not ' + maxReviewCount );
                // assume d is a Review
                let rating = d['reviewRating'] || {};
                let revCnt = Math.abs(Math.min(maxReviewCount, rating['reviewCount'] || 1));
                return Math.min(1.0, revCnt / maxReviewCount);
            }

            // calculate node opacity based on its attributes, currently
            //   reviews get more opaque if they have more confidence
            //   bots and content reviewed inherit the opacity of a near review
            this.calcNodeOpacity = function(d) {
                let dt = this.calcNodeType(d);
                let minOpacity = 0.2;
                if (dt == 'Review') { //based on confidence
                    let rating = d['reviewRating'] || {};
                    let conf = rating['confidence'] || 0.7;
                    let opacity = minOpacity + ((1 - minOpacity) * conf**2);
                    return opacity;
                } 
                else if (dt == 'Bot') {
                    // use the opacity of one of the bot's reviews, if any
                    var revNode = search.lookupSubject(d, 'author');
                    if (revNode) {  
                        return this.calcNodeOpacity(revNode);
                    } else {
                        return minOpacity;
                    }
                } 
                else {
                    // assume it's some content that was reviewed
                    var revNode = search.lookupSubject(d, 'itemReviewed');
                    if (revNode) {
                        return this.calcNodeOpacity(revNode);
                    } else {
                        return minOpacity;
                    }
                }
            }

            // calculate node scale
            //  ClaimReview are always big
            //  Other reviews grow bigger as they are based on more subReviews
            //  CreativeWork inherit the scale of a review
            //  all other nodes have minimum scale
            this.calcNodeScale = function(d) {
                let minScale = 2.0;
                let maxScale = 3.5; 
                let dt1 = d['@type'] || d['type'] || 'Thing';
                if (dt1 == 'NormalisedClaimReview') {
                    return maxScale;
                }
                let dt2 = this.calcNodeType(d) 
                if (dt2.endsWith('Review')) {
                    //return Math.max(minScale, maxScale*rate);
                    return minScale + Number((maxScale - minScale) * this.reviewCountRate(d));
                } else if (dt2 == 'CreativeWork') {
                    var revN = search.lookupSubject(d, 'itemReviewed');
                    if (revN) {
                        return this.calcNodeScale(revN);
                    } else {
                        return minScale
                    }
                } else {
                    return minScale
                }
            }

            // given a node, return an int for the depth level of the node in the graph
            //  depth is given by:
            //    the `isBasedOn` relation for Reviews
            //    Bots and CreativeWorks inherit nearby Review depth
            this.calcNodeHierarchy = function(d) {
                let maxHLevel = 10;
                var dt = this.calcNodeType(d);
                var topNid = graph['mainNode'];
                if (dt == "Review") {
                    if (topNid == d['id']) {
                        return 0;
                    } 
                    var parentN = search.lookupSubject(d, 'isBasedOn');
                    if (parentN) {
                        return 1 + this.calcNodeHierarchy(parentN);
                    }
                    console.log('Could not find parent node')
                    return maxHLevel;
                } else if (dt == 'Bot') {
                    // inherit the hierarchy level of the review
                    var revN = search.lookupSubject(d, 'author');
                    if (revN) {
                        return this.calcNodeHierarchy(revN);
                    }
                    // orphan bot
                    return maxHLevel;
                } else {
                    // assume it's some CreativeWork that was reviewed
                    var nReviewer = search.lookupSubject(d, 'itemReviewed');
                    if (nReviewer) {
                        return this.calcNodeHierarchy(nReviewer);
                    }
                    return maxHLevel;
                }
            }
        }

        //////
        //  LinkMapper constructor. Provides functions to map links in the graph to
        //  relevant calculated values such as a weight or opacity value.
        //////
        function LinkMapper(graph) {
            let nodeMapper = new NodeMapper(graph);
            let search  = new Searcher(graph);
            
            // calculate a numeric value for a link in the graph
            //   this value is mapped to its stroke-width
            this.calcLinkValue = function(link) {
                return 2.0;
            }
            
            // given a link in a graph, calculate its opacity
            //   this is done based on the link type
            //   sometimes the opacity is inherited from one of the nodes    
            this.calcLinkOpacity = function(link) {
                var rel = link['rel'];
                var sent = ['sentA', 'sentB'];
                var author = ['author', 'creator'];
                if (sent.includes(rel)) {
                    return 0.8;
                } 
                else if (rel == 'isBasedOn') {
                    return nodeMapper.calcNodeOpacity(search.nodeById(link['target']));
                } 
                else if (author.includes(rel)) {
                    return 0.4;
                } 
                else if (rel == 'itemReviewed') {
                    return nodeMapper.calcNodeOpacity(search.nodeById(link['source']));
                } 
                else if (rel == 'basedOn') {
                    return nodeMapper.calcNodeOpacity(search.nodeById(link['source']));
                } 
                else if (rel == 'appearance') {
                    return 0.8;
                } 
                else {
                    return 0.8;
                }
            }
        }
        
        module.service('rgProcessor', function() {

            this.search = graph => new Searcher(graph);
            this.nodeMapper = graph => new NodeMapper(graph);
            this.linkMapper = graph => new LinkMapper(graph);
            
            // given a graph, return the label for the main item reviewed...
            //   FIXME: creating a label for an item is a separate function
            this.calcMainItemReviewedLabel = function(graph) {
                let itReved = this.search(graph).findMainItemReviewed() || {};
                let itType = itReved['@type'] || itReved['type'] || 'Thing';
                let text = itReved['headline'] || itReved['text'] || itReved['content'] || '??';
                if (text.length > 60) {
                    text = text.slice(0, 60) + "...";
                }
                return String(itType) + ': ' + '"' + String(text) + '"';
            }
                
            this.processGraph = function(graph) {
                /* Modifies the input credibility review graph by calculating and adding
                 d3 specific fields to nodes and links:
                 new node fields:
                   * id: either the identifier, '@id' of 'url' value
                   * hierarchyLevel: int with depth from the mainNode 
                   * group: int based on the nodeType (e.g. Review, Bot, Thing)
                   * originalOpacity: used to store "temporary" opacity //FIXME: we should be able to calculate opacity based on some global state, instead of introducing state here
                   * opacity: used to store the "current" opacity
                   * nodeSize: deprecated, useful only if using svg circle
                   * nodeScale: used to transform the standard size of the svg element
                   * enabledNode: bool currently fixed to true

                 new link fields:
                   * value: float, currently fixed
                   * originalOpacity: 
                   * opacity: 
                 */
                
                //this.graph = graph // FIXME: introduces state (used in some of the other "functions")
                let nMapper = this.nodeMapper(graph);
                let lMapper = this.linkMapper(graph);

                for (var n of graph['nodes']) {
                    var nid = n['identifier'] || n['@id'] || n['url'];
                    n['id'] = nid;
                }
                for (var n of graph['nodes']) {
                    var hlevel = nMapper.calcNodeHierarchy(n);
                    n['hierarchyLevel'] = hlevel;
                }
                for (n of graph['nodes']) {
                    var nt = nMapper.calcNodeType(n);
                    n['group'] = nMapper.ntypes.indexOf(nt);
                    n['originalOpacity'] = nMapper.calcNodeOpacity(n);
                    n['opacity'] = n['originalOpacity'];
                    let nscale = nMapper.calcNodeScale(n);
                    n['nodeScale'] = nscale;
                    n['enabledNode'] = true
                }
                for (var l of graph['links']) {
                    l['value'] = lMapper.calcLinkValue(l);
                    l['originalOpacity'] = lMapper.calcLinkOpacity(l);
                    l['opacity'] = l['originalOpacity'];
                };
                
                graph['mainItemReviewed'] = this.calcMainItemReviewedLabel(graph);
                graph['id'] = graph.mainNode

                if (DEBUG) {
                    let hlevels = processedGraph['nodes'].
                        filter(n => n.hierarchyLevel != null).
                        map(   n => n['hierarchyLevel']);
                    console.debug('min/max hierarchy levels: ', Math.min(...hlevels), Math.max(...hlevels))
                }

                return graph;
            }

        });
    }
);
