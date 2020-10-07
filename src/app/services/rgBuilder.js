define([
    'angular',
    'underscore',
    'config',
    ],

    function (angular, _) {
        'use strict';

        var module = angular.module('kibana.services');

        var DEBUG = false; // DEBUG mode

        module.service('rgBuilder', function() {
            
            // TODO: transfer these values to a config file
            this.calcLinkDistance = function(link) {
                var rel = link.rel || "isRelatedTo";
                if (rel == "sentA") { //sentPair to query sent
                    return 60;
                } 
                else if (rel == "sentB") { //sentPair to db sent
                    return 20;
                } 
                else if (rel == "isBasedOn") {
                    return 20;
                } 
                else if (rel == "appearance") {
                    return 30;
                } 
                else if (rel == "author") {
                    return 60;
                } 
                else if (rel == "itemReviewed") {
                    return 40; 
                } 
                else if (rel == "basedOn") {
                    return 30;
                } 
                else if (rel == "creator") {
                    return 60;
                }
                return 30;
            }
        
            // Given a node object, return the appropriate symbol id stored in src/index.html
            // The symbol must be defined as part of the encompassing svg element.
            this.calcSymbolId = function(d) {
                var itType = d["@type"]
                if (typeof itType == "undefined") {
                    return "#thing";
                } 
                else if (itType == "NormalisedClaimReview") {
                    return "#revCred";
                } 
                else if (itType.endsWith("Review")) {
                    return "#claimRev";
                } 
                else if (itType == "ClaimReviewNormalizer") {
                    return "#bot";
                } 
                else if (itType == "SentenceEncoder") {
                    return "#bot";
                } 
                else if (itType.endsWith("Reviewer")) {
                    return "#bot";
                } 
                else if (itType == "Sentence") {
                    return "#singleSent";
                } 
                else if (itType == "Article") {
                    return "#article";
                } 
                else if (itType == "WebSite") {
                    return "#website";
                } 
                else if (itType == "WebPage") {
                    return "#website";
                }
                else if (itType == "Tweet") {
                    return "#tweet";
                } 
                else if (itType == "SentencePair") {
                    return "#sentPair";
                } 
                else {
                    return "#thing";
                }
            }

            // Given a node object, return the tooltip text
            this.itemToTooltipText = function(d) {

                // wrapper of number.toFixed in case v is not a number
                var myToFixed = function(v) {
                    if (typeof v == "number") {
                        return v.toFixed(3);
                    } 
                    else {
                        return v;
                    }
                }

                const itType = d["@type"];
                if (typeof itType == "undefined") {
                    return "undefined type";
                } 
                const defaultVal = itType + ": " + d.id;
                if (itType == "NormalisedClaimReview") {
                    var claimReved = d.claimReviewed || "unknown claim";
                    var rating = d.reviewRating || {};
                    var explanation = rating.ratingExplanation || "no explanation";
                    return "Normalised ClaimReview" + 
                        "\n\tclaim: " + claimReved + 
                        "\n\texplanation: " + explanation;
                } 
                else if (itType == "ClaimReviewNormalizer") {
                    var description = d.description || "missing";
                    var name = d.name || itType;
                    var version = d.softwareVersion || "unknown";
                    return name +
                        "\n\tversion: " + version +
                        "\n\tdescription: " + description;
                } 
                else if (itType == "SentenceEncoder") {
                    var description = d.description || "missing";
                    var name = d.name || itType;
                    var version = d.softwareVersion || "unknown";
                    return name +
                        "\n\tversion: " + version +
                        "\n\tdescription: " + description;
                } 
                else if (itType == "Sentence") {
                    var text = d.text || "missing text";
                    return itType + ":\n\t" + text;
                } 
                else if (itType == "Article") {
                    var url = d.url || "unknown";
                    var publisher = d.publisher || "unkown";
                    return itType + 
                        "\n\turl: " + url +
                        "\n\tpublisher: " + publisher;
                } 
                else if (itType == "WebSite") {
                    var name = d.name || "unkown";
                    return itType + ": " + name;
                } 
                else if (itType == "SentencePair") {
                    var text = d.text || "missing text";
                    var roleA = d.roleA || "first";
                    var roleB = d.roleB || "second";
                    return itType + ":\n\t" + text +
                        "\n\t1st role: " + roleA +
                        "\n\t2nd role: " + roleB;
                } 
                else if (itType.endsWith("Review")) {
                    var rating = d.reviewRating || {};
                    var aspect = rating.reviewAspect || "unknown";
                    var ratingValue = myToFixed(rating.ratingValue || "unknown");
                    var conf = myToFixed(rating.confidence || "unknown");
                    var explanation = rating.ratingExplanation || "none";
                    return itType + "(" + aspect + ")" +
                        "\n\tvalue and confidence: " + ratingValue + "(" + conf + ")" +
                        "\n\texplanation: " + explanation;
                } 
                else if (itType.endsWith("Reviewer")) {
                    var description = d.description || "missing";
                    var name = d.name || itType;
                    var version = d.softwareVersion || "unknown";
                    return name +
                        "\n\tversion: " + version +
                        "\n\tdescription: " + description;
                } 
                else if (itType == "Organization") {
                    var name = d.name || "unkown";
                    return itType + ": " + name;
                } 
                else {
                    return defaultVal;
                }
            }

            // assingn a force to a node subset
            this.isolate_force = function(force, nodeFilter, nodes) {
                let init = force.initialize;
                force.initialize = function() { 
                    let fnodes = nodes.filter(nodeFilter);
                    init.call(force, fnodes); 
                };
                return force;
            }

        });
    }
);