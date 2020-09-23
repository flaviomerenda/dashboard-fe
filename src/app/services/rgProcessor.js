define([
    'angular',
    'underscore',
    'config',
    ],

    function (angular, _) {
        'use strict';

        var module = angular.module('kibana.services');

        var DEBUG = false; // DEBUG mode

        module.service('rgProcessor', function() {

            // extract node type
            this.calcNodeType = function(d) {
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

            // calculate node size based on its type
            this.calcNodeSize = function(d) {
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

            // calculate node opacity based on its attributes
            this.calcNodeOpacity = function(d) {
                var dt = this.calcNodeType(d);
                var minOpacity = 0.2;
                if (dt == 'Review') {
                    var rating = d['reviewRating'] || {};
                    var conf = rating['confidence'] || 0.7;
                    var opacity = minOpacity + ((1 - minOpacity) * conf**2);
                    return opacity;
                } 
                else if (dt == 'Bot') {
                    // inherit the hierarchy level of the review
                    var revNode = this.lookupSubject(d, 'author');
                    if (revNode) {  
                        return this.calcNodeOpacity(revNode);
                    } 
                    else {
                        return minOpacity;
                    }
                } 
                else {
                    // assume it's some content that was reviewed
                    var revNode = this.lookupSubject(d, 'itemReviewed');
                    if (revNode) {
                        return this.calcNodeOpacity(revNode);
                    }
                    else {
                        return minOpacity;
                    }
                }
            }

            // calculate node scale
            this.calcNodeScale = function(d) {
                var maxScale = 2.5; 
                var maxReviewCount = 20;
                var dt1 = d['@type'] || d['type'] || 'Thing';
                var dt2 = this.calcNodeType(d) 
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
                    var revN = this.lookupSubject(d, 'itemReviewed');
                    if (revN) {
                        return this.calcNodeScale(revN);
                    }
                    else {
                        return 1.0
                    }
                    } 
                else {
                    return 1.0
                }
            }

            // calculate the node hierarchy
            this.calcNodeHierarchy = function(d) {
                var dt = this.calcNodeType(d);
                var topNid = this.graph['mainNode'];
                if (dt == "Review") {
                    if (topNid == d['id']) {
                        return 0;
                    } 
                    else {
                        var parentN = this.lookupSubject(d, 'isBasedOn');
                        if (parentN) {
                            return 1 + parseInt(this.calcNodeHierarchy(parentN));
                        }
                        else {
                            console.log('Could not find parent node')
                            return undefined;
                        }
                    }
                }
                else if (dt == 'Bot') {
                    // inherit the hierarchy level of the review
                    var revN = this.lookupSubject(d, 'author');
                    if (revN) {
                        return parseInt(this.calcNodeHierarchy(revN));
                    } 
                    else {
                        return undefined;
                    }
                }
                else {
                    // assume it's some content that was reviewed
                    var nReviewer = this.lookupSubject(d, 'itemReviewed');
                    if (nReviewer) {
                        return parseInt(this.calcNodeHierarchy(nReviewer));
                    }
                    else {
                        return undefined;
                    }
                }
            }

            // get node by its id
            this.nodeById = function(nid) {
                var matching = this.graph['nodes'].filter(n => n['id'] == nid);
                if (matching.length > 0) {
                    return matching[0];
                }
                else {
                    return null;
                }
            }

            // calculate link value
            this.calcLinkValue = function(link) {
                return 2.0;
            }
            
            // calculate link opacity based on its attributes
            this.calcLinkOpacity = function(link) {
                var rel = link['rel'];
                var sent = ['sentA', 'sentB'];
                var author = ['author', 'creator'];
                if (sent.includes(rel)) {
                    return 0.8;
                } 
                else if (rel == 'isBasedOn') {
                    return this.calcNodeOpacity(this.nodeById(link['target']));
                } 
                else if (author.includes(rel)) {
                    return 0.4;
                } 
                else if (rel == 'itemReviewed') {
                    return this.calcNodeOpacity(this.nodeById(link['source']));
                } 
                else if (rel == 'basedOn') {
                    return this.calcNodeOpacity(this.nodeById(link['source']));
                } 
                else if (rel == 'appearance') {
                    return 0.8;
                } 
                else {
                    return 0.8;
                }
            }
        
            // look for linked nodes
            this.lookupNodes = function(qnode, qrel, qnodeRole) {
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
                var resIds = this.graph['links'].filter(link => ((link['rel'] == qrel) || 
                                                            (link['rel'] == "basedOn")) && 
                                                            (qnodeId == link[qnodeRole])).map(link => link[resRole])
                return resIds.map(n => this.nodeById(n));
            }
        
            // look for respective targer node
            this.lookupSubject = function(node, rel) {
                var matchingNodes = this.lookupNodes(node, rel, 'target');
                if (matchingNodes.length == 0) {
                    return undefined;
                } 
                else {
                    return matchingNodes[0];
                }
            }
            
            // look for respective source node
            this.lookupObject = function(node, rel) {
                var matchingNodes = this.lookupNodes(node, rel, 'source');
                if (matchingNodes.length == 0) {
                    return undefined;
                }
                else {
                    return matchingNodes[0];
                }
            }
        
            // calculate the main itemreviewed
            this.calcMainItemReviewed = function() {
                var nid = this.graph['mainNode'];
                if (nid == null) {
                    return "??";
                }
                var crev = this.nodeById(nid);
                if (crev) {
                    var itReved = this.lookupObject(crev, 'itemReviewed') || {};
                    var itType = itReved['@type'] || itReved['type'] || 'Thing';
                    var text = itReved['headline'] || itReved['text'] || itReved['content'] || '??';
                    if (text.length > 60) {
                        text = text.slice(0, 60) + "...";
                    }
                    return String(itType) + ': ' + '"' + String(text) + '"';
                }
            }
                
            this.processGraph = function(graph) {

                this.graph = graph
                this.ntypes = Array.from(new Set(this.graph['nodes'].map(n => this.calcNodeType(n))));

                for (var n of this.graph['nodes']) {
                    var nid = n['identifier'] || n['@id'] || n['url'];
                    n['id'] = nid;
                }
                for (var n of this.graph['nodes']) {
                    var hlevel = this.calcNodeHierarchy(n);
                    n['hierarchyLevel'] = hlevel;
                }
                for (n of this.graph['nodes']) {
                    var nt = this.calcNodeType(n);
                    n['group'] = this.ntypes.indexOf(nt);
                    n['originalOpacity'] = this.calcNodeOpacity(n);
                    n['opacity'] = n['originalOpacity'];
                    n['nodeSize'] = this.calcNodeSize(n);
                    n['nodeScale'] = this.calcNodeScale(n);
                    n['enabledNode'] = true
                }
                for (var l of this.graph['links']) {
                    l['value'] = this.calcLinkValue(l);
                    l['originalOpacity'] = this.calcLinkOpacity(l);
                    l['opacity'] = l['originalOpacity'];
                };
                return this.graph
            }

            this.lookupCriticalNodes = function(node, rel, criticalPath=[node]) {
                var pathNode = this.lookupObject(node, rel);
                if (pathNode) {
                    return this.lookupCriticalNodes(pathNode, rel, criticalPath.concat(pathNode));
                }
                return criticalPath
            }

            this.getCriticalLinkedNodes = function(criticalNode) {
                var rels = ['sentA', 'sentB', 'author', 'creator', 'itemReviewed', 'appearance']
                var linkedNodes = []
                for (var rel of rels) {
                    var pathNode = this.lookupObject(criticalNode, rel);
                    if (pathNode) {
                        linkedNodes.push(pathNode);
                    }
                }
                return linkedNodes
            }

            this.findCriticalPath = function(mainNode, rel) {
                let criticalPath = this.lookupCriticalNodes(mainNode, rel)
                var criticalLinkedNodes = []
                for (var cn of criticalPath) {
                    var linkedNode = this.getCriticalLinkedNodes(cn);
                    if (linkedNode) {
                        criticalLinkedNodes.push(...linkedNode)
                    }
                };
                return criticalPath.concat(criticalLinkedNodes);
            }

            this.removeDuplicates = function(arr) {
                let s = new Set(arr);
                let it = s.values();
                return Array.from(it);
            }

            this.pruneGraph = function(graph) {
                var mainNode = graph.nodes.filter(n => n.identifier == graph.mainNode)[0]
                var nodeGroup = this.findCriticalPath(mainNode, 'isBasedOnKept')
                var linkGroup = graph.links.filter(l =>
                    nodeGroup.map(n => n.id).includes(l.source) && 
                    nodeGroup.map(n => n.id).includes(l.target)
                );
                graph['nodes'] = this.removeDuplicates(nodeGroup)
                graph['links'] = linkGroup
                return graph
            }

        });
    }
);