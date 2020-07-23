define([
  'angular',
  'underscore'
],
function (angular, _) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('solrSrv', function(dashboard, $http, alertSrv, filterSrv, querySrv) {
    // Save a reference to this
    var self = this;

    this.MAX_NUM_CALC_FIELDS = 20; // maximum number of fields for calculating top values
    this.topFieldValues = {};

    this.getTopFieldValues = function(field) {
      return self.topFieldValues[field];
    };

    this.fetchReviewGraph = function(doc) {
        let doc_id = doc['id'];
        let baseUrl = dashboard.current.solr.server
        let collection = dashboard.current.solr.core_name;
        var request = $http({
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
            var result = data['results'][0]
            //console.log('Got response back from server for doc_id: ', result['doc_id'], result);
            var graph = result['reviewGraph'];
            if (graph == null) {
                alertSrv.set('Warning', 'No review available for this document. Sorry.');
            } else {
                console.log('Retrieved review graph with', graph['nodes'].length, 'nodes and', graph['links'].length, 'links');
            }            
        });
        return request;

        // request.then(function(response){
        //     if (typeof response === 'undefined') {
        //         alertSrv.set('Error', 'Could not retrieve Review Graph for unkown reasons')
        //     } else if (response['status'] == 200){
        //         var result = response['data']['results'][0]
        //         console.log('Got response back from server for doc_id: ', result['doc_id'], result);
        //         var graph = result['reviewGraph'];
        //         if (graph == null) {
        //             alertSrv.set('Warning', 'No review available for this document. Sorry.');
        //         } else {
        //             console.log('Retrieved review graph with', graph['nodes'].length, 'nodes and', graph['links'].length, 'links');
        //         }
        //     } else {
        //         alertSrv.set('Error',
        //                      'Could not retrieve Review Graph from server (Error status ='+response['status']+')')
        //     }
        // });
    };

    // Send user review to Solr
    this.postReview = function(review) {
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
      
    // Calculate each field top 10 values using facet query
    this.calcTopFieldValues = function(fields) {
      // Check if we are calculating too many fields and show warning
      if (fields.length > self.MAX_NUM_CALC_FIELDS) {
        alertSrv.set('Warning', 'There are too many fields being calculated for top values (' + fields.length + '). This will significantly impact system performance.', 'info', 5000);
      }
      // Construct Solr query
      var fq = '';
      if (filterSrv.getSolrFq()) {
        fq = '&' + filterSrv.getSolrFq();
      }
      var wt = '&wt=json';
      var facet = '&rows=0&facet=true&facet.limit=10&facet.field=' + fields.join('&facet.field=');
      var query = '/select?' + querySrv.getORquery() + fq + wt + facet;

      // loop through each field to send facet query to Solr
      // _.each(fields, function(field) {
        // var newquery = query + field;
        var request = $http({
          method: 'GET',
          url: dashboard.current.solr.server + dashboard.current.solr.core_name + query,
        }).error(function(data, status) {
          if(status === 0) {
            alertSrv.set('Error', 'Could not contact Solr at '+dashboard.current.solr.server+
              '. Please ensure that Solr is reachable from your system.' ,'error');
          } else {
            alertSrv.set('Error','Could not retrieve facet data from Solr (Error status = '+status+')','error');
          }
        });

        request.then(function(results) {
          // var topFieldValues = {
          //   counts: [],
          //   totalcount: results.data.response.numFound
          //   // hasArrays: undefined // Not sure what hasArrays does
          // };

          // var facetFields = results.data.facet_counts.facet_fields[field];
          // // Need to parse topFieldValues.counts like this:
          // //   [["new york", 70], ["huntley", 130]]
          // for (var i = 0; i < facetFields.length; i=i+2) {
          //   topFieldValues.counts.push([facetFields[i], facetFields[i+1]]);
          // };

          // self.topFieldValues[field] = topFieldValues;

          var facetFields = results.data.facet_counts.facet_fields;

          _.each(facetFields, function(values, field) {
            var topFieldValues = {
              counts: [],
              totalcount: results.data.response.numFound
              // hasArrays: undefined // Not sure what hasArrays does
            };
            // Need to parse topFieldValues.counts like this:
            //   [["new york", 70], ["huntley", 130]]
            for (var i = 0; i < values.length; i=i+2) {
              topFieldValues.counts.push([values[i], values[i+1]]);
            }

            self.topFieldValues[field] = topFieldValues;
          });

        });
      // }); // each loop
    };

  });
});
