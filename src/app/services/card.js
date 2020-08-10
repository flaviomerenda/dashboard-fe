define([
    'angular',
    'underscore',
    'config'
    ],

    function (angular, _) {
        'use strict';

        var module = angular.module('kibana.services');

        module.service('card', function() {

            this.pubDate = function(date) {
                return moment.utc(date).format('LT') + ' - ' + moment.utc(date).format('ll');
            }

            this.viewableContent = function(content) {
                if ((content == null) || (content.length == 0)) {
                    return "<p>No textual content</p>";
                }
                return content.split("\n").map(p => "<p>"+p+"</p>").join();
            }

            this.reviewConfidence = function(credibility_confidence) {
                return (credibility_confidence || 0.0).toFixed(2);
            }

            // Convert a credibility rating into a label
            this.ratingLabel = function(rating) {
                // move this value to a config file
                var threshold = 0.7;
                if (('confidence' in rating) && (rating.confidence < threshold)) {
                    return 'not verifiable';
                }
                var val = rating.ratingValue;
                if (val >= 0.5) {
                    return 'credible';
                }
                if (val >= 0.25) {
                    return 'mostly credible';
                }
                if (val >= -0.25) {
                    return 'uncertain';
                }
                if (val >= -0.5) {
                    return 'mostly not credible';
                }
                return 'not credible';
            }

            this.credLabelDescription = function(label) {
                let label2Desc = {
                    "credible": "Reviewed document is most likely to be accurate, according to strong signals we found",
                    "mostly credible": "Reviewed document is likely to be accurate, but may contain some minor inaccuracies, according to the (strong) signals we found",
                    "credibility uncertain": "Reviewed document probably mixes some accurate and inaccurate (or not verifiable) claims",
                    "mostly not credible": "Reviewed document is likely to be inaccurate, by may contain some accurate statements, according to the signals we found",
                    "not credible": "Reviewed document is likely to be inaccurate, according to strong signals we found",
                    "not verifiable": "Reviewed document does not contain verifiable claims (i.e. only opinions or speculation) or we could not find sufficient signals supporting/refuting the claims.",
                    "not verfiable": "Reviewed document does not contain verifiable claims (i.e. only opinions or speculation) or we could not find sufficient signals supporting/refuting the claims."
                }
                return label2Desc[label] || "";
            }

            this.explanation = function(credibilityExplanation) {
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
                    // console.debug("Found markdown code spans", mlSpans);
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
                let text = fixMultilineCode(credibilityExplanation);
                
                var textConverted = text.replace(/&/g, '&amp;')
                    .replace(/>/g, '&gt;')
                    .replace(/</g, '&lt;');
                return converter.makeHtml(textConverted);
            }

        });

    }
);
