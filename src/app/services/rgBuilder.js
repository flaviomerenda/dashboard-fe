// rgBuilder service that...
//
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

            

            // deprecated: use rgProcessor.calcSymbol instead
            // this.calcIconType = d => this.calcSymbolId(d).slice(1) 

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


        });
    }
);
