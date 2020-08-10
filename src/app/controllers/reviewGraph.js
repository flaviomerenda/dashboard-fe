/*
  ## D3 Review Graph integrated in the Table panel.
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

        module.controller('reviewGraph', function ($scope, alertSrv, solrSrv, rgProcessor) {
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

                // TODO: mode acred_to_d3_ReviewGraph one level up?
                // preprocess the reviewGraph
                var acred_to_d3_ReviewGraph = function(graph) {
                    // add group property to nodes and value property to links
                    // this is just so the current force chart implementation works, 
                
                    var processedGraph = rgProcessor.processGraph(graph)
                    processedGraph['mainItemReviewed'] = rgProcessor.calcMainItemReviewed();
                    processedGraph['mainNodeLabel'] = $scope.ciDoc.credibility_label
                    processedGraph['id'] = $scope.reviewGraph.mainNode
                
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

                    var processedData = acred_to_d3_ReviewGraph($scope.reviewGraph)
                    if (DEBUG) {console.debug('reviewGraph data: ', processedData)}

                    $scope.graph = processedData
                    
                    // trigger rendering of the graph
                    $scope.$broadcast('render');
                });
            };
        });
    }
);