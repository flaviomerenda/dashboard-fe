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

        module.controller('crowdAcred', function ($scope, alertSrv, solrSrv, rgProcessor) {

            $scope.$watch("wholeGraph.reviewedAsInaccurate", function(newVal) {
                if (!$scope.wholeGraph) {
                    return;
                }
                if ($scope.wholeGraph.reviewedAsInaccurate == true) {
                    $scope.triggerSentenceNode = findTriggerItem('QSentCredReview', 'Sentence')
                    $scope.triggerSentencePairNode = findTriggerItem('SentSimilarityReview', 'SentencePair')
                    if ($scope.triggerSentenceNode && $scope.triggerSentencePairNode) {
                        $scope.checkWorthinessForm = checkWorthinessTask()
                        $scope.rephraseClaimForm = rephraseClaimTask()
                        $scope.simplifyClaimForm = simplifyClaimTask()
                        $scope.sentenceSimilarityForm = sentenceSimilarityTask()
                        $scope.stanceDetectionForm = stanceDetectionTask()
                    }
                }
            })

            $scope.$watch("triggerSentenceNode", function(newVal) {
                if (newVal == null) {
                    return ;
                }
                $scope.activeDialog = "checkWorthiness"
            })

            function findTriggerItem(reviewType, itemType) {
                let gSearch = rgProcessor.search($scope.wholeGraph)
                let mainNode = gSearch.nodeById($scope.wholeGraph.mainNode)
                let review = gSearch.findCriticalNodes(mainNode, 'isBasedOnKept')
                    .filter(n => n['@type'] == reviewType)[0]
                if (review) {
                    let trgItem = gSearch.lookupNodes(review, 'itemReviewed', 'source')
                        .filter(n => n['@type'] == itemType)[0]
                        return trgItem 
                }
            }

            const taskValues = {
                checkWortinessValues: {
                    "CFS": "Yes, and the claim can be veriﬁed",
                    "NCF": "Yes, but nobody could verify it",
                    "NV": "No"
                },
                sentenceSimilarityValues: {
                    "5": "completely equivalent, as they mean the same thing",
                    "4": "mostly equivalent, but some unimportant details diﬀer",
                    "3": "roughly equivalent, but some important information diﬀers/missing",
                    "2": "not equivalent, but share some details",
                    "1": "not equivalent, but are on the same topic",
                    "0": "on diﬀerent topics",
                },
                stanceDetectionValues: {
                    "agree": "agree with each other ",
                    "disagree": "disagree with each other ",
                    "discuss": "discuss the same issue ",
                    "unrelated": "are unrelated"
                }
            }

            function checkWorthinessTask() {
                return {
                    title: "Check Worthiness Task",
                    subtitle: "Help us to detect if a sentence contains a factual claim",
                    question: "Do you think the following sentence contains a factual claim?",
                    info: "A factual claims is any statement that refers to measurable effects that can be proved right or wrong",
                    sentence: $scope.triggerSentenceNode.text,
                    values: Object.entries(taskValues.checkWortinessValues).map(v => {return({label: v[0], expl: v[1]})})
                }
            }
            
            function rephraseClaimTask() {
                return {
                    title: "Rephrase Claim Task",
                    subtitle: "Help us to rephrase a sentence as a factual claim",
                    info: "e.g., ",
                    question: "Do you think the following sentence can be rephrased as factual claim? if yes, try to rephrase it please.",
                    sentence: $scope.triggerSentenceNode.text,
                    value: "Rephrased Claim: ",
                }
            }

            function simplifyClaimTask() {
                return {
                    title: "Simplify Claim Task",
                    subtitle: "Help us to simplify a detected claim",
                    info: "e.g., ",
                    question: "Do you think the following sentence can be simplified to focus on the detected claim? if yes, try to simplify it please.",
                    sentence: $scope.triggerSentenceNode.text,
                    value: "Simplified Claim: "
                }
            }

            function sentenceSimilarityTask() {
                return {
                    title: "Sentence Similarity Task",
                    subtitle: "Help us to detect how similar are two sentences",
                    question: "Choose one of the options that describes the semantic similarity grade between the following pair of sentences.",
                    sentencePair: formatSentencePair($scope.triggerSentencePairNode.text),
                    values: Object.entries(taskValues.sentenceSimilarityValues).map(v => {return({label: v[0], expl: v[1]})})
                }
            }
            
            function stanceDetectionTask() {
                return {
                    title: "Stance Detection Task",
                    subtitle: "Help us to better understand the relation between two sentences",
                    question: "Choose one of the options that describes the relation between the following sentences.",
                    sentencePair: formatSentencePair($scope.triggerSentencePairNode.text),
                    values: Object.entries(taskValues.stanceDetectionValues).map(v => {return({label: v[0], expl: v[1]})})
                }
            }

            function formatSentencePair(sentPair) {
                let splittedSents = sentPair.split(" <sep> ")
                return [splittedSents[0], splittedSents[1].slice(1, -1)]
            }

            $scope.checkWorthinessReview = {
                "context": "http://schema.org",
                "type": "SentCheckWorthinessCoinformUserReview",
                "url": "http://coinform.eu/mock-user/20200213T150605",
                "author": {
                    "context": "http://coinform.eu",
                    "type": "CoinformUser",
                    "url": "http://coinform.eu/mock-user",
                    "identifier": "mock-user"
                },
                "text": "",  // we could allow the user to insert a free text
                "name": "string",
                "reviewAspect": "checkworthiness",
                "reviewRating": {
                    "context": "string",
                    "@type": "Rating",
                    "ratingValue": "",
                    "confidence": 1,
                    "reviewAspect": "checkworthiness",
                    "ratingExplanation": "mock-auto-generated-explanation"
                },
                "itemReviewed": {
                    "context": "http://schema.org",
                    "type": "Sentence",
                    "url": "http://coinform.eu/sentence?text=@Vandhana1810 Entire Mumbai and pune will be under Military lockdown for 10 days starts from Saturday."
                },
                "dateCreated": "2020-10-07T18:27:26.540Z",
            }

            $scope.rephraseClaimReview = {
                "context": "http://schema.org",
                "type": "CoinformUserClaimNormReview",
                "url": "http://coinform.eu/mock-user/20200213T150605",
                "author": {
                    "context": "http://coinform.eu",
                    "type": "CoinformUser",
                    "url": "http://coinform.eu/mock-user",
                    "identifier": "mock-user"
                },
                "text": "",  // we could allow the user to insert a free text
                "normalizedClaim": {
                    "context": "http://schema.org",
                    "type": "Claim",
                    "text": "" // user text answer
                },
                "name": "string",
                "reviewAspect": "normalization",
                "reviewRating": {
                    "context": "string",
                    "@type": "Rating",
                    "ratingValue": "", // "CC|IC" Complex Claim ? Implicit Claim ?
                    "confidence": 1,
                    "reviewAspect": "normalization",
                    "ratingExplanation": "mock-auto-generated-explanation"
                },
                "itemReviewed": {
                    "context": "http://schema.org",
                    "type": "Sentence",
                    "url": "http://coinform.eu/sentence?text=@Vandhana1810 Entire Mumbai and pune will be under Military lockdown for 10 days starts from Saturday."
                },
                "dateCreated": "2020-10-07T18:27:26.540Z",
            }
               
            $scope.simplifyClaimReview =  {
                "context": "http://schema.org",
                "type": "CoinformUserClaimNormReview",
                "url": "http://coinform.eu/mock-user/20200213T150605",
                "author": {
                    "context": "http://coinform.eu",
                    "type": "CoinformUser",
                    "url": "http://coinform.eu/mock-user",
                    "identifier": "mock-user"
                },
                "text": "",  // we could allow the user to insert a free text
                "normalizedClaim": {
                    "context": "http://schema.org",
                    "type": "Claim",
                    "text": "" // user text answer
                },
                "name": "string",
                "reviewAspect": "normalization",
                "reviewRating": {
                    "context": "string",
                    "@type": "Rating",
                    "ratingValue": "", // "CC|IC" Complex Claim ? Implicit Claim ?
                    "confidence": 1,
                    "reviewAspect": "normalization",
                    "ratingExplanation": "mock-auto-generated-explanation"
                },
                "itemReviewed": {
                    "context": "http://schema.org",
                    "type": "Sentence",
                    "url": "http://coinform.eu/sentence?text=@Vandhana1810 Entire Mumbai and pune will be under Military lockdown for 10 days starts from Saturday."
                },
                "dateCreated": "2020-10-07T18:27:26.540Z",
            }

            $scope.sentenceSimilarityReview = {
                "context": "http://schema.org",
                "type": "CoinformUserSentSimilarityReview",
                "url": "http://coinform.eu/mock-user/20200213T150605",
                "author": {
                    "context": "http://coinform.eu",
                    "type": "CoinformUser",
                    "url": "http://coinform.eu/mock-user",
                    "identifier": "mock-user"
                },
                "text": "", // we could allow the user to insert a free text
                "name": "string",
                "reviewAspect": "similarity",
                "reviewRating": {
                    "context": "string",
                    "@type": "Rating",
                    "ratingValue": "",
                    "bestRating": "5",
                    "worstRating": "0",
                    "alternateName": "different topics"|"not equivalent but on same topic"|"not equivalent but share details"|"roughly equivalent”|“mostly equivalen”|“completely equivalent",
                    "confidence": 1,
                    "reviewAspect": "similarity",
                    "ratingExplanation": "mock-auto-generated-explanation"
                },
                "itemReviewed": {
                    "context": "http://schema.org",
                    "type": "SentencePair",
                    "url": "http://coinform.eu/sentencepair?querySentence=@Vandhana1810 Entire Mumbai and pune will be under Military lockdown for 10 days starts from Saturday.&sentenceInDB=Entire Mumbai and Pune will be under Military lockdown for 10 days"
                },
                "dateCreated": "2020-10-07T18:27:26.540Z",
            }

            $scope.stanceDetectionReview = {
                "context": "http://schema.org",
                "type": "CoinformUserSentStanceReview",
                "url": "http://coinform.eu/mock-user/20200213T150605",
                "author": {
                 "context": "http://coinform.eu",
                 "type": "CoinformUser",
                 "url": "http://coinform.eu/mock-user",
                 "identifier": "mock-user"
                },
                "text": "", // we could allow the user to insert a free text
                "name": "string",
                "reviewAspect": "stance",
                "reviewRating": {
                 "context": "string",
                 "@type": "Rating",
                 "ratingValue": "",
                 "confidence": 1,
                 "reviewAspect": "stance",
                 "ratingExplanation": "mock-auto-generated-explanation"
                },
                "itemReviewed": {
                 "context": "http://schema.org",
                 "type": "SentencePair",
                 "url": "http://coinform.eu/sentence?text=@Vandhana1810 Entire Mumbai and pune will be under Military lockdown for 10 days starts from Saturday.&Entire Mumbai and Pune will be under Military lockdown for 10 days"
                },
                "dateCreated": "2020-10-07T18:27:26.540Z",
            }

            $scope.submitForm = function(formType) {
                // submit review
                if (formType == "checkWorthiness") {
                    let value = $scope.checkWorthinessReview.reviewRating.ratingValue
                    if (value) {
                        if (value == "CFS") {
                            $scope.activeDialog = "simplifyClaim"
                        } else {
                            $scope.activeDialog = "rephraseClaim"
                        }
                    }
                }
                if (formType == "rephraseClaim" && $scope.rephraseClaimReview.normalizedClaim.text) {
                    $scope.activeDialog = "endForm"
                }
                if (formType == "simplifyClaim" && $scope.simplifyClaimReview.normalizedClaim.text) {
                    $scope.activeDialog = "sentenceSimilarity"
                }
                if (formType == "sentenceSimilarity" && $scope.sentenceSimilarityReview.reviewRating.ratingValue) {
                    if (parseInt($scope.sentenceSimilarityReview.reviewRating.ratingValue) > 1) {
                        $scope.activeDialog = "stanceDetection"}
                    else {$scope.activeDialog = "endForm"}
                }
                if (formType == "stanceDetection" && $scope.stanceDetectionReview.reviewRating.ratingValue) {
                    $scope.activeDialog = "endForm"
                }
            }

            $scope.skipForm = function(formType) {
                if (formType == "rephraseClaim") {
                    $scope.activeDialog = "endForm"
                }
                if (formType == "simplifyClaim") {
                    $scope.activeDialog = "sentenceSimilarity"
                }
            }

            $scope.leaveForm = function() {
                $scope.activeDialog = null
            }

        });
    }
);