/*
  Controls a CredibilityReview Graph model for a given co-inform document and 
  displays it as a D3js-based view.

  Call it from some html template/module using
  ``` html
  <div ng-controller='reviewGraph' 
       ng-init="init(ciDoc)"   
       ng-include="'app/partials/reviewGraph.html'"></div>
  ``` 

  This controller:
  1. fetches the CredibilityReview Graph for the ciDoc using the solrSrv.
  2. preprocesses the acred Graph using `rgProcessor` and stores it in `$scope.wholeGraph` (needed for the html template)
    * see rgProcessor for more details, but it essentially adds
      properties to the graph nodes and links so they can be displayed
      as a d3 graph. This essentially delegates part of controlling
      the model to the rgProcessor.
  3. broadcasts a `render` event. This triggers the view template (and
     hence an instance of the `reviewGraphDir`ective) to be inserted
     in the parent DOM tree. The directive is really the controller as
     it manages the click/tooltip/sidebar events.
*/

define(
    ['angular',
    'app',
    'underscore',
    ],

    function (angular, app, _) {
        'use strict';

        var DEBUG = false; // DEBUG mode
        var module = angular.module('kibana.controllers');
        app.useModule(module);

        module.controller('reviewGraph', function ($scope, alertSrv, solrSrv, rgProcessor, card) {
            var gNodeMapper = rgProcessor.nodeMapper($scope.wholeGraph);
            var gSearch = rgProcessor.search($scope.wholeGraph);

            /**
             * When true, the discarded evidence (nodes and links)
             * should be shown in the UI, otherwise they should be
             * hidden.
             */
            $scope.showDiscardedEvidence = false;
            
            $scope.init = function (ciDoc) {

                // request the corresponding reviewGraph
                let rg = solrSrv.fetchReviewGraph(ciDoc);
                rg.success(function(data, status) {
                    let result = data['results'][0]
                    let reviewGraph = result['reviewGraph'];
                    if (reviewGraph == null) {
                        alertSrv.set('Warning', 'No review available for this document. Sorry.');
                        return;
                    }
                    let uiGraph = acred_to_UICredReviewGraph(reviewGraph, ciDoc)
                    $scope.wholeGraph = uiGraph;
                    if (DEBUG) {console.debug('wholeReviewGraph: ', $scope.wholeGraph)}

                    gNodeMapper = rgProcessor.nodeMapper($scope.wholeGraph);
                    gSearch = rgProcessor.search($scope.wholeGraph);
                    console.log('Broadcasting rendering', gNodeMapper);
                    $scope.$broadcast('render'); // trigger rendering of the view
                    selectMainReviewNode();
                    $scope.showDiscardedEvidence = false; // by default hide 
                });
            };

            
            // preprocess the reviewGraph to make it compatible with d3 and calculate
            // view-related properties like size, hierarchyLevel, opacity, etc.
            let acred_to_UICredReviewGraph = function(graph, doc) {
                var processedGraph = rgProcessor.processGraph(graph)
                processedGraph['mainNodeLabel'] = doc.credibility_label; //$scope.ciDoc.credibility_label
                return processedGraph;
            }

            /**
             * Model for the buttons in the sidebar
             */
            $scope.sideBarNodeTypes = [
                {id: "tweet",
                 description: "Tweet",
                 style: {opacity: 1}},
                {id: "revCred",
                 description: "Review",
                 style: {opacity: 1}},
                {id: "claimRev",
                 description: "ClaimReview",
                 style: {opacity: 1}},
                {id: "bot",
                 description: "Bot",
                 style: {opacity: 1}},
                {id: "website",
                 description: "Web Site",
                 style: {opacity: 1}},
                {id: "singleSent",
                 description: "Sentence or Claim",
                 style: {opacity: 1}},
                {id: "sentPair",
                 description: "Sentence Pair",
                 style: {opacity: 1}},
                {id: "article",
                 description: "Article or WebPage",
                 style: {opacity: 1}},
                {id: "thing",
                 description: "Anything else",
                 style: {opacity: 1}}
            ];

            $scope.sidebarGraphEvent = function(nodeIconId){
                let iconType = nodeIconId.split(":")[0];
                $scope.sideBarNodeTypes.filter(nt => nt.id == iconType)
                    .forEach(nt => {
                        let currOpacity = nt.style.opacity;
                        let show = (currOpacity == 0.3);
                        let newOpacity = show ? 1.0 : 0.3;
                        nt.style.opacity = newOpacity;
                        $scope.$broadcast("toggleNodesByType", nt.id, show);
                    });
            };
            
            /////
            //  Handlers and events for showing or hiding the discarded evidence
            /////
            
            /**
             * Toggle the value of `showDiscardedEvidence`
             */
            $scope.toggleShowDiscarded = function() {
                $scope.showDiscardedEvidence = !$scope.showDiscardedEvidence;
            };

            $scope.$watch("showDiscardedEvidence", function(newVal) {
                let showOrHide = (newVal) ? "Hide" : "Show";
                $scope.criticalPathButtonText = showOrHide + " discarded evidence";
            })


            ////
            // Handlers and events for selecting a node
            ////
            let selectMainReviewNode = () => {
                let mainNode = gSearch.nodeById($scope.wholeGraph.mainNode)
                $scope.selectedNode = mainNode;
            }
            $scope.selectMainReviewNode = selectMainReviewNode;

            $scope.selectMainItemReviewed = function() {
                // FIXME: only set scope.selectedNode, rest should be automatic
                let crev = gSearch.nodeById($scope.wholeGraph.mainNode);
                if (!crev) return;
                let mainItRev = gSearch.lookupObject(crev, 'itemReviewed');
                if (!mainItRev) return;
                $scope.selectedNode = mainItRev;
            };
            
            $scope.$on("selectNode", function(event, newNode) {
                // TODO: validate newNode?
                //console.log('setting selectedNode to', newNode, 'from', $scope.selectedNode);
                $scope.$apply(() => $scope.selectedNode = newNode);
            })
            
            $scope.$watch("selectedNode", function(newVal, oldVal) {
                selectProperCard(newVal);
            })

            /////
            // Handlers and events for node details (ie cards)
            /////
            var selectProperCard = function (selectedNode) {
                let scope = $scope;
                if (!gNodeMapper) {
                    console.log('No gNodeMapper for wholeGraph', $scope.wholeGraph,
                                'and selected node', selectedNode);
                    return;
                }
                let nodeType = gNodeMapper.calcNodeType(selectedNode);
                if (nodeType == 'Review') {
                    scope.activateBotCard = false;
                    scope.activateOrganizationCard = false;
                    reviewAsCard(selectedNode);
                    var relatedItemRev = gSearch.lookupObject(selectedNode, 'itemReviewed');
                    if (relatedItemRev) {
                        itemReviewedAsCard(relatedItemRev);
                    }
                } else if (nodeType == 'CreativeWork') {
                    scope.activateReviewCard = false;
                    scope.activateBotCard = false;
                    scope.activateOrganizationCard = false;
                    itemReviewedAsCard(selectedNode)
                } else if (nodeType == 'Bot') {
                    scope.activateReviewCard = false;
                    scope.activateItemReviewedCard = false;
                    scope.activateOrganizationCard = false;
                    botAsCard(selectedNode)
                } else if (nodeType == 'Organization') {
                    scope.activateReviewCard = false;
                    scope.activateItemReviewedCard = false;
                    scope.activateBotCard = false;
                    organizationAsCard(selectedNode)
                }
            }

            let organizationAsCard = function(selectedOrg) {
                let scope = $scope;
                scope.organizationName = selectedOrg.name
                scope.organizationUrl = selectedOrg.url
                scope.organizationIconType = gNodeMapper.calcSymbol(selectedOrg)
                scope.activateOrganizationCard = true;
            }
                    
            let botAsCard = function(selectedBot) {
                let scope = $scope;
                scope.botName = (selectedBot.name || selectedBot['@type'])
                scope.botUrl = selectedBot.url
                scope.botDescription = selectedBot.description
                scope.botDateCreated = card.pubDate(selectedBot.dateCreated)
                scope.botIconType = gNodeMapper.calcSymbol(selectedBot)
                scope.activateBotCard = true;
            }

            let itemReviewedAsCard = function(selectedItemReviewed) {
                let scope = $scope;
                scope.pubDate = card.pubDate(selectedItemReviewed.publishedDate)
                scope.viewableContent = card.viewableContent((selectedItemReviewed.content || selectedItemReviewed.text))
                scope.itRevTitle = (selectedItemReviewed.title || selectedItemReviewed.name)
                scope.itRevUrl = (selectedItemReviewed.url)
                scope.itRevDomain = (selectedItemReviewed.domain)
                scope.itRevCardIconType = gNodeMapper.calcSymbol(selectedItemReviewed)
                scope.activateItemReviewedCard = true;
            }
                    
            let reviewAsCard = function(selectedReview) {
                let scope = $scope;
                scope.credibilitylabel = card.ratingLabel(selectedReview.reviewRating)
                scope.credLabelDescription = card.credLabelDescription(scope.credibilitylabel)
                scope.reviewConfidence = card.reviewConfidence(selectedReview.reviewRating.confidence)
                scope.credibilityAssessor = getCredibilityAssessor(selectedReview)
                scope.revExplanation = card.explanation(selectedReview.reviewRating.ratingExplanation)
                scope.revCardIconType = gNodeMapper.calcSymbol(selectedReview)
                scope.activateReviewCard = true;
            }

            let getCredibilityAssessor = function(selectedReview) {
                var reviewer = gSearch.lookupObject(selectedReview, 'author');
                if (!reviewer) console.log('No author for ', selectedReview, '?')
                return (reviewer.name || reviewer['@type'])
            }
        });
    }
);
