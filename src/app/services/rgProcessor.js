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

        //////
        // Some general schema-level functions and lists
        /////
        
        // fields whose values can uniquely identify a node
        let nodeIdFields = ['identifier', '@id', 'url', 'id'];

        // given the role name in a link, return the inverse
        let inverseLinkRole = function(role) {
            if (role == 'source') return 'target'
            else return 'source';
        }

        let nodeRef2Id = function(nodeRef) {
            // a nodeRef can be an object with an id str value
            //  or a str value, we assume it refers to a node in some graph 
            let typ = typeof nodeRef;
            if (typ === 'object') return nodeRef.id
            else if (typ === 'string') return nodeRef
            else throw "Unexpected nodeRef value " + typ + ':' + nodeRef;
        }

        
        /////
        //  Searcher constructor, object provides functions to search
        //  nodes or links in the graph
        /////
        function Searcher(graph) {

            let linkedNodeIds = Array.from(
                new Set([...graph.links.map(l => nodeRef2Id(l.source)),
                         ...graph.links.map(l => nodeRef2Id(l.target))]))

            // returns *all* possible identifier values 
            let findNodeIds = n => nodeIdFields.map(field => n[field])
                .filter(value => typeof value === 'string')
            this.findNodeIds = findNodeIds;
            
            let findLinkedNodeIds = n => findNodeIds(n).filter(nId => linkedNodeIds.includes(nId))
            
            // returns an identifier string for a given node
            let findNodeId = n => n['identifier'] || n['@id'] || n['url'] || n['id'];
            this.findNodeId = findNodeId;

            // returns true if the node has a link in the graph (including to itself)
            this.isNodeLinked = d =>
                linkedNodeIds.some(lnId => lnId == this.findNodeId(d))
            
            let allNodeIds2Nodes = new Map(
                graph.nodes.flatMap(n => findNodeIds(n).map(nId => [nId, n])));
            let nodeIds2Nodes = new Map(
                graph.nodes.flatMap(n => findNodeIds(n)
                                    .filter(nId => linkedNodeIds.includes(nId))
                                    .map(nId => [nId, n])));
            if (DEBUG) { // validate and print data about node indices
                console.debug('Indexed ', allNodeIds2Nodes.size, 'nodeIds for ', graph.nodes.length, 'nodes.',
                              'Indexed ', nodeIds2Nodes.size, 'nodeIds mentioned in edges.',
                              'Found', linkedNodeIds.length, 'nodeIds connected by edges.');
            
                let keyTypes = Array.from(new Set([...allNodeIds2Nodes.keys()].map(k => typeof k)))
                if (keyTypes.length != 1 && keyTypes[0] != 'string')
                    console.error('Node index corrupt? id types:', keyTypes)
                let valTypes = Array.from(new Set([...allNodeIds2Nodes.values()].map(v => typeof v)))
                if (valTypes.length != 1 && valtypes[0] != 'object')
                    console.error('Node index corrupt? value types:', valTypes)
            }
            
            this.inverseLinkRole = inverseLinkRole;
            
            // given a node id, find a matching node object in the graph
            //  may return null, of course
            let nodeById = function(nodeRefOrId) {
                let nid = nodeRef2Id(nodeRefOrId); // in case we have a nodeRef instead of a string
                return allNodeIds2Nodes.get(nid) || null;
            }
            this.nodeById = nodeById;

            // fiven a nodeId
            let lookupLinksByNodeId = function(nodeRefOrId) {
                let nid = nodeRef2Id(nodeRefOrId); // in case we have a nodeRef instead of a string
                return graph.links
                    .filter(link => (nodeRef2Id(link.source) == nid) || (nodeRef2Id(link.target) == nid))
            }
            this.lookupLinksByNodeId = lookupLinksByNodeId;
            
            // Find nodes associated to a query node and link
            //  qnode: obj query node in the graph
            //  qrel: str name of a link type
            //  qnodeRole: str whether the qnode is the source or target
            let lookupNodes = function(qnode, qrel, qnodeRole) {
                let qnodeIds = findLinkedNodeIds(qnode);
                if (qnodeIds.length == 0) {
                    console.log('Cannot lookup triple for node without id. Node: ', qnode,
                                'Available ids:', findNodeIds(qnode));
                    return [];
                };
                let resIds = graph.links
                    .filter(link => link.rel == qrel)
                    .filter(link => qnodeIds.includes(nodeRef2Id(link[qnodeRole])))
                    .map(link => link[inverseLinkRole(qnodeRole)])
                    .map(nodeRef2Id)
                let result = resIds.map(nodeById);
                return result;
            }

            this.lookupNodes = lookupNodes;

            
            let nodeRefMatches = function(nodeRef, nodeId) {
                return nodeRef2Id(nodeRef) == nodeId
            }
            
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
                let matchingNodes = lookupNodes(node, rel, 'source');
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

            let outLinks = qnode => graph.links.filter(
                link => nodeRef2Id(link.source) == (qnode.id || findNodeId(qnode)))
            this.outLinks = outLinks;
            
            let inLinks = qnode => graph.links.filter(
                link => nodeRef2Id(link.target) == (qnode.id || findNodeId(qnode)))
            this.inLinks = inLinks;

            this.findNeighbhd = function(qnode) {
                return this.outLinks(qnode)
                    .map(link => nodeRef2Id(link['target']))
                    .map(nid => nodeById(nid))
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

            this.calcNodeId = n =>  n.identifier || n.id || search.findNodeId(n);
            
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
                } else if (dt == 'Rating') {
                    return 'Review'; // incorrect, but OK for now, this is a bug upstream
                } else if (botTypes.includes(dt)) {
                    return 'Bot';
                } else if (dt.endsWith('Reviewer')) {
                    return 'Bot';
                } else if (creativeWorkTypes.includes(dt)) {
                    return 'CreativeWork'; // content
                } else if (dt.endsWith('Organization')) {
                    return 'Organization';
                } else {
                    return dt;
                }
            }

            // given a node d, return a symbol id
            //  this is used to map nodes to symbols/icons and defined in src/index.html 
            this.calcSymbol = function(d, defaultVal="thing") {
                let itType = d["@type"] || d["type"] || "Thing";
                let itType2SymbolId = {
                    "Thing": "thing",
                    "NormalisedClaimReview": "revCred",
                    "ClaimReviewNormalizer": "bot",
                    "SentenceEncoder": "bot",
                    "Sentence": "singleSent",
                    "Article": "article",
                    "WebSite": "website",
                    "WebPage": "website",
                    "Tweet": "tweet",
                    "SentencePair": "sentPair"
                }
                let match = itType2SymbolId[itType];
                if (match) return match;

                // match by postfix
                if (itType.endsWith("Review")) {
                    return "claimRev";
                } else if (itType.endsWith("Reviewer")) {
                    return "bot";
                } 
                return defaultVal;
            }

            this.calcSymbolId = d => "#" + this.calcSymbol(d);
            
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
                    var revNode = search.lookupSubject(d, "itemReviewed");
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
                let dt = this.calcNodeType(d);
                let dId = this.calcNodeId(d)
                let topNid = graph['mainNode'];
                if (dt == "Review") {
                    if (topNid == dId) {
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
                
                let nMapper = this.nodeMapper(graph);
                let lMapper = this.linkMapper(graph);
                let gSearch = this.search(graph);

                let orphanNodes = graph.nodes.filter(n => !gSearch.isNodeLinked(n))
                if (orphanNodes.length > 0) {
                    console.log('Graph has ', orphanNodes.length, 'orphaned nodes', orphanNodes);
                }

                let linksForCreatorOfIrrelevantThings = graph.nodes
                    .filter(n => nMapper.calcSymbol(n) == 'thing') // select only unrelevant
                    .flatMap(n => graph.links
                             .filter(l => (l.rel == 'creator') || (l.rel == 'author')) // only creator link
                             .filter(l => l.source == nMapper.calcNodeId(n)))
                let irrelevantNodesForCreator = linksForCreatorOfIrrelevantThings
                    .flatMap(link => [link.source, link.target])
                    .map(nid => gSearch.nodeById(nid))
                let nodesToRemove = orphanNodes.concat(irrelevantNodesForCreator)
                let linksToRemove = linksForCreatorOfIrrelevantThings
                if (linksForCreatorOfIrrelevantThings.length > 0) {
                    console.log('Graph has ', linksForCreatorOfIrrelevantThings.length, ' links ',
                                'describing authors of irrelevant things which can be removed',
                                'Mapping to ', irrelevantNodesForCreator.length, 'nodes to remove',
                               irrelevantNodesForCreator);
                }

                let acred2D3NodeObj = n =>
                    Object.assign(Object.create(n), {
                        id: n.identifier || gSearch.findNodeId(n),
                        otherId: n.id,
                        hierarchyLevel: nMapper.calcNodeHierarchy(n), 
                        group: nMapper.ntypes.indexOf(nMapper.calcNodeType(n)),
                        originalOpacity: nMapper.calcNodeOpacity(n),
                        opacity: nMapper.calcNodeOpacity(n),
                        nodeScale: nMapper.calcNodeScale(n),
                        enabledNode: true
                    })

                let acred2D3LinkObj = l =>
                    Object.assign(Object.create(l), {
                        value: lMapper.calcLinkValue(l),
                        originalOpacity: lMapper.calcLinkOpacity(l),
                        opacity: lMapper.calcLinkOpacity(l)
                    })

                let result = {
                    "@context": "http://coinform.eu",
                    "@type": "UICredReviewGraph",
                    id: graph.mainNode,
                    mainItemReviewed: this.calcMainItemReviewedLabel(graph),
                    mainNode: graph.mainNode,
                    nodes: graph.nodes.filter(n => !nodesToRemove.includes(n))
                        .map(acred2D3NodeObj),
                    links: graph.links.filter(l => !linksToRemove.includes(l))
                        .map(acred2D3LinkObj)
                };
                if (DEBUG) {
                    let hlevels = result.nodes.
                        filter(n => n.hierarchyLevel != null).
                        map(   n => n['hierarchyLevel']);
                    console.debug('min/max hierarchy levels: ', Math.min(...hlevels), Math.max(...hlevels))
                    console.log("processedGraph has ", result.nodes.length, 'nodes and',
                            result.links.length, 'links');
                }
                return result;
            }

        });
    }
);
