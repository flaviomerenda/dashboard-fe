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

        module.controller('reviewGraph', function ($scope, alertSrv, solrSrv, rgProcessor) {
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
                    var processedData = acred_to_d3_ReviewGraph(reviewGraph, ciDoc)

                    $scope.wholeGraph = processedData
                    if (DEBUG) {console.debug('wholeReviewGraph: ', $scope.wholeGraph)}

                    $scope.$broadcast('render'); // trigger rendering of the view
                });
            };

            // preprocess the reviewGraph to make it compatible with d3 and calculate
            // view-related properties like size, hierarchyLevel, opacity, etc.
            var acred_to_d3_ReviewGraph = function(graph, doc) {
                var processedGraph = rgProcessor.processGraph(graph)
                processedGraph['mainNodeLabel'] = doc.credibility_label; //$scope.ciDoc.credibility_label
                return processedGraph;
            }
            
        });
    }
);
