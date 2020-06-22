define([
    'angular',
    'app',
    'underscore',
    'moment'
],
function (angular, app, _, moment) {
    'use strict';

    var module = angular.module('kibana.controllers');

    module.controller('CiDocumentCtrl', function ($scope, $rootScope, $timeout, ejsResource, sjsResource,
                                                  dashboard,
                                                  alertSrv, querySrv) {
        var _d = {
            title: "",
            type: "Article"
        };

        $scope.init = function (ciDoc) {
            $scope.querySrv = querySrv;
            $scope.ciDoc = ciDoc;
            console.log('Initialising ciDocumentCtr with ciDoc', ciDoc)
            _.defaults($scope.ciDoc, _d)
        };

        $scope.isTweet = function() {
            var result = $scope.ciDoc.url.startsWith('https://twitter.com/');
            // console.log('Determining if doc is tweeet', result);
            return result;
        }
        
        $scope.isArticle = function() {
            return !$scope.isTweet();
        }

        $scope.pubDate = function() {
            var date = $scope.ciDoc.publishedDate;
            return moment.utc(date).format('LT') + ' - ' + moment.utc(date).format('ll');
        }

        $scope.credReviewDate = function() {
            var date = $scope.ciDoc.credibility_score_date;
            return moment.utc(date).format('LT') + ' - ' + moment.utc(date).format('ll');
        }

        $scope.credLabelDescription = function() {
            let label = $scope.ciDoc.credibility_label;
            let label2Desc = {
                credible: "Reviewed document is most likely to be accurate, according to strong signals we found",
                "mostly credible": "Reviewed document is likely to be accurate, but may contain some minor inaccuracies, according to the (strong) signals we found",
                "credibility uncertain": "Reviewed document probably mixes some accurate and inaccurate (or not verifiable) claims",
                "mostly not credible": "Reviewed document is likely to be inaccurate, by may contain some accurate statements, according to the signals we found",
                "not credible": "Reviewed document is likely to be inaccurate, according to strong signals we found",
                "not verifiable": "Reviewed document does not contain verifiable claims (i.e. only opinions or speculation) or we could not find sufficient signals supporting/refuting the claims.",
                "not verfiable": "Reviewed document does not contain verifiable claims (i.e. only opinions or speculation) or we could not find sufficient signals supporting/refuting the claims."
            }
            return label2Desc[label] || "";
        }
 
        $scope.viewableContent = function() {
            if (($scope.ciDoc.content == null) || ($scope.ciDoc.content.length == 0)) {
                return "<p>No textual content</p>";
            }
            return $scope.ciDoc.content.split("\n").map(p => "<p>"+p+"</p>").join();
        }
        $scope.reviewConfidence = function() {
            return ($scope.ciDoc.credibility_confidence || 0.0).toFixed(2);
        }
        
        $scope.explanation = function() {
            function findNextDelimiterIndex(text, from) {
                // console.debug("Finding next code delimiter in text", text.length,
                //               "from", from, text.substring(from, from+10) + "...");
                
                var begin = text.indexOf("`", from);
                var t = text.indexOf("```", from);
                if (begin >= 0 && begin != t) {
                    // console.debug("Found next delimiter at", begin,
                    //               "..." + text.substring(Math.max(0, begin-5), begin + 10))
                    return begin;
                } else if (begin < 0) {
                    return begin;
                } else {
                    return findNextDelimiterIndex(text, t+3);
                }
            }
            function findMDCodeSpans(text, from) {
                if (from > text.length) return [];
                var result = [];
                var begin = findNextDelimiterIndex(text, from);
                if (begin >= 0) {
                    // console.debug("Found start of code span at ", begin);
                    var end = findNextDelimiterIndex(text, begin+1);
                    if (end >= 0) {
                        // console.debug("Found MD code span", begin, end, text.substring(begin, end));
                        result.push([begin, end]);
                        result.concat(findMDCodeSpans(text, end+1));
                        return result;
                    } else {
                        // console.debug("Found unfinished span from", begin);
                        return result;
                    }
                } else {
                    // console.debug("text has no more code segments after", from);
                    return result;
                }
            }
            
            function findMultilineCode(text, spans) {
                return spans.filter(s => {
                    let begin = s[0];
                    let end = s[1];
                    return text.substring(begin, end).indexOf("\n") >= 0;
                });
            }
            
            function fixMultilineCode(text) {
                var spans = findMDCodeSpans(text, 0);
                var mlSpans = findMultilineCode(text, spans);
                console.debug("Found markdown code spans", mlSpans);
                if (mlSpans.length == 0) {
                    return text;
                }
                let startText = text.substring(0, mlSpans[0][0]);
                let endText = text.substring(mlSpans[mlSpans.length-1][1]);
                let fixed = mlSpans.reduce(
                    (fixedText, currSpan) => {
                        let span = text.substring(currSpan[0], currSpan[1]);
                        let fixedSpan = span.replace(/\n/g, " ");
                        // console.debug("Fixed span", currSpan, "\n\t", span, "\ninto:\n\t", fixedSpan);
                        return fixedText + fixedSpan;
                    },
                    startText); //initial value
                return fixed + endText;
            }
            
            var converter = new Showdown.converter();
            let text = fixMultilineCode($scope.ciDoc.credibility_explanation);
            
            var textConverted = text.replace(/&/g, '&amp;')
                .replace(/>/g, '&gt;')
                .replace(/</g, '&lt;');
            return converter.makeHtml(textConverted);
        }

        module.filter('ciDocMarkdown', function() {
            
            return function(text) {
                text = fixMultilineCode(text);
                var converter = new Showdown.converter();
                var textConverted = text.replace(/&/g, '&amp;')
                    .replace(/>/g, '&gt;')
                    .replace(/</g, '&lt;');
                return converter.makeHtml(textConverted);
            }
        })

        $scope.rateReviewAsAccurate = function() {
            alertSrv.set('Not implemented yet', 'This feature is not implemented yet', 'error');
        }

        $scope.rateReviewAsInaccurate = function() {
            alertSrv.set('Not implemented yet', 'This feature is not implemented yet', 'error');
        }

        $scope.reviewIsAccurateStat = function() {
            // TODO: add field to DB and return as part of doc when requested
            return dashboard.numberWithCommas(0);
        }

        $scope.reviewIsInaccurateStat = function() {
            // TODO: add field to DB and return as part of doc when requested
            return dashboard.numberWithCommas(0);
        }
        
        //$scope.init(null);
    });
});
