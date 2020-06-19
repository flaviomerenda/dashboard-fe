/*
  ## D3 Force Diagram Integrated with Banana.
*/

define([
    'angular',
    'app',
    'underscore',
    'jquery',
    'kbn',
    'd3',
    'd3-force'
  ],
  function (angular, app, _, $, kbn, d3, d3force) {
    'use strict';

    var FORCE_SEARCH_FOR_NODE_EVENT = "reviewGraph-search-for-node";

    var module = angular.module('kibana.panels.reviewGraph', []);
    app.useModule(module);

    module.controller('reviewGraph', function ($scope, querySrv, dashboard, filterSrv, $rootScope) {
      $scope.panelMeta = {
        modals: [{
          description: "Inspect",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }],
        editorTabs: [{
          title: 'Queries',
          src: 'app/partials/querySelect.html'
        }],
        status: "Experimental",
        description: "Display a reviewGraph diagram."
      };

      // default values
      var _d = {
        queries: {
          mode: 'all',
          ids: [],
          query: '*:*',
          custom: ''
        },
        facet_limit: "10,20", // maximum number of rows returned from Solr
        facet_pivot_strings: ["credibility_label", "medical_conditions"],
        node_size_weight: 0,
        link_width_weight: 0,
        link_strength_weight: 0,
        link_distance_weight: 0,
        strength: -400,
        colors: "#1f77b4, #ff7f0e, #2ca02c, #d62728, #9467bd, #8c564b, #e377c2, #7f7f7f, #bcbd22, #17becf",
        mute_category_1: false,
        mute_category_2: true,
        spheres: true,
        spyable: true,
        show_queries: true,
      };

      _.defaults($scope.panel, _d);
      var DEBUG = false;

      $scope.init = function () {
        $scope.$on('refresh', function () {
          $scope.get_data();

        });
        $scope.get_data();
      };

      $scope.searchQuery = "";
      $scope.searchForNode = function () {
        $rootScope.$emit(FORCE_SEARCH_FOR_NODE_EVENT, $scope.searchQuery);
      };
      $scope.clearSearchForNode = function () {
        $scope.searchQuery = "";
        $rootScope.$emit(FORCE_SEARCH_FOR_NODE_EVENT, $scope.searchQuery);
      };

      $scope.parse_facet_pivot = function (data) {
        console.log('print data: ', data)
        var nodes = {};
        var links = [];
        var count = 0;

        var addNode = function (key, category, cnt) {
          var k = category + "-" + key;
          //console.log('this is k: ', k)
          var existing = nodes[k];
          if (!!existing) {
            return existing.node;
          }

          var id = count++;
          nodes[k] = {
            node: id,
            name: "" + key,
            category: category,
            count: cnt,
          };

          return id;
        };

        for (var ob in data) {
          var id1 = addNode(data[ob].value, 1, data[ob].count);

          for (var p in data[ob].pivot) {
            var id2 = addNode(data[ob].pivot[p].value, 2, data[ob].pivot[p].count);

            links.push({
              source: id1,
              target: id2,
              value: data[ob].pivot[p].count
            });
          }
        }

        return {
          nodes: _.map(_.keys(nodes), function (key) {
            return nodes[key];
          }),
          links: links
        };
      };

      $scope.parse_item = function (doc) {
        var t = {'name': doc.value, 'size': doc.count, 'children': []};
        for (var piv in doc.pivot) {
          t.children.push($scope.parse_item(doc.pivot[piv]));
        }
        return t;
      };

      $scope.get_data = function () {
        // Show progress by displaying a spinning wheel icon on panel
        $scope.panelMeta.loading = true;
        delete $scope.panel.error;

        var request, results;
        // Set Solr server
        $scope.sjs.client.server(dashboard.current.solr.server + dashboard.current.solr.core_name);
        // -------------------- TODO: REMOVE ALL ELASTIC SEARCH AFTER FIXING SOLRJS --------------
        $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
        // This could probably be changed to a BoolFilter
        var boolQuery = $scope.sjs.BoolQuery();
        _.each($scope.panel.queries.ids, function (id) {
          boolQuery = boolQuery.should(querySrv.getEjsObj(id));
        });
        request = $scope.sjs.Request().indices(dashboard.indices);
        request = request.query(
          $scope.sjs.FilteredQuery(
            boolQuery,
            filterSrv.getBoolFilter(filterSrv.ids)
          )); // Set the size of query result
        $scope.populate_modal(request);
        // --------------------- END OF ELASTIC SEARCH PART ---------------------------------------

        // Construct Solr query
        var fq = '';
        if (filterSrv.getSolrFq()) {
          fq = '&' + filterSrv.getSolrFq();
        }
        var wt_json = '&wt=json';
        var rows = '&rows=0';
        var facet = '&facet=true';
        var facet_pivot = '&facet.pivot=' + $scope.panel.facet_pivot_strings.join().replace(/ /g, '');


        var limits = $scope.panel.facet_limit.split(",");
        var facet_limits = '&' + $scope.panel.facet_pivot_strings.map(function (f, index) {
          return "f." + f + ".facet.limit=" + parseInt(limits[index], 10);
        }).join("&");

        // f.effective_date_fiscal_facet.facet.limit=3&f.institution_facet.facet.limit=10';
        $scope.panel.queries.query = querySrv.getORquery() + fq + wt_json + facet + facet_pivot + facet_limits + rows;
        if (DEBUG) {
          console.log($scope.panel.queries.query);
        }
        //console.log($scope.panel.queries.query) // query
        // Set the additional custom query
        if ($scope.panel.queries.custom != null) {
          request = request.setQuery($scope.panel.queries.query + $scope.panel.queries.custom);
        } else {
          request = request.setQuery($scope.panel.queries.query);
        }

        // Execute the search and get results
        results = request.doSearch();
        results.then(function (results) {
          $scope.data = $scope.parse_facet_pivot(results.facet_counts.facet_pivot[$scope.panel.facet_pivot_strings.join().replace(/ /g, '')]);
          console.log('this is the data ', $scope.data)
          $scope.data = {
            "@context": "http://coinform.eu",
            "@type": "Graph",
            "nodes": [
              {
                "@type": "Organization",
                "name": "Expert System Lab Madrid",
                "url": "http://expertsystem.com",
                "identifier": "M6WygrMI2zbAEEnFDmQAP6quTvcXiGs_4c_K1gY3Fi0",
                "id": "M6WygrMI2zbAEEnFDmQAP6quTvcXiGs_4c_K1gY3Fi0",
                "hierarchyLevel": null,
                "group": 3,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "AggQSentCredReviewer",
                "dateCreated": "2020-03-19T15:09:00Z",
                "description": "Reviews the credibility of a query setence by comparing it to semantically similar sentences in the Co-inform DB and the credibility of those.",
                "executionEnvironment": {
                  "hostname": "3145f862236d",
                  "python.version": "3.6.10"
                },
                "identifier": "8a2nk0f0VsNWBOjt9qT4FsV9CG9enr8OeqPVBfHZVpc",
                "launchConfiguration": {
                  "acred_pred_claim_search_url": "http://nginx-api:9080/cc/api/v1/claim/internal-search"
                },
                "name": "ESI Aggregate Query Sentence Credibility Reviewer",
                "softwareVersion": "0.1.0",
                "id": "8a2nk0f0VsNWBOjt9qT4FsV9CG9enr8OeqPVBfHZVpc",
                "hierarchyLevel": 0,
                "group": 1,
                "opacity": 0.6355179647069141,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "QSentCredReviewer",
                "applicationSuite": "Co-inform",
                "dateCreated": "2020-03-27T22:54:00Z",
                "description": "Estimates the credibility of a sentence based on its polar similarity with a sentence in the Co-inform database for which a credibility can be estimated",
                "identifier": "Uq0Fj57weeOOevIFX1grhnn83suv1Qhj9catKSyehYc",
                "launchConfiguration": {},
                "name": "ESI Query Sentence Credibility Reviewer",
                "softwareVersion": "0.1.0",
                "url": "http://coinform.eu/bot/QSentenceCredReviewer/0.1.0",
                "id": "Uq0Fj57weeOOevIFX1grhnn83suv1Qhj9catKSyehYc",
                "hierarchyLevel": 1,
                "group": 1,
                "opacity": 0.6355179647069141,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentPolarityReviewer",
                "applicationSuite": "Co-inform",
                "dateCreated": "2020-03-27T22:54:00Z",
                "description": "Estimates the polar similarity between two sentences",
                "identifier": "KbF8SznYVInInLxwDsoyutkAEUsV5kLnOLI7bajBF30",
                "launchConfiguration": {},
                "name": "ESI Sentence Polarity Reviewer",
                "softwareVersion": "0.1.0",
                "url": "http://coinform.eu/bot/SentencePolarSimilarityReviewer/0.1.0",
                "id": "KbF8SznYVInInLxwDsoyutkAEUsV5kLnOLI7bajBF30",
                "hierarchyLevel": 2,
                "group": 1,
                "opacity": 0.8053657758507171,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentenceEncoder",
                "dateCreated": "2019-10-17T10:40:00Z",
                "description": "Encodes sentences in a way that, hopefully, places semantically similar sentences close to each other. It was trained on SNS-B and achieved 83% accuracy.",
                "executionEnvironment": {},
                "launchConfiguration": {
                  "class": "RoBERTa_Finetuned_Encoder",
                  "model_name_or_path": "/opt/model/semantic_encoder/",
                  "pooling_strategy": "pooled",
                  "powerfun_k": 8,
                  "powerfun_min_val": 0.85,
                  "seq_len": 64
                },
                "name": "RoBERTa_Finetuned_Encoder",
                "softwareVersion": "0.1.0",
                "identifier": "hiUan4CH-9eEofirqdsMWu7TCq__yIs6q_6x0NhqYME",
                "id": "hiUan4CH-9eEofirqdsMWu7TCq__yIs6q_6x0NhqYME",
                "hierarchyLevel": null,
                "group": 1,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@type": "Organization",
                "name": "Expert System Iberia Lab",
                "url": "http://expertsystem.com",
                "id": "http://expertsystem.com",
                "hierarchyLevel": null,
                "group": 3,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://schema.org",
                "@type": "Dataset",
                "dateCreated": "2020-03-25T09:16:42.032125Z",
                "dateModified": "2020-03-24T20:18:10Z",
                "description": "Dataset of 80298 sentence embeddings extracted from claim reviews and articles collected as part of the Co-inform project",
                "encoding": {
                  "@type": "MediaObject",
                  "contentSize": "1181.60 MB",
                  "encodingFormat": "text/tab-separated-values"
                },
                "identifier": "58ae94d80fc358877932021c33b1dd50c1e2fd1985a093f5c185ddbe19788a07",
                "name": "Co-inform Sentence embeddings",
                "id": "58ae94d80fc358877932021c33b1dd50c1e2fd1985a093f5c185ddbe19788a07",
                "hierarchyLevel": null,
                "group": 2,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SemSentSimReviewer",
                "dateCreated": "2020-03-19T15:09:00Z",
                "description": "Claim neural index that uses a semantic similarity measure based on a semantic encoder. It achieved 83% accuracy on STS-B.",
                "executionEnvironment": {
                  "hostname": "294b42a5477c",
                  "python.version": "3.7.3"
                },
                "identifier": "cbQNmZMDfFeZXgRfSnvBbA8wbrAgOkWUq-JxFAzlMAA",
                "launchConfiguration": {
                  "vecSpace": {
                    "@context": "http://schema.org",
                    "@type": "Dataset",
                    "creator": {
                      "@type": "Organization",
                      "name": "Expert System Iberia Lab",
                      "url": "http://expertsystem.com"
                    },
                    "dateCreated": "2020-03-25T09:16:42.032125Z",
                    "dateModified": "2020-03-24T20:18:10Z",
                    "description": "Dataset of 80298 sentence embeddings extracted from claim reviews and articles collected as part of the Co-inform project",
                    "encoding": {
                      "@type": "MediaObject",
                      "contentSize": "1181.60 MB",
                      "encodingFormat": "text/tab-separated-values"
                    },
                    "identifier": "58ae94d80fc358877932021c33b1dd50c1e2fd1985a093f5c185ddbe19788a07",
                    "name": "Co-inform Sentence embeddings"
                  }
                },
                "name": "ESI Sentence Similarity Reviewer None",
                "softwareVersion": "0.1.0-None",
                "id": "cbQNmZMDfFeZXgRfSnvBbA8wbrAgOkWUq-JxFAzlMAA",
                "hierarchyLevel": 3,
                "group": 1,
                "opacity": 0.592,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "Sentence",
                "description": "A single sentence, possibly appearing in some larger document",
                "identifier": "--1RRg8ttsArjJ_WfShZrg",
                "text": "Ford Motor Company is moving their small car division out of the USA.",
                "id": "--1RRg8ttsArjJ_WfShZrg",
                "hierarchyLevel": 1,
                "group": 2,
                "opacity": 0.6355179647069141,
                "nodeSize": 10,
                "nodeScale": 1.125
              },
              {
                "@context": "http://coinform.eu",
                "@type": "Sentence",
                "description": "A single sentence, possibly appearing in some larger document",
                "identifier": "PvjNRJgjTesnSeM8CS62lA",
                "text": "'Ford is moving all of their small-car production to Mexico.'",
                "id": "PvjNRJgjTesnSeM8CS62lA",
                "hierarchyLevel": 2,
                "group": 2,
                "opacity": 0.778,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentencePair",
                "description": "CreativeWork consisting of exactly two sentences",
                "identifier": "eEZmRoVTIQzydE6ccClwQg",
                "roleA": "querySentence",
                "roleB": "sentenceInDB",
                "text": "'Ford is moving all of their small-car production to Mexico.' Ford Motor Company is moving their small car division out of the USA.",
                "id": "eEZmRoVTIQzydE6ccClwQg",
                "hierarchyLevel": 3,
                "group": 2,
                "opacity": 0.592,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentSimilarityReview",
                "dateCreated": "2020-04-12T09:25:31.064443Z",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": 0.8661883197569902,
                  "reviewAspect": "similarity",
                  "identifier": "iEvCEjb2u8aLS2wptUjYbCocdB1zdahf4WFj3gM7iCE"
                },
                "identifier": "UZF8b9m8366mDXwMxh5tk0Zi9OuSBzpplRdY6nwmYVk",
                "id": "UZF8b9m8366mDXwMxh5tk0Zi9OuSBzpplRdY6nwmYVk",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.592,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@type": "Organization",
                "name": "Expert System Iberia Lab",
                "url": "http://expertsystem.com",
                "identifier": "P8hw6Wm7Wg92Jhdvz-FoCsspd9qPW1WFEPHXbh8Sz8A",
                "id": "P8hw6Wm7Wg92Jhdvz-FoCsspd9qPW1WFEPHXbh8Sz8A",
                "hierarchyLevel": null,
                "group": 3,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentStanceReviewer",
                "dateCreated": "2020-01-13T15:18:00Z",
                "description": "Assesses the stance between two sentences (e.g. agree, disagree, discuss) it was trained and evaluated on FNC-1 achieving 92% accuracy.",
                "executionEnvironment": {
                  "cuda": false,
                  "hostname": "294b42a5477c",
                  "python.version": "3.7.3"
                },
                "identifier": "Q-HBTj4_Ey5Aat7SXIOQ_mTTRl8TAJcOON1tBORnRfs",
                "launchConfiguration": {
                  "model": {
                    "batch_size": 64,
                    "class": "RoBERTa",
                    "finetuned_from_layer": 8,
                    "seq_len": 128,
                    "stance2i": {
                      "agree": 1,
                      "disagree": 2,
                      "discuss": 3,
                      "unrelated": 0
                    },
                    "train_val_result": {
                      "loss": 0.28,
                      "metrics": {
                        "acc": 0.923,
                        "f1_weighted": 0.9186,
                        "n": 25413
                      }
                    }
                  },
                  "model_config": {
                    "@type": "MediaObject",
                    "contentSize": "682 B",
                    "dateCreated": "2020-02-06T14:26:04.601783Z",
                    "dateModified": "2020-01-13T14:18:40Z",
                    "name": "config.json",
                    "sha256Digest": "0a6bdf3e86b77df920446d8be14946eb63a76f9a03bb7a1199967a87e94356e6"
                  },
                  "pytorch_model": {
                    "@type": "MediaObject",
                    "contentSize": "477.80 MB",
                    "dateCreated": "2020-02-06T14:26:04.598783Z",
                    "dateModified": "2020-01-13T14:18:40Z",
                    "name": "pytorch_model.bin",
                    "sha256Digest": "e704d40b6dc392c7a6bb5a45a27286210385a49731a996115654585d2a559963"
                  }
                },
                "name": "ESI Sentence Stance Reviewer",
                "softwareVersion": "0.1.0",
                "id": "Q-HBTj4_Ey5Aat7SXIOQ_mTTRl8TAJcOON1tBORnRfs",
                "hierarchyLevel": 3,
                "group": 1,
                "opacity": 0.8053657758507171,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentStanceReview",
                "dateCreated": "2020-04-12T09:25:31.064443Z",
                "reviewAspect": "stance",
                "reviewRating": {
                  "@type": "Rating",
                  "confidence": 0.8698891997337341,
                  "ratingExplanation": "Sentence **dbSent** **agree** **qSent**.",
                  "ratingValue": "agree",
                  "reviewAspect": "stance",
                  "identifier": "8u0IofVuen-BRRXXeg3ylGjDabV04YbcsJ_Mn4E9qIw"
                },
                "identifier": "734lFR_sG5wT3vRSOyYUfI69Rm0CDqy_uxiczEYqZLI",
                "id": "734lFR_sG5wT3vRSOyYUfI69Rm0CDqy_uxiczEYqZLI",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.8053657758507171,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentPolarSimilarityReview",
                "dateCreated": "2020-04-12T09:25:31.491776Z",
                "headline": "agrees with",
                "reviewAspect": "polarSimilarity",
                "reviewBody": "Sentence **Ford Motor Company is moving their small car division out of the USA.** agrees with **'Ford is moving all of their small-car production to Mexico.'**",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.8698891997337341,
                  "ratingCount": 2,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** agrees with **'Ford is moving all of their small-car production to Mexico.'**",
                  "ratingValue": 0.8680387597453622,
                  "reviewAspect": "polarSimilarity",
                  "reviewCount": 2,
                  "identifier": "l3aWXtuVx0pbNMAgEdzrt6vr9WpvunRYrlAUoVuxjCo"
                },
                "identifier": "Ko4CfCFEVyBQT-QfsduKmhYoLKeVXaitmYsH98qGlOA",
                "id": "Ko4CfCFEVyBQT-QfsduKmhYoLKeVXaitmYsH98qGlOA",
                "hierarchyLevel": 2,
                "group": 0,
                "opacity": 0.8053657758507171,
                "nodeSize": 12,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "MisinfoMeSourceCredReviewer",
                "applicationSuite": "MisinfoMe",
                "softwareVersion": "2020-04-06T00:00:00Z",
                "url": "https://socsem.kmi.open.ac.uk/misinfo",
                "identifier": "CYNKwrLb7HPkigyTeCsGNtFECsfV4G4vP9APRcXkQRo",
                "id": "CYNKwrLb7HPkigyTeCsGNtFECsfV4G4vP9APRcXkQRo",
                "hierarchyLevel": 3,
                "group": 1,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "ClaimReviewNormalizer",
                "applicationSuite": "Co-inform",
                "dateCreated": "2020-03-20T18:27:00Z",
                "description": "Analyses the alternateName and numerical rating value for a ClaimReview and tries to convert that into a normalised credibility rating",
                "identifier": "uPo0cltI6ThRQZL4DS_X4ypCUisZII9cP0nNPGbRV9Y",
                "launchConfiguration": {},
                "name": "ESI ClaimReview Credibility Normalizer",
                "softwareVersion": "0.1.0",
                "url": "http://coinform.eu/bot/ClaimReviewNormalizer/0.1.0",
                "id": "uPo0cltI6ThRQZL4DS_X4ypCUisZII9cP0nNPGbRV9Y",
                "hierarchyLevel": 3,
                "group": 1,
                "opacity": 0.778,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "DBSentCredReviewer",
                "applicationSuite": "Co-inform",
                "dateCreated": "2020-03-20T20:03:00Z",
                "description": "Estimates the credibility of a sentence in the Co-inform DB based on known ClaimReviews or websites where the sentence has been published.",
                "identifier": "IpZh6qysghtjbxqYuU7kCRd0C2J9s3tgDs6dfqfYwSQ",
                "launchConfiguration": {
                  "acred_factchecker_urls": [
                    "https://factcheckni.org/",
                    "https://mediabiasfactcheck.com/",
                    "https://www.snopes.com/",
                    "http://www.politifact.com/",
                    "http://www.factcheck.org/",
                    "http://www.washingtonpost.com/blogs/fact-checker/",
                    "http://truthbetold.news/category/fact-checks/",
                    "http://www.npr.org/sections/politics-fact-check",
                    "http://eldetectordementiras.com/",
                    "http://www.hoax-slayer.com/",
                    "https://apnews.com/tag/APFactCheck",
                    "https://africacheck.org/",
                    "http://www.lupa.news/",
                    "http://apublica.org/truco",
                    "http://aosfatos.org/",
                    "http://chequeado.com/",
                    "http://climatefeedback.org/",
                    "https://correctiv.org/echtjetzt/",
                    "http://www.dogrulukpayi.com/",
                    "http://www.lasexta.com/programas/el-objetivo/prueba-verificacion/",
                    "http://factcheck.ge/",
                    "http://observers.france24.com/fr/",
                    "https://fullfact.org/",
                    "http://www.istinomer.rs/",
                    "http://istinomjer.ba/",
                    "http://www.lemonde.fr/les-decodeurs/",
                    "http://www.liberation.fr/desintox,99721",
                    "http://observador.pt/seccao/observador/fact-check/",
                    "https://pagellapolitica.it/",
                    "http://www.abc.net.au/news/factcheck/",
                    "https://teyit.org/",
                    "https://theconversation.com/au/factcheck",
                    "http://www.thejournal.ie/factcheck/news/",
                    "https://www.washingtonpost.com/news/fact-checker/",
                    "http://www.metro.se/viralgranskaren",
                    "https://eufactcheck.eu/fact-checks/",
                    "https://factcheckeu.info/en/",
                    "https://correctiv.org/thema/faktencheck/",
                    "https://www.20minutes.fr/",
                    "https://factuel.afp.com/",
                    "https://www.liberation.fr/checknews,100893",
                    "https://www.ellinikahoaxes.gr/",
                    "https://faktograf.hr/",
                    "https://observers.france24.com/fr/",
                    "https://www.lavoce.info/",
                    "https://leadstories.com/",
                    "https://factcheckeu.info/es/publisher/les-d%C3%A9codeurs",
                    "https://maldita.es/",
                    "https://newtral.es/",
                    "https://observador.pt/",
                    "https://pagellapolitica.it/",
                    "https://www.15min.lt/patikrinta-15min",
                    "https://www.thejournal.ie/",
                    "https://www.mm.dk/tjekdet/",
                    "http://sadroz.af/",
                    "http://www.vertetematesi.info/",
                    "http://chequeado.com/",
                    "http://www.abc.net.au/news/factcheck/",
                    "http://www.crikey.com.au/column/get-fact/",
                    "http://www.medicalobserver.com.au/",
                    "http://www.politifact.com.au/",
                    "http://theconversation.com/us/topics/election-factcheck",
                    "https://factcheckeu.org/",
                    "http://blogs.oglobo.globo.com/preto-no-branco/",
                    "http://apublica.org/truco/",
                    "http://istinomjer.ba/",
                    "https://globalnews.ca/tag/baloney-meter/",
                    "http://factscan.ca/",
                    "https://lasillavacia.com/hilos-tematicos/detector-de-mentiras",
                    "http://media.elfinancierocr.com/retealcandidato/",
                    "http://uycheck.com/",
                    "http://morsimeter.com/en",
                    "http://faktabaari.fi/",
                    "http://www.liberation.fr/desintox,99721",
                    "http://tempsreel.nouvelobs.com/politique/les-pinocchios-de-l-obs/",
                    "http://factcheck.ge/en/",
                    "https://faktomat.adhocracy.de/instance/faktomat",
                    "http://www.spiegel.de/thema/muenchhausen_check/",
                    "http://zdfcheck.zdf.de/",
                    "http://idemagog.hu/",
                    "http://factchecker.in/",
                    "https://rouhanimeter.com/",
                    "http://www.politicometro.it/",
                    "http://www.animalpolitico.com/elsabueso/el-sabueso/",
                    "http://www.promis.md/",
                    "https://fhjfactcheck.wordpress.com/",
                    "http://www.journalistiekennieuwemedia.nl/NC/",
                    "http://www.radionz.co.nz/news/political/252810/election-2014-fact-or-fiction",
                    "http://www.buharimeter.ng/",
                    "http://www.bt.no/nyheter/innenriks/faktasjekk/",
                    "http://demagog.org.pl/",
                    "http://www.obywatelerozliczaja.pl/",
                    "http://www.factual.ro/",
                    "http://www.istinomer.rs/",
                    "http://www.demagog.sk/",
                    "https://africacheck.org/",
                    "http://poll.ilyo.co.kr/?ac=poll&tac=main",
                    "http://news.jtbc.joins.com/hotissue/timeline_issue.aspx?comp_id=NC10011176",
                    "http://newstapa.org/tag/%EC%A0%95%EB%A7%90",
                    "http://www.periodistadigital.com/verdadmentira/",
                    "http://blog.svd.se/faktakollen/",
                    "http://www.svt.se/nyheter/2923690",
                    "http://jomaameter.org/?locale=en#.VfNoMpfriio",
                    "http://www.dogrulukpayi.com/",
                    "http://fakecontrol.org/",
                    "http://www.stopfake.org/en/news/",
                    "http://vladometr.org/",
                    "http://www.theguardian.com/news/reality-check",
                    "http://blogs.channel4.com/factcheck/"
                  ],
                  "factchecker_website_to_qclaim_confidence_penalty_factor": 0.5
                },
                "name": "ESI DB Sentence Credibility Reviewer",
                "softwareVersion": "0.1.0",
                "url": "http://coinform.eu/bot/DBSentCredReviewer/0.1.0",
                "id": "IpZh6qysghtjbxqYuU7kCRd0C2J9s3tgDs6dfqfYwSQ",
                "hierarchyLevel": 2,
                "group": 1,
                "opacity": 0.778,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@type": "WebSite",
                "identifier": "http://www.politifact.com/",
                "name": "www.politifact.com",
                "url": "http://www.politifact.com/",
                "id": "http://www.politifact.com/",
                "hierarchyLevel": 3,
                "group": 2,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "WebSiteCredReview",
                "dateCreated": "2020-04-12T09:25:31.491512Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 1.8281672472160912e-16,
                  "ratingCount": 2,
                  "ratingExplanation": "Based on 2 review(s) for site **www.politifact.com** by external rater(s) ([NewsGuard](https://www.newsguardtech.com/) or [Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.9695546558704454,
                  "reviewAspect": "credibility",
                  "reviewCount": 2,
                  "identifier": "EE8S4dRMC7uFiS6i2WYNk7sF5GhRHyk_I9kn-QIVs78"
                },
                "timings": {
                  "@context": "http://coinform.eu",
                  "@type": "Timing",
                  "phase": "misinfome_source_credibility",
                  "sub_timings": [],
                  "total_ms": 0
                },
                "identifier": "nrum8cGnr4tChS34-6cWNj_B44kiGWFbFhoOP3qPN8E",
                "id": "nrum8cGnr4tChS34-6cWNj_B44kiGWFbFhoOP3qPN8E",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.2,
                "nodeSize": 12,
                "nodeScale": 1.0
              },
              {
                "@type": "Rating",
                "confidence": 0.0,
                "ratingExplanation": "Unknown accuracy for textual claim-review rating 'mixture'",
                "ratingValue": 0.0,
                "reviewAspect": "credibility",
                "identifier": "wk1YkQRunDfNz5cx1JDu7svEQM1LqMTr5wcyWoAASlc",
                "id": "wk1YkQRunDfNz5cx1JDu7svEQM1LqMTr5wcyWoAASlc",
                "hierarchyLevel": null,
                "group": 0,
                "opacity": 0.592,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@type": "Rating",
                "confidence": 0.85,
                "description": "Normalised accuracy from original rating value (and range)",
                "ratingExplanation": "Based on normalised numeric ratingValue 2 in range [1-5]",
                "ratingValue": -0.5,
                "reviewAspect": "credibility",
                "identifier": "6PmtjjTF3dDdjnaaon6TIibqykI5vsRpgCCKXqztqpg",
                "id": "6PmtjjTF3dDdjnaaon6TIibqykI5vsRpgCCKXqztqpg",
                "hierarchyLevel": null,
                "group": 0,
                "opacity": 0.592,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@type": "schema:Organization",
                "url": "http://www.politifact.com",
                "identifier": "I7TQV_GrI_O_80z9ojNXfTd8YIDTQCg5xt5SLiOPiVY",
                "id": "I7TQV_GrI_O_80z9ojNXfTd8YIDTQCg5xt5SLiOPiVY",
                "hierarchyLevel": null,
                "group": 3,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "NormalisedClaimReview",
                "basedOnClaimReview": {
                  "@context": {
                    "nif": "http://persistence.uni-leipzig.org/nlp2rdf/ontologies/nif-core#",
                    "schema": "http://schema.org"
                  },
                  "@id": "http://data.gesis.org/claimskg/claim_review/03aa9502-c58c-54a7-b42c-6826198a76fe",
                  "@type": "schema:ClaimReview",
                  "author": {
                    "@type": "schema:Organization",
                    "url": "http://www.politifact.com",
                    "identifier": "I7TQV_GrI_O_80z9ojNXfTd8YIDTQCg5xt5SLiOPiVY"
                  },
                  "claimReviewed": "'Ford is moving all of their small-car production to Mexico.'",
                  "datePublished": "2016-10-23",
                  "headline": "Donald Trump says Ford is moving all small-car production to Mexico",
                  "inLanguage": {
                    "@type": "schema:Language",
                    "alternateName": "en",
                    "name": "English"
                  },
                  "itemReviewed": {
                    "@id": "http://data.gesis.org/claimskg/creative_work/076cca8a-bed6-527b-a2b0-34c5ef21fed0",
                    "@type": "schema:CreativeWork",
                    "author": {
                      "@type": "Thing",
                      "name": "Donald Trump"
                    },
                    "citation": [
                      "https://money.cnn.com/2016/09/15/news/companies/donald-trump-ford-ceo-mark-fields/index.html?",
                      "https://www.cnbc.com/2016/09/15/ford-to-move-all-small-car-production-to-mexico-from-us-ceo.html?",
                      "https://www.sharethefacts.co/share/0f5ed3db-289b-4d1c-a1d6-4c03ac61e82?",
                      "https://www.youtube.com/watch?v%3DKi6lvK1_Hpg"
                    ],
                    "datePublished": "2016-10-20",
                    "keywords": "Corporations,Trade,Workers",
                    "text": "'Ford is moving all of their small-car production to Mexico.'"
                  },
                  "mentions": [
                    {
                      "@type": "nif:String",
                      "beginIndex": 1204,
                      "endIndex": 1223,
                      "isString": "United Auto Workers"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 7,
                      "endIndex": 19,
                      "isString": "Donald Trump"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1489,
                      "endIndex": 1508,
                      "isString": "low gasoline prices"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 2359,
                      "endIndex": 2367,
                      "isString": "Fox News"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1844,
                      "endIndex": 1863,
                      "isString": "United Auto Workers"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 152,
                      "endIndex": 165,
                      "isString": "Delaware, Ohio"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 747,
                      "endIndex": 758,
                      "isString": "Mark Fields"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 950,
                      "endIndex": 957,
                      "isString": "Reuters"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 3231,
                      "endIndex": 3236,
                      "isString": "https"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1676,
                      "endIndex": 1679,
                      "isString": "CNN"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1175,
                      "endIndex": 1185,
                      "isString": "Wayne, Mich"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1299,
                      "endIndex": 1306,
                      "isString": "Reuters"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 2578,
                      "endIndex": 2581,
                      "isString": "CNN"
                    }
                  ],
                  "reviewRating": {
                    "@type": "schema:Rating",
                    "alternateName": "MIXTURE",
                    "author": "http://data.gesis.org/claimskg/organization/claimskg",
                    "ratingValue": 2
                  },
                  "url": "http://www.politifact.com/truth-o-meter/statements/2016/oct/23/donald-trump/donald-trump-says-ford-moving-all-small-car-produc/"
                },
                "claimReviewed": "'Ford is moving all of their small-car production to Mexico.'",
                "dateCreated": "2020-04-12T09:25:31.491941Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.85,
                  "description": "Normalised accuracy from original rating value (and range)",
                  "ratingCount": 2,
                  "ratingExplanation": "Based on normalised numeric ratingValue 2 in range [1-5]",
                  "ratingValue": -0.5,
                  "reviewAspect": "credibility",
                  "reviewCount": 1,
                  "identifier": "Voc0wDZiP5gk8UOq7zL8lPXfFJVbHhubG4gDjpV5L6k"
                },
                "identifier": "qh1JwUdGchTrL6sq_stksY9uLOvxIOk2fIlzJO_V0lc",
                "id": "qh1JwUdGchTrL6sq_stksY9uLOvxIOk2fIlzJO_V0lc",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.778,
                "nodeSize": 30,
                "nodeScale": 2.5
              },
              {
                "@type": "Article",
                "coinform_collection": "unknown",
                "datePublished": "2016-10-20T00:00:00Z",
                "inLanguage": null,
                "publisher": "www.politifact.com",
                "url": "http://www.politifact.com/truth-o-meter/statements/2016/oct/23/donald-trump/donald-trump-says-ford-moving-all-small-car-produc/",
                "identifier": "0MYSsyyVCMUh0P9TUbi93nAxJ30PHJSTLFxWrwC17Pg",
                "id": "0MYSsyyVCMUh0P9TUbi93nAxJ30PHJSTLFxWrwC17Pg",
                "hierarchyLevel": null,
                "group": 2,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "DBSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.491975Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.85,
                  "ratingCount": 6,
                  "ratingExplanation": "Based on normalised numeric ratingValue 2 in range [1-5]",
                  "ratingValue": -0.5,
                  "reviewAspect": "credibility",
                  "reviewCount": 5,
                  "identifier": "-0FasTcH16YaRUUe-aoEFGO_hCeonHw8pHYvbJBtOwE"
                },
                "identifier": "LnLWN0FnVGY576BeAV7XehwasWNKv3hShWgVofFPzF0",
                "id": "LnLWN0FnVGY576BeAV7XehwasWNKv3hShWgVofFPzF0",
                "hierarchyLevel": 2,
                "group": 0,
                "opacity": 0.778,
                "nodeSize": 15,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "QSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.492184Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@context": "http://coinform.eu",
                  "@type": "AggregateRating",
                  "additionalType": [
                    "Rating"
                  ],
                  "confidence": 0.7378329457835579,
                  "ratingCount": 10,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** agrees with:\n\n * 'Ford is moving all of their small-car production to Mexico.'\nthat seems mostly not credible. Based on normalised numeric ratingValue 2 in range [1-5]",
                  "ratingValue": -0.5,
                  "reviewAspect": "credibility",
                  "reviewCount": 9,
                  "identifier": "cSSe2Vg8Mk0QFfGTWKyQ-40kWRSUsvGCTP7PgMZ7gHk"
                },
                "identifier": "4qb-POCrNCxKpO-JzULDoljCt5AVZChYy6MEDmRS4ow",
                "id": "4qb-POCrNCxKpO-JzULDoljCt5AVZChYy6MEDmRS4ow",
                "hierarchyLevel": 1,
                "group": 0,
                "opacity": 0.6355179647069141,
                "nodeSize": 19,
                "nodeScale": 1.125
              },
              {
                "@context": "http://coinform.eu",
                "@type": "Sentence",
                "description": "A single sentence, possibly appearing in some larger document",
                "identifier": "zrcjFPSE7iSPcS0mey9dwg",
                "text": "'General Motors is the largest corporation in the world again.'",
                "id": "zrcjFPSE7iSPcS0mey9dwg",
                "hierarchyLevel": 2,
                "group": 2,
                "opacity": 1.0,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentencePair",
                "description": "CreativeWork consisting of exactly two sentences",
                "identifier": "78X2CAhb5Od-V0O1I39rjA",
                "roleA": "querySentence",
                "roleB": "sentenceInDB",
                "text": "'General Motors is the largest corporation in the world again.' Ford Motor Company is moving their small car division out of the USA.",
                "id": "78X2CAhb5Od-V0O1I39rjA",
                "hierarchyLevel": 3,
                "group": 2,
                "opacity": 0.592,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentSimilarityReview",
                "dateCreated": "2020-04-12T09:25:31.064443Z",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": 0.7903001623628234,
                  "reviewAspect": "similarity",
                  "identifier": "P5w3XOmfgq5-mbRMt8oAqOp095bpg6CkEugZiIalEjM"
                },
                "identifier": "NN9B0J3reQxaNTDloOcq9JixxBAgcKfbMByv9P_sGoY",
                "id": "NN9B0J3reQxaNTDloOcq9JixxBAgcKfbMByv9P_sGoY",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.592,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentStanceReview",
                "dateCreated": "2020-04-12T09:25:31.064443Z",
                "reviewAspect": "stance",
                "reviewRating": {
                  "@type": "Rating",
                  "confidence": 0.8526970744132996,
                  "ratingExplanation": "Sentence **dbSent** **unrelated** **qSent**.",
                  "ratingValue": "unrelated",
                  "reviewAspect": "stance",
                  "identifier": "GEsDd6ICeKHied7574OnT6YNG6sgKDMRk4XMRy2_vKc"
                },
                "identifier": "czP7xVEiGO-jVCJaUcr5VActQM0LJT_EQF7pdQDj18M",
                "id": "czP7xVEiGO-jVCJaUcr5VActQM0LJT_EQF7pdQDj18M",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.7816738405704002,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentPolarSimilarityReview",
                "dateCreated": "2020-04-12T09:25:31.492292Z",
                "headline": "is similar(?) but unrelated to",
                "reviewAspect": "polarSimilarity",
                "reviewBody": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to **'General Motors is the largest corporation in the world again.'**",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.8526970744132996,
                  "ratingCount": 2,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to **'General Motors is the largest corporation in the world again.'**",
                  "ratingValue": 0.711270146126541,
                  "reviewAspect": "polarSimilarity",
                  "reviewCount": 2,
                  "identifier": "Au3EXa4hxjEPOwZrq_xdfDcdyYrhCrjmWOuw5TGj4-I"
                },
                "identifier": "zkBwTfO2bSuJ225CwEufA9X_tisn8ttUz58WAun3w2A",
                "id": "zkBwTfO2bSuJ225CwEufA9X_tisn8ttUz58WAun3w2A",
                "hierarchyLevel": 2,
                "group": 0,
                "opacity": 0.7816738405704002,
                "nodeSize": 12,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "WebSiteCredReview",
                "dateCreated": "2020-04-12T09:25:31.491521Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 1.8281672472160912e-16,
                  "ratingCount": 2,
                  "ratingExplanation": "Based on 2 review(s) for site **www.politifact.com** by external rater(s) ([NewsGuard](https://www.newsguardtech.com/) or [Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.9695546558704454,
                  "reviewAspect": "credibility",
                  "reviewCount": 2,
                  "identifier": "EE8S4dRMC7uFiS6i2WYNk7sF5GhRHyk_I9kn-QIVs78"
                },
                "timings": {
                  "@context": "http://coinform.eu",
                  "@type": "Timing",
                  "phase": "misinfome_source_credibility",
                  "sub_timings": [],
                  "total_ms": 0
                },
                "identifier": "BqegyJUJl8XtGxi594VUqxtArYQE7Yf-JDMtzm_ht0w",
                "id": "BqegyJUJl8XtGxi594VUqxtArYQE7Yf-JDMtzm_ht0w",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.2,
                "nodeSize": 12,
                "nodeScale": 1.0
              },
              {
                "@type": "Rating",
                "confidence": 1.0,
                "ratingExplanation": "Based on textual claim-review rating 'false'",
                "ratingValue": -1.0,
                "reviewAspect": "credibility",
                "identifier": "v06yhtFzzdqHmkJU0f7Oyb9eUlYonK1bewS0BUvgtPA",
                "id": "v06yhtFzzdqHmkJU0f7Oyb9eUlYonK1bewS0BUvgtPA",
                "hierarchyLevel": null,
                "group": 0,
                "opacity": 0.592,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@type": "Rating",
                "confidence": 0.85,
                "description": "Normalised accuracy from original rating value (and range)",
                "ratingExplanation": "Based on normalised numeric ratingValue 1 in range [1-5]",
                "ratingValue": -1.0,
                "reviewAspect": "credibility",
                "identifier": "c-ZIMfvNF5Oc6wrb_8Q5tYZfNmZS6gB9jplea7eNmVQ",
                "id": "c-ZIMfvNF5Oc6wrb_8Q5tYZfNmZS6gB9jplea7eNmVQ",
                "hierarchyLevel": null,
                "group": 0,
                "opacity": 0.592,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "NormalisedClaimReview",
                "basedOnClaimReview": {
                  "@context": {
                    "nif": "http://persistence.uni-leipzig.org/nlp2rdf/ontologies/nif-core#",
                    "schema": "http://schema.org"
                  },
                  "@id": "http://data.gesis.org/claimskg/claim_review/09c3a442-4f7b-5351-9db1-f8d1235f6c9d",
                  "@type": "schema:ClaimReview",
                  "author": {
                    "@type": "schema:Organization",
                    "url": "http://www.politifact.com",
                    "identifier": "I7TQV_GrI_O_80z9ojNXfTd8YIDTQCg5xt5SLiOPiVY"
                  },
                  "claimReviewed": "'General Motors is the largest corporation in the world again.'",
                  "datePublished": "2012-04-09",
                  "headline": "Vice President Joe Biden says, 'General Motors is the largest corporation in the world'",
                  "inLanguage": {
                    "@type": "schema:Language",
                    "alternateName": "en",
                    "name": "English"
                  },
                  "itemReviewed": {
                    "@id": "http://data.gesis.org/claimskg/creative_work/f49751f7-f221-567e-b25e-141104837a36",
                    "@type": "schema:CreativeWork",
                    "author": {
                      "@type": "Thing",
                      "name": "Joe Biden"
                    },
                    "citation": [
                      "http://articles.latimes.com/2012/jan/12/business/la-fi-autos-hiring-20120113?",
                      "http://www.foxnews.com/opinion/2012/04/03/fresh-fibs-half-truths-and-more-from-biden-but-media-stays-mum/?",
                      "https://money.cnn.com/magazines/fortune/global500/2011/?",
                      "https://money.cnn.com/magazines/fortune/global500/2011/faq/?",
                      "https://twitter.com/politifact?",
                      "https://www.cbsnews.com/video/watch/?id%3D7403928n%26tag%3DmorningFlexGridLeft;ftnImageStack",
                      "https://www.facebook.com/politifact?",
                      "https://www.forbes.com/2011/04/20/global-2000-11-methodology.html?",
                      "https://www.forbes.com/companies/general-motors/?",
                      "https://www.forbes.com/global2000/list/?",
                      "https://www.politifact.com/truth-o-meter/statements/2012/feb/27/mitt-romney/mitt-romney-says-obama-gave-away-car-companies-uni/?",
                      "https://www.politifact.com/truth-o-meter/statements/2012/jan/25/barack-obama/Barack-Obama-bailout-GM-number-one?"
                    ],
                    "datePublished": "2012-04-01",
                    "keywords": "Corporations,Economy",
                    "mentions": {
                      "@type": "nif:String",
                      "beginIndex": 0,
                      "endIndex": 14,
                      "isString": "General Motors"
                    },
                    "text": "'General Motors is the largest corporation in the world again.'"
                  },
                  "mentions": [
                    {
                      "@type": "nif:String",
                      "beginIndex": 2323,
                      "endIndex": 2337,
                      "isString": "General Motors"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 2395,
                      "endIndex": 2430,
                      "isString": "vice president of the United States"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 15,
                      "endIndex": 24,
                      "isString": "Joe Biden"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1345,
                      "endIndex": 1351,
                      "isString": "Forbes"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1915,
                      "endIndex": 1921,
                      "isString": "Toyota"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1945,
                      "endIndex": 1959,
                      "isString": "General Motors"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1654,
                      "endIndex": 1660,
                      "isString": "Toyota"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 144,
                      "endIndex": 154,
                      "isString": "April Fool"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1783,
                      "endIndex": 1799,
                      "isString": "General Electric"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 466,
                      "endIndex": 474,
                      "isString": "Facebook"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1977,
                      "endIndex": 1993,
                      "isString": "General Electric"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1838,
                      "endIndex": 1848,
                      "isString": "Volkswagen"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 2004,
                      "endIndex": 2010,
                      "isString": "Forbes"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1665,
                      "endIndex": 1675,
                      "isString": "Volkswagen"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 418,
                      "endIndex": 427,
                      "isString": "Karl Rove"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1057,
                      "endIndex": 1071,
                      "isString": "General Motors"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1826,
                      "endIndex": 1832,
                      "isString": "Forbes"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 1883,
                      "endIndex": 1895,
                      "isString": "Mercedes-Benz"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 400,
                      "endIndex": 408,
                      "isString": "Fox News"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 633,
                      "endIndex": 645,
                      "isString": "Barack Obama"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 572,
                      "endIndex": 582,
                      "isString": "Republican"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 34,
                      "endIndex": 48,
                      "isString": "General Motors"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 606,
                      "endIndex": 617,
                      "isString": "Mitt Romney"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 118,
                      "endIndex": 133,
                      "isString": "Face the Nation"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 495,
                      "endIndex": 510,
                      "isString": "Face the Nation"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 458,
                      "endIndex": 465,
                      "isString": "Twitter"
                    },
                    {
                      "@type": "nif:String",
                      "beginIndex": 516,
                      "endIndex": 529,
                      "isString": "Bob Schieffer"
                    }
                  ],
                  "reviewRating": {
                    "@type": "schema:Rating",
                    "alternateName": "FALSE",
                    "author": "http://data.gesis.org/claimskg/organization/claimskg",
                    "ratingValue": 1
                  },
                  "url": "http://www.politifact.com/truth-o-meter/statements/2012/apr/09/joe-biden/vice-president-joe-biden-says-general-motors-large/"
                },
                "claimReviewed": "'General Motors is the largest corporation in the world again.'",
                "dateCreated": "2020-04-12T09:25:31.492415Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 1.0,
                  "ratingCount": 2,
                  "ratingExplanation": "Based on textual claim-review rating 'false'",
                  "ratingValue": -1.0,
                  "reviewAspect": "credibility",
                  "reviewCount": 1,
                  "identifier": "zSiQZEQOS1xIk80IjTcOqM62CyUO7rpkPh-HZoFlF1A"
                },
                "identifier": "10Ocauj5hEvrAatGE9sCLSGDDj5pHtU51ivOJhvRxpg",
                "id": "10Ocauj5hEvrAatGE9sCLSGDDj5pHtU51ivOJhvRxpg",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 1.0,
                "nodeSize": 30,
                "nodeScale": 2.5
              },
              {
                "@type": "Article",
                "coinform_collection": "unknown",
                "datePublished": "2012-04-01T00:00:00Z",
                "inLanguage": null,
                "publisher": "www.politifact.com",
                "url": "http://www.politifact.com/truth-o-meter/statements/2012/apr/09/joe-biden/vice-president-joe-biden-says-general-motors-large/",
                "identifier": "5THcARhyXo0UGBvmown4R3wLD8K41pg61aQnk1hiGdA",
                "id": "5THcARhyXo0UGBvmown4R3wLD8K41pg61aQnk1hiGdA",
                "hierarchyLevel": null,
                "group": 2,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "DBSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.492446Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 1.0,
                  "ratingCount": 6,
                  "ratingExplanation": "Based on textual claim-review rating 'false'",
                  "ratingValue": -1.0,
                  "reviewAspect": "credibility",
                  "reviewCount": 5,
                  "identifier": "mK-vtLedfYUfwu61eDbZh9QHUIISNYRhacE-j6m7bBg"
                },
                "identifier": "m5OtElnrk6jNwL0DTHA1V3wBuL6ghtEIaR_lDOT4kqk",
                "id": "m5OtElnrk6jNwL0DTHA1V3wBuL6ghtEIaR_lDOT4kqk",
                "hierarchyLevel": 2,
                "group": 0,
                "opacity": 1.0,
                "nodeSize": 15,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "QSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.492650Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@context": "http://coinform.eu",
                  "@type": "AggregateRating",
                  "additionalType": [
                    "Rating"
                  ],
                  "confidence": 0.711270146126541,
                  "ratingCount": 10,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to:\n\n * 'General Motors is the largest corporation in the world again.'\nthat seems not credible. Based on textual claim-review rating 'false'",
                  "ratingValue": -1.0,
                  "reviewAspect": "credibility",
                  "reviewCount": 9,
                  "identifier": "0cdc_463dTDh7W59WCztxOShS3EEFdEzUcHQqrxHukI"
                },
                "identifier": "Nr9qZEKkFg2XvjTH92jdqkHX2BKqAalypC9sB6Tt_es",
                "id": "Nr9qZEKkFg2XvjTH92jdqkHX2BKqAalypC9sB6Tt_es",
                "hierarchyLevel": 1,
                "group": 0,
                "opacity": 0.6047241766166969,
                "nodeSize": 19,
                "nodeScale": 1.125
              },
              {
                "@context": "http://coinform.eu",
                "@type": "Sentence",
                "description": "A single sentence, possibly appearing in some larger document",
                "identifier": "BaUOLPRLn0GTbChdn85ejA",
                "text": "Now that Renault-Nissan has also taken control of Mitsubishi, we can count on the next generation of L 200 also to be built on a new common picnic.",
                "id": "BaUOLPRLn0GTbChdn85ejA",
                "hierarchyLevel": 2,
                "group": 2,
                "opacity": 0.32800000000000009,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentencePair",
                "description": "CreativeWork consisting of exactly two sentences",
                "identifier": "NvLqzcL4PZo1auwI7EzlLQ",
                "roleA": "querySentence",
                "roleB": "sentenceInDB",
                "text": "Ford Motor Company is moving their small car division out of the USA. Now that Renault-Nissan has also taken control of Mitsubishi, we can count on the next generation of L 200 also to be built on a new common picnic.",
                "id": "NvLqzcL4PZo1auwI7EzlLQ",
                "hierarchyLevel": 3,
                "group": 2,
                "opacity": 0.592,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentSimilarityReview",
                "dateCreated": "2020-04-12T09:25:31.064443Z",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": 0.7864739120604724,
                  "reviewAspect": "similarity",
                  "identifier": "RXfUHhNy8w5nVocodTvu62ISg0zstjr-QUThc9rWNAI"
                },
                "identifier": "-5bzkAxhgc0oEq0t4KbQM_nyR625g0rXtCfqvIvqcKA",
                "id": "-5bzkAxhgc0oEq0t4KbQM_nyR625g0rXtCfqvIvqcKA",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.592,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentStanceReview",
                "dateCreated": "2020-04-12T09:25:31.064443Z",
                "reviewAspect": "stance",
                "reviewRating": {
                  "@type": "Rating",
                  "confidence": 0.9987745881080627,
                  "ratingExplanation": "Sentence **dbSent** **unrelated** **qSent**.",
                  "ratingValue": "unrelated",
                  "reviewAspect": "stance",
                  "identifier": "OYXVooQ8X5lEz1DN7MZwLO2_XDDLs3aQfpovr-NCsCw"
                },
                "identifier": "MwDFdo6q83issqPd5LyReWBXDBynZz5BcTuq9nf6WFg",
                "id": "MwDFdo6q83issqPd5LyReWBXDBynZz5BcTuq9nf6WFg",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.9980405422803445,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentPolarSimilarityReview",
                "dateCreated": "2020-04-12T09:25:31.492750Z",
                "headline": "is similar(?) but unrelated to",
                "reviewAspect": "polarSimilarity",
                "reviewBody": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to **Now that Renault-Nissan has also taken control of Mitsubishi, we can count on the next generation of L 200 also to be built on a new common picnic.**",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.9987745881080627,
                  "ratingCount": 2,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to **Now that Renault-Nissan has also taken control of Mitsubishi, we can count on the next generation of L 200 also to be built on a new common picnic.**",
                  "ratingValue": 0.7078265208544251,
                  "reviewAspect": "polarSimilarity",
                  "reviewCount": 2,
                  "identifier": "HDID5lOedTArXw5zFTYLcoFb_0YYXwe7eQk589VJjZY"
                },
                "identifier": "zCmHKQWE6xTuQ-VK8MKNGC-8cSL1Bmvv-lhu-uratkI",
                "id": "zCmHKQWE6xTuQ-VK8MKNGC-8cSL1Bmvv-lhu-uratkI",
                "hierarchyLevel": 2,
                "group": 0,
                "opacity": 0.9980405422803445,
                "nodeSize": 12,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "DBSentCredReviewer",
                "applicationSuite": "Co-inform",
                "dateCreated": "2020-03-20T20:03:00Z",
                "description": "Estimates the credibility of a sentence in the Co-inform DB based on known ClaimReviews or websites where the sentence has been published.",
                "identifier": "wyhE2Lk6BWaqDURwOMB7K81oYhb3lxxr6yDUd35S1-0",
                "launchConfiguration": {
                  "acred_factchecker_urls": [
                    "https://factcheckni.org/",
                    "https://mediabiasfactcheck.com/",
                    "https://www.snopes.com/",
                    "http://www.politifact.com/",
                    "http://www.factcheck.org/",
                    "http://www.washingtonpost.com/blogs/fact-checker/",
                    "http://truthbetold.news/category/fact-checks/",
                    "http://www.npr.org/sections/politics-fact-check",
                    "http://eldetectordementiras.com/",
                    "http://www.hoax-slayer.com/",
                    "https://apnews.com/tag/APFactCheck",
                    "https://africacheck.org/",
                    "http://www.lupa.news/",
                    "http://apublica.org/truco",
                    "http://aosfatos.org/",
                    "http://chequeado.com/",
                    "http://climatefeedback.org/",
                    "https://correctiv.org/echtjetzt/",
                    "http://www.dogrulukpayi.com/",
                    "http://www.lasexta.com/programas/el-objetivo/prueba-verificacion/",
                    "http://factcheck.ge/",
                    "http://observers.france24.com/fr/",
                    "https://fullfact.org/",
                    "http://www.istinomer.rs/",
                    "http://istinomjer.ba/",
                    "http://www.lemonde.fr/les-decodeurs/",
                    "http://www.liberation.fr/desintox,99721",
                    "http://observador.pt/seccao/observador/fact-check/",
                    "https://pagellapolitica.it/",
                    "http://www.abc.net.au/news/factcheck/",
                    "https://teyit.org/",
                    "https://theconversation.com/au/factcheck",
                    "http://www.thejournal.ie/factcheck/news/",
                    "https://www.washingtonpost.com/news/fact-checker/",
                    "http://www.metro.se/viralgranskaren",
                    "https://eufactcheck.eu/fact-checks/",
                    "https://factcheckeu.info/en/",
                    "https://correctiv.org/thema/faktencheck/",
                    "https://www.20minutes.fr/",
                    "https://factuel.afp.com/",
                    "https://www.liberation.fr/checknews,100893",
                    "https://www.ellinikahoaxes.gr/",
                    "https://faktograf.hr/",
                    "https://observers.france24.com/fr/",
                    "https://www.lavoce.info/",
                    "https://leadstories.com/",
                    "https://factcheckeu.info/es/publisher/les-d%C3%A9codeurs",
                    "https://maldita.es/",
                    "https://newtral.es/",
                    "https://observador.pt/",
                    "https://pagellapolitica.it/",
                    "https://www.15min.lt/patikrinta-15min",
                    "https://www.thejournal.ie/",
                    "https://www.mm.dk/tjekdet/",
                    "http://sadroz.af/",
                    "http://www.vertetematesi.info/",
                    "http://chequeado.com/",
                    "http://www.abc.net.au/news/factcheck/",
                    "http://www.crikey.com.au/column/get-fact/",
                    "http://www.medicalobserver.com.au/",
                    "http://www.politifact.com.au/",
                    "http://theconversation.com/us/topics/election-factcheck",
                    "https://factcheckeu.org/",
                    "http://blogs.oglobo.globo.com/preto-no-branco/",
                    "http://apublica.org/truco/",
                    "http://istinomjer.ba/",
                    "https://globalnews.ca/tag/baloney-meter/",
                    "http://factscan.ca/",
                    "https://lasillavacia.com/hilos-tematicos/detector-de-mentiras",
                    "http://media.elfinancierocr.com/retealcandidato/",
                    "http://uycheck.com/",
                    "http://morsimeter.com/en",
                    "http://faktabaari.fi/",
                    "http://www.liberation.fr/desintox,99721",
                    "http://tempsreel.nouvelobs.com/politique/les-pinocchios-de-l-obs/",
                    "http://factcheck.ge/en/",
                    "https://faktomat.adhocracy.de/instance/faktomat",
                    "http://www.spiegel.de/thema/muenchhausen_check/",
                    "http://zdfcheck.zdf.de/",
                    "http://idemagog.hu/",
                    "http://factchecker.in/",
                    "https://rouhanimeter.com/",
                    "http://www.politicometro.it/",
                    "http://www.animalpolitico.com/elsabueso/el-sabueso/",
                    "http://www.promis.md/",
                    "https://fhjfactcheck.wordpress.com/",
                    "http://www.journalistiekennieuwemedia.nl/NC/",
                    "http://www.radionz.co.nz/news/political/252810/election-2014-fact-or-fiction",
                    "http://www.buharimeter.ng/",
                    "http://www.bt.no/nyheter/innenriks/faktasjekk/",
                    "http://demagog.org.pl/",
                    "http://www.obywatelerozliczaja.pl/",
                    "http://www.factual.ro/",
                    "http://www.istinomer.rs/",
                    "http://www.demagog.sk/",
                    "https://africacheck.org/",
                    "http://poll.ilyo.co.kr/?ac=poll&tac=main",
                    "http://news.jtbc.joins.com/hotissue/timeline_issue.aspx?comp_id=NC10011176",
                    "http://newstapa.org/tag/%EC%A0%95%EB%A7%90",
                    "http://www.periodistadigital.com/verdadmentira/",
                    "http://blog.svd.se/faktakollen/",
                    "http://www.svt.se/nyheter/2923690",
                    "http://jomaameter.org/?locale=en#.VfNoMpfriio",
                    "http://www.dogrulukpayi.com/",
                    "http://fakecontrol.org/",
                    "http://www.stopfake.org/en/news/",
                    "http://vladometr.org/",
                    "http://www.theguardian.com/news/reality-check",
                    "http://blogs.channel4.com/factcheck/"
                  ],
                  "factchecker_website_to_qclaim_confidence_penalty_factor": 0.5
                },
                "name": "ESI DB Sentence Credibility Reviewer",
                "softwareVersion": "0.1.0",
                "url": "http://coinform.eu/bot/DBSentCredReviewer/0.1.0",
                "id": "wyhE2Lk6BWaqDURwOMB7K81oYhb3lxxr6yDUd35S1-0",
                "hierarchyLevel": 2,
                "group": 1,
                "opacity": 0.32800000000000009,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@type": "WebSite",
                "identifier": "http://www.expressen.se/",
                "name": "www.expressen.se",
                "url": "http://www.expressen.se/",
                "id": "http://www.expressen.se/",
                "hierarchyLevel": 3,
                "group": 2,
                "opacity": 0.32800000000000009,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "WebSiteCredReview",
                "dateCreated": "2020-04-12T09:25:31.491529Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.4,
                  "ratingCount": 1,
                  "ratingExplanation": "Based on 1 review(s) for site **www.expressen.se** by external rater(s) ([Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.6800000000000002,
                  "reviewAspect": "credibility",
                  "reviewCount": 1,
                  "identifier": "RHh0WoRofCJfgSfICVXjk-KzaADS1bcPO8i7Uw1lQB0"
                },
                "timings": {
                  "@context": "http://coinform.eu",
                  "@type": "Timing",
                  "phase": "misinfome_source_credibility",
                  "sub_timings": [],
                  "total_ms": 0
                },
                "identifier": "5y9BuCo5XvDoZqzvZjDkAXLf7pwHZcb0kgwgIDBJErM",
                "id": "5y9BuCo5XvDoZqzvZjDkAXLf7pwHZcb0kgwgIDBJErM",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.32800000000000009,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@type": "Article",
                "coinform_collection": "pilot-se",
                "datePublished": "2019-03-29T14:44:20.438Z",
                "inLanguage": "en",
                "publisher": "www.expressen.se",
                "url": "https://www.expressen.se/motor/biltester/test-alaskan-kopian-som-ar-dyrare-an-originalet/",
                "identifier": "gM5IMWesm7tR3iGvuAasbUIJLiiRe4_Qo2-rgp0Nuo4",
                "id": "gM5IMWesm7tR3iGvuAasbUIJLiiRe4_Qo2-rgp0Nuo4",
                "hierarchyLevel": null,
                "group": 2,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "DBSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.492864Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.4,
                  "ratingCount": 2,
                  "ratingExplanation": "Sentence published on website with credibility Based on 1 review(s) for site **www.expressen.se** by external rater(s) ([Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.6800000000000002,
                  "reviewAspect": "credibility",
                  "reviewCount": 2,
                  "identifier": "3yq7wBcuD0XWo_JuYbIYizENDlvQ_LQpMTL1HetbcjU"
                },
                "identifier": "XihC1ekW5tgbwd5DX9em0vQ96bxcrhHxtS_aofpUPVA",
                "id": "XihC1ekW5tgbwd5DX9em0vQ96bxcrhHxtS_aofpUPVA",
                "hierarchyLevel": 2,
                "group": 0,
                "opacity": 0.32800000000000009,
                "nodeSize": 12,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "QSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.493047Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@context": "http://coinform.eu",
                  "@type": "AggregateRating",
                  "additionalType": [
                    "Rating"
                  ],
                  "confidence": 0.28313060834177009,
                  "ratingCount": 6,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to:\n\n * Now that Renault-Nissan has also taken control of Mitsubishi, we can count on the next generation of L 200 also to be built on a new common picnic.\nthat seems credible. Sentence published on website with credibility Based on 1 review(s) for site **www.expressen.se** by external rater(s) ([Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.6800000000000002,
                  "reviewAspect": "credibility",
                  "reviewCount": 6,
                  "identifier": "zO384G33nR-PbLZT0AejPNvbKwdFCa7xG88X67kYcB8"
                },
                "identifier": "_k2nTbdKzN2rjxdR8HuWE_ohD6Xlvs7BQK_heIWTmao",
                "id": "_k2nTbdKzN2rjxdR8HuWE_ohD6Xlvs7BQK_heIWTmao",
                "hierarchyLevel": 1,
                "group": 0,
                "opacity": 0.26413035310398466,
                "nodeSize": 16,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "Sentence",
                "description": "A single sentence, possibly appearing in some larger document",
                "identifier": "zAj1PSUqATtbD3emCF8MpQ",
                "text": "Ford takes a great digital step with new Ford Mustang with several funny functions.",
                "id": "zAj1PSUqATtbD3emCF8MpQ",
                "hierarchyLevel": 2,
                "group": 2,
                "opacity": 0.32800000000000009,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentencePair",
                "description": "CreativeWork consisting of exactly two sentences",
                "identifier": "7aJrUn5f7FqmDi6z3x-q3A",
                "roleA": "querySentence",
                "roleB": "sentenceInDB",
                "text": "Ford Motor Company is moving their small car division out of the USA. Ford takes a great digital step with new Ford Mustang with several funny functions.",
                "id": "7aJrUn5f7FqmDi6z3x-q3A",
                "hierarchyLevel": 3,
                "group": 2,
                "opacity": 0.592,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentSimilarityReview",
                "dateCreated": "2020-04-12T09:25:31.064443Z",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": 0.7848291397972954,
                  "reviewAspect": "similarity",
                  "identifier": "rnls_Dn1sc8X9SVE6UJBV9lf4XXn3qQ5ypHBGkBQPfU"
                },
                "identifier": "nhoJxNYTb31M0sqju9y3aW99ZWuA-47p-br_WMZpzmg",
                "id": "nhoJxNYTb31M0sqju9y3aW99ZWuA-47p-br_WMZpzmg",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.592,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentStanceReview",
                "dateCreated": "2020-04-12T09:25:31.064443Z",
                "reviewAspect": "stance",
                "reviewRating": {
                  "@type": "Rating",
                  "confidence": 0.9981127977371216,
                  "ratingExplanation": "Sentence **dbSent** **unrelated** **qSent**.",
                  "ratingValue": "unrelated",
                  "reviewAspect": "stance",
                  "identifier": "qKW30DidBl90QQG4tBGZRll9vkNwtQ6OMw2PmE7GmGk"
                },
                "identifier": "rdmZqqMEAdQUbMIw7_h8PVMq7DJ7xTWUsLxTfrn4HiA",
                "id": "rdmZqqMEAdQUbMIw7_h8PVMq7DJ7xTWUsLxTfrn4HiA",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.9969833256052993,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentPolarSimilarityReview",
                "dateCreated": "2020-04-12T09:25:31.493144Z",
                "headline": "is similar(?) but unrelated to",
                "reviewAspect": "polarSimilarity",
                "reviewBody": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to **Ford takes a great digital step with new Ford Mustang with several funny functions.**",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.9981127977371216,
                  "ratingCount": 2,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to **Ford takes a great digital step with new Ford Mustang with several funny functions.**",
                  "ratingValue": 0.7063462258175659,
                  "reviewAspect": "polarSimilarity",
                  "reviewCount": 2,
                  "identifier": "W5pFwHtT4MuMP9OrdpDbv7a8vBRcXcUO2oDcZPYcCno"
                },
                "identifier": "UJHFCcttYQ9b3Hmz50tc6atXnwMpO0TgMQ0oUdJZPaQ",
                "id": "UJHFCcttYQ9b3Hmz50tc6atXnwMpO0TgMQ0oUdJZPaQ",
                "hierarchyLevel": 2,
                "group": 0,
                "opacity": 0.9969833256052993,
                "nodeSize": 12,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "WebSiteCredReview",
                "dateCreated": "2020-04-12T09:25:31.491536Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.4,
                  "ratingCount": 1,
                  "ratingExplanation": "Based on 1 review(s) for site **www.expressen.se** by external rater(s) ([Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.6800000000000002,
                  "reviewAspect": "credibility",
                  "reviewCount": 1,
                  "identifier": "RHh0WoRofCJfgSfICVXjk-KzaADS1bcPO8i7Uw1lQB0"
                },
                "timings": {
                  "@context": "http://coinform.eu",
                  "@type": "Timing",
                  "phase": "misinfome_source_credibility",
                  "sub_timings": [],
                  "total_ms": 0
                },
                "identifier": "2UBHOKWiiMZnw9IQIpkwyNrPkc8vXWDFB4qd84I7duc",
                "id": "2UBHOKWiiMZnw9IQIpkwyNrPkc8vXWDFB4qd84I7duc",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.32800000000000009,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@type": "Article",
                "coinform_collection": "pilot-se",
                "datePublished": "2019-03-29T14:29:21.285Z",
                "inLanguage": "en",
                "publisher": "www.expressen.se",
                "url": "https://www.expressen.se/motor/biltester/test-ikonen-ford-mustang-bade-sakrare-och-roligare/",
                "identifier": "PLVwtkckNHaNO-PIKpkbdz8b3iyroPnl25Ea-EScubQ",
                "id": "PLVwtkckNHaNO-PIKpkbdz8b3iyroPnl25Ea-EScubQ",
                "hierarchyLevel": null,
                "group": 2,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "DBSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.493245Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.4,
                  "ratingCount": 2,
                  "ratingExplanation": "Sentence published on website with credibility Based on 1 review(s) for site **www.expressen.se** by external rater(s) ([Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.6800000000000002,
                  "reviewAspect": "credibility",
                  "reviewCount": 2,
                  "identifier": "3yq7wBcuD0XWo_JuYbIYizENDlvQ_LQpMTL1HetbcjU"
                },
                "identifier": "dYNhvYtJHNI2L48lUM4KxTaLhsdLm2hKlFBK377WSWs",
                "id": "dYNhvYtJHNI2L48lUM4KxTaLhsdLm2hKlFBK377WSWs",
                "hierarchyLevel": 2,
                "group": 0,
                "opacity": 0.32800000000000009,
                "nodeSize": 12,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "QSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.493408Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@context": "http://coinform.eu",
                  "@type": "AggregateRating",
                  "additionalType": [
                    "Rating"
                  ],
                  "confidence": 0.2825384903270264,
                  "ratingCount": 6,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to:\n\n * Ford takes a great digital step with new Ford Mustang with several funny functions.\nthat seems credible. Sentence published on website with credibility Based on 1 review(s) for site **www.expressen.se** by external rater(s) ([Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.6800000000000002,
                  "reviewAspect": "credibility",
                  "reviewCount": 6,
                  "identifier": "9vFzqOLQVzUt9eS5FPv0BC0_XuqwjZX_1LeGeKXJSgw"
                },
                "identifier": "MutLupoHhWdUdUd6ryTRbUIyxIYrKfUo6t4FH9UV3Tc",
                "id": "MutLupoHhWdUdUd6ryTRbUIyxIYrKfUo6t4FH9UV3Tc",
                "hierarchyLevel": 1,
                "group": 0,
                "opacity": 0.26386239881302017,
                "nodeSize": 16,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "Sentence",
                "description": "A single sentence, possibly appearing in some larger document",
                "identifier": "M8VhxN-I53wiY_4Rx74JmQ",
                "text": "Around 600,000 employees, EUR 200 billion turnover, 119 factories: Volkswagen builds every eighth car (shipped) in the world.",
                "id": "M8VhxN-I53wiY_4Rx74JmQ",
                "hierarchyLevel": 2,
                "group": 2,
                "opacity": 0.800888888888889,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentencePair",
                "description": "CreativeWork consisting of exactly two sentences",
                "identifier": "NJ_dLOUjsKOw5_lXyYcFtw",
                "roleA": "querySentence",
                "roleB": "sentenceInDB",
                "text": "Around 600,000 employees, EUR 200 billion turnover, 119 factories: Volkswagen builds every eighth car (shipped) in the world. Ford Motor Company is moving their small car division out of the USA.",
                "id": "NJ_dLOUjsKOw5_lXyYcFtw",
                "hierarchyLevel": 3,
                "group": 2,
                "opacity": 0.592,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentSimilarityReview",
                "dateCreated": "2020-04-12T09:25:31.064443Z",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": 0.7842455716261342,
                  "reviewAspect": "similarity",
                  "identifier": "hSQjgfbQyPXmHppGUGv_A6VnA5Fpr10wDJehILCSnJk"
                },
                "identifier": "5tNP-KdlW29Hq_jaC7_jdvtotSHkzOyJNXcudIdrtb8",
                "id": "5tNP-KdlW29Hq_jaC7_jdvtotSHkzOyJNXcudIdrtb8",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.592,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentStanceReview",
                "dateCreated": "2020-04-12T09:25:31.064443Z",
                "reviewAspect": "stance",
                "reviewRating": {
                  "@type": "Rating",
                  "confidence": 0.6436169147491455,
                  "ratingExplanation": "Sentence **dbSent** **unrelated** **qSent**.",
                  "ratingValue": "unrelated",
                  "reviewAspect": "stance",
                  "identifier": "_En5XgVpfa_wgP-WHdleS_SKI5jz91ZJGWMzZ09xLns"
                },
                "identifier": "rjYpijCrY1GfAi97mRtpLYdUlvezHo7ljf31XOcLQPQ",
                "id": "rjYpijCrY1GfAi97mRtpLYdUlvezHo7ljf31XOcLQPQ",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.531394186360967,
                "nodeSize": 11,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "SentPolarSimilarityReview",
                "dateCreated": "2020-04-12T09:25:31.493503Z",
                "headline": "is similar(?) but unrelated to",
                "reviewAspect": "polarSimilarity",
                "reviewBody": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to **Around 600,000 employees, EUR 200 billion turnover, 119 factories: Volkswagen builds every eighth car (shipped) in the world.**",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.6436169147491455,
                  "ratingCount": 2,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to **Around 600,000 employees, EUR 200 billion turnover, 119 factories: Volkswagen builds every eighth car (shipped) in the world.**",
                  "ratingValue": 0.7058210144635208,
                  "reviewAspect": "polarSimilarity",
                  "reviewCount": 2,
                  "identifier": "SYiZlfEX4CtgiMitOSJoqq2QwZBXVTXZUGskc2rkVXU"
                },
                "identifier": "4qubSDgPGgfoHbbkrV9oJGIdxOPVlzpp9oYLuE2K3KM",
                "id": "4qubSDgPGgfoHbbkrV9oJGIdxOPVlzpp9oYLuE2K3KM",
                "hierarchyLevel": 2,
                "group": 0,
                "opacity": 0.531394186360967,
                "nodeSize": 12,
                "nodeScale": 1.0
              },
              {
                "@type": "WebSite",
                "identifier": "http://www.zdf.de/",
                "name": "www.zdf.de",
                "url": "http://www.zdf.de/",
                "id": "http://www.zdf.de/",
                "hierarchyLevel": 3,
                "group": 2,
                "opacity": 0.800888888888889,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "WebSiteCredReview",
                "dateCreated": "2020-04-12T09:25:31.491542Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.8666666666666667,
                  "ratingCount": 2,
                  "ratingExplanation": "Based on 2 review(s) for site **www.zdf.de** by external rater(s) ([NewsGuard](https://www.newsguardtech.com/) or [Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.9723076923076923,
                  "reviewAspect": "credibility",
                  "reviewCount": 2,
                  "identifier": "oztwIz7wryPY7BEgqDIMRi07nk-SkQAeu90nbMDX4XA"
                },
                "timings": {
                  "@context": "http://coinform.eu",
                  "@type": "Timing",
                  "phase": "misinfome_source_credibility",
                  "sub_timings": [],
                  "total_ms": 0
                },
                "identifier": "TB8BUM2StLvFqRQcGv-A1E27-vR_pOiine7jxdVTV1g",
                "id": "TB8BUM2StLvFqRQcGv-A1E27-vR_pOiine7jxdVTV1g",
                "hierarchyLevel": 3,
                "group": 0,
                "opacity": 0.800888888888889,
                "nodeSize": 12,
                "nodeScale": 1.0
              },
              {
                "@type": "Article",
                "coinform_collection": "pilot-at",
                "datePublished": "2019-03-18T16:10:32.954Z",
                "inLanguage": "en",
                "publisher": "www.zdf.de",
                "url": "https://www.zdf.de/dokumentation/zdfzeit/zdfzeit-deutschlands-grosse-clans-die-volkswagen-story-100.html",
                "identifier": "QLn5XjbTo5hRt5EBEvoUVugJqPbT0YUc2aLrFkEfqq4",
                "id": "QLn5XjbTo5hRt5EBEvoUVugJqPbT0YUc2aLrFkEfqq4",
                "hierarchyLevel": null,
                "group": 2,
                "opacity": 0.2,
                "nodeSize": 10,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "DBSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.493613Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.8666666666666667,
                  "ratingCount": 3,
                  "ratingExplanation": "Sentence published on website with credibility Based on 2 review(s) for site **www.zdf.de** by external rater(s) ([NewsGuard](https://www.newsguardtech.com/) or [Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.9723076923076923,
                  "reviewAspect": "credibility",
                  "reviewCount": 3,
                  "identifier": "f-nFWamTWblnRowVFcuOeInHDQ4xxgI97iqW9Ql_lo8"
                },
                "identifier": "JtpL9wi6y_4YHS3jiZBdI1ILQ52soj9BIFoUlpzYkbU",
                "id": "JtpL9wi6y_4YHS3jiZBdI1ILQ52soj9BIFoUlpzYkbU",
                "hierarchyLevel": 2,
                "group": 0,
                "opacity": 0.800888888888889,
                "nodeSize": 13,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "QSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.493789Z",
                "reviewAspect": "credibility",
                "reviewRating": {
                  "@context": "http://coinform.eu",
                  "@type": "AggregateRating",
                  "additionalType": [
                    "Rating"
                  ],
                  "confidence": 0.6117115458683847,
                  "ratingCount": 7,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** is similar(?) but unrelated to:\n\n * Around 600,000 employees, EUR 200 billion turnover, 119 factories: Volkswagen builds every eighth car (shipped) in the world.\nthat seems credible. Sentence published on website with credibility Based on 2 review(s) for site **www.zdf.de** by external rater(s) ([NewsGuard](https://www.newsguardtech.com/) or [Web Of Trust](https://mywot.com/))",
                  "ratingValue": 0.9723076923076923,
                  "reviewAspect": "credibility",
                  "reviewCount": 7,
                  "identifier": "NCkT3Q8AUt1k9jPwq5tbuic6HmUpYecjtSs9br6iIpw"
                },
                "identifier": "BXKdk-KvKGPPVasCj-1HDbIzV_8JWv1YqBA2fv_3Pxs",
                "id": "BXKdk-KvKGPPVasCj-1HDbIzV_8JWv1YqBA2fv_3Pxs",
                "hierarchyLevel": 1,
                "group": 0,
                "opacity": 0.4993528122789512,
                "nodeSize": 17,
                "nodeScale": 1.0
              },
              {
                "@context": "http://coinform.eu",
                "@type": "AggQSentCredReview",
                "dateCreated": "2020-04-12T09:25:31.493854Z",
                "reviewRating": {
                  "@type": "AggregateRating",
                  "confidence": 0.7378329457835579,
                  "ratingCount": 44,
                  "ratingExplanation": "Sentence **Ford Motor Company is moving their small car division out of the USA.** agrees with:\n\n * 'Ford is moving all of their small-car production to Mexico.'\nthat seems mostly not credible. Based on normalised numeric ratingValue 2 in range [1-5]",
                  "ratingValue": -0.5,
                  "reviewAspect": "credibility",
                  "reviewCount": 42,
                  "identifier": "oqyjiIet4pS2OOvNZDVRZkh_uAFw82tnV8Qa9NnQW2w"
                },
                "identifier": "ydt-G23ENk8gzbONp2R2uIEJmdrCEteHpORwItrk_do",
                "id": "ydt-G23ENk8gzbONp2R2uIEJmdrCEteHpORwItrk_do",
                "hierarchyLevel": 0,
                "group": 0,
                "opacity": 0.6355179647069141,
                "nodeSize": 30,
                "nodeScale": 2.5
              }
            ],
            "links": [
              {
                "source": "8a2nk0f0VsNWBOjt9qT4FsV9CG9enr8OeqPVBfHZVpc",
                "target": "M6WygrMI2zbAEEnFDmQAP6quTvcXiGs_4c_K1gY3Fi0",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "hiUan4CH-9eEofirqdsMWu7TCq__yIs6q_6x0NhqYME",
                "target": "M6WygrMI2zbAEEnFDmQAP6quTvcXiGs_4c_K1gY3Fi0",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "58ae94d80fc358877932021c33b1dd50c1e2fd1985a093f5c185ddbe19788a07",
                "target": "http://expertsystem.com",
                "rel": "creator",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "cbQNmZMDfFeZXgRfSnvBbA8wbrAgOkWUq-JxFAzlMAA",
                "target": "M6WygrMI2zbAEEnFDmQAP6quTvcXiGs_4c_K1gY3Fi0",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "cbQNmZMDfFeZXgRfSnvBbA8wbrAgOkWUq-JxFAzlMAA",
                "target": "hiUan4CH-9eEofirqdsMWu7TCq__yIs6q_6x0NhqYME",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.2
              },
              {
                "source": "PvjNRJgjTesnSeM8CS62lA",
                "target": "0MYSsyyVCMUh0P9TUbi93nAxJ30PHJSTLFxWrwC17Pg",
                "rel": "appearance",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "eEZmRoVTIQzydE6ccClwQg",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "sentA",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "eEZmRoVTIQzydE6ccClwQg",
                "target": "PvjNRJgjTesnSeM8CS62lA",
                "rel": "sentB",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "UZF8b9m8366mDXwMxh5tk0Zi9OuSBzpplRdY6nwmYVk",
                "target": "cbQNmZMDfFeZXgRfSnvBbA8wbrAgOkWUq-JxFAzlMAA",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "UZF8b9m8366mDXwMxh5tk0Zi9OuSBzpplRdY6nwmYVk",
                "target": "eEZmRoVTIQzydE6ccClwQg",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.592
              },
              {
                "source": "Q-HBTj4_Ey5Aat7SXIOQ_mTTRl8TAJcOON1tBORnRfs",
                "target": "P8hw6Wm7Wg92Jhdvz-FoCsspd9qPW1WFEPHXbh8Sz8A",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "734lFR_sG5wT3vRSOyYUfI69Rm0CDqy_uxiczEYqZLI",
                "target": "Q-HBTj4_Ey5Aat7SXIOQ_mTTRl8TAJcOON1tBORnRfs",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "734lFR_sG5wT3vRSOyYUfI69Rm0CDqy_uxiczEYqZLI",
                "target": "eEZmRoVTIQzydE6ccClwQg",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.8053657758507171
              },
              {
                "source": "Ko4CfCFEVyBQT-QfsduKmhYoLKeVXaitmYsH98qGlOA",
                "target": "KbF8SznYVInInLxwDsoyutkAEUsV5kLnOLI7bajBF30",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "Ko4CfCFEVyBQT-QfsduKmhYoLKeVXaitmYsH98qGlOA",
                "target": "UZF8b9m8366mDXwMxh5tk0Zi9OuSBzpplRdY6nwmYVk",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.592
              },
              {
                "source": "Ko4CfCFEVyBQT-QfsduKmhYoLKeVXaitmYsH98qGlOA",
                "target": "734lFR_sG5wT3vRSOyYUfI69Rm0CDqy_uxiczEYqZLI",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.8053657758507171
              },
              {
                "source": "Ko4CfCFEVyBQT-QfsduKmhYoLKeVXaitmYsH98qGlOA",
                "target": "eEZmRoVTIQzydE6ccClwQg",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.8053657758507171
              },
              {
                "source": "IpZh6qysghtjbxqYuU7kCRd0C2J9s3tgDs6dfqfYwSQ",
                "target": "CYNKwrLb7HPkigyTeCsGNtFECsfV4G4vP9APRcXkQRo",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.2
              },
              {
                "source": "IpZh6qysghtjbxqYuU7kCRd0C2J9s3tgDs6dfqfYwSQ",
                "target": "uPo0cltI6ThRQZL4DS_X4ypCUisZII9cP0nNPGbRV9Y",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.778
              },
              {
                "source": "nrum8cGnr4tChS34-6cWNj_B44kiGWFbFhoOP3qPN8E",
                "target": "CYNKwrLb7HPkigyTeCsGNtFECsfV4G4vP9APRcXkQRo",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "nrum8cGnr4tChS34-6cWNj_B44kiGWFbFhoOP3qPN8E",
                "target": "http://www.politifact.com/",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.2
              },
              {
                "source": "qh1JwUdGchTrL6sq_stksY9uLOvxIOk2fIlzJO_V0lc",
                "target": "uPo0cltI6ThRQZL4DS_X4ypCUisZII9cP0nNPGbRV9Y",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "qh1JwUdGchTrL6sq_stksY9uLOvxIOk2fIlzJO_V0lc",
                "target": "wk1YkQRunDfNz5cx1JDu7svEQM1LqMTr5wcyWoAASlc",
                "rel": "basedOn",
                "value": 2.0,
                "opacity": 0.778
              },
              {
                "source": "qh1JwUdGchTrL6sq_stksY9uLOvxIOk2fIlzJO_V0lc",
                "target": "6PmtjjTF3dDdjnaaon6TIibqykI5vsRpgCCKXqztqpg",
                "rel": "basedOn",
                "value": 2.0,
                "opacity": 0.778
              },
              {
                "source": "LnLWN0FnVGY576BeAV7XehwasWNKv3hShWgVofFPzF0",
                "target": "IpZh6qysghtjbxqYuU7kCRd0C2J9s3tgDs6dfqfYwSQ",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "LnLWN0FnVGY576BeAV7XehwasWNKv3hShWgVofFPzF0",
                "target": "nrum8cGnr4tChS34-6cWNj_B44kiGWFbFhoOP3qPN8E",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.2
              },
              {
                "source": "LnLWN0FnVGY576BeAV7XehwasWNKv3hShWgVofFPzF0",
                "target": "qh1JwUdGchTrL6sq_stksY9uLOvxIOk2fIlzJO_V0lc",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.778
              },
              {
                "source": "LnLWN0FnVGY576BeAV7XehwasWNKv3hShWgVofFPzF0",
                "target": "PvjNRJgjTesnSeM8CS62lA",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.778
              },
              {
                "source": "4qb-POCrNCxKpO-JzULDoljCt5AVZChYy6MEDmRS4ow",
                "target": "Uq0Fj57weeOOevIFX1grhnn83suv1Qhj9catKSyehYc",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "4qb-POCrNCxKpO-JzULDoljCt5AVZChYy6MEDmRS4ow",
                "target": "Ko4CfCFEVyBQT-QfsduKmhYoLKeVXaitmYsH98qGlOA",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.8053657758507171
              },
              {
                "source": "4qb-POCrNCxKpO-JzULDoljCt5AVZChYy6MEDmRS4ow",
                "target": "LnLWN0FnVGY576BeAV7XehwasWNKv3hShWgVofFPzF0",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.778
              },
              {
                "source": "4qb-POCrNCxKpO-JzULDoljCt5AVZChYy6MEDmRS4ow",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.6355179647069141
              },
              {
                "source": "zrcjFPSE7iSPcS0mey9dwg",
                "target": "5THcARhyXo0UGBvmown4R3wLD8K41pg61aQnk1hiGdA",
                "rel": "appearance",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "78X2CAhb5Od-V0O1I39rjA",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "sentA",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "78X2CAhb5Od-V0O1I39rjA",
                "target": "zrcjFPSE7iSPcS0mey9dwg",
                "rel": "sentB",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "NN9B0J3reQxaNTDloOcq9JixxBAgcKfbMByv9P_sGoY",
                "target": "cbQNmZMDfFeZXgRfSnvBbA8wbrAgOkWUq-JxFAzlMAA",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "NN9B0J3reQxaNTDloOcq9JixxBAgcKfbMByv9P_sGoY",
                "target": "78X2CAhb5Od-V0O1I39rjA",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.592
              },
              {
                "source": "czP7xVEiGO-jVCJaUcr5VActQM0LJT_EQF7pdQDj18M",
                "target": "Q-HBTj4_Ey5Aat7SXIOQ_mTTRl8TAJcOON1tBORnRfs",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "czP7xVEiGO-jVCJaUcr5VActQM0LJT_EQF7pdQDj18M",
                "target": "78X2CAhb5Od-V0O1I39rjA",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.7816738405704002
              },
              {
                "source": "zkBwTfO2bSuJ225CwEufA9X_tisn8ttUz58WAun3w2A",
                "target": "KbF8SznYVInInLxwDsoyutkAEUsV5kLnOLI7bajBF30",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "zkBwTfO2bSuJ225CwEufA9X_tisn8ttUz58WAun3w2A",
                "target": "NN9B0J3reQxaNTDloOcq9JixxBAgcKfbMByv9P_sGoY",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.592
              },
              {
                "source": "zkBwTfO2bSuJ225CwEufA9X_tisn8ttUz58WAun3w2A",
                "target": "czP7xVEiGO-jVCJaUcr5VActQM0LJT_EQF7pdQDj18M",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.7816738405704002
              },
              {
                "source": "zkBwTfO2bSuJ225CwEufA9X_tisn8ttUz58WAun3w2A",
                "target": "78X2CAhb5Od-V0O1I39rjA",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.7816738405704002
              },
              {
                "source": "BqegyJUJl8XtGxi594VUqxtArYQE7Yf-JDMtzm_ht0w",
                "target": "CYNKwrLb7HPkigyTeCsGNtFECsfV4G4vP9APRcXkQRo",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "BqegyJUJl8XtGxi594VUqxtArYQE7Yf-JDMtzm_ht0w",
                "target": "http://www.politifact.com/",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.2
              },
              {
                "source": "10Ocauj5hEvrAatGE9sCLSGDDj5pHtU51ivOJhvRxpg",
                "target": "uPo0cltI6ThRQZL4DS_X4ypCUisZII9cP0nNPGbRV9Y",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "10Ocauj5hEvrAatGE9sCLSGDDj5pHtU51ivOJhvRxpg",
                "target": "v06yhtFzzdqHmkJU0f7Oyb9eUlYonK1bewS0BUvgtPA",
                "rel": "basedOn",
                "value": 2.0,
                "opacity": 1.0
              },
              {
                "source": "10Ocauj5hEvrAatGE9sCLSGDDj5pHtU51ivOJhvRxpg",
                "target": "c-ZIMfvNF5Oc6wrb_8Q5tYZfNmZS6gB9jplea7eNmVQ",
                "rel": "basedOn",
                "value": 2.0,
                "opacity": 1.0
              },
              {
                "source": "m5OtElnrk6jNwL0DTHA1V3wBuL6ghtEIaR_lDOT4kqk",
                "target": "IpZh6qysghtjbxqYuU7kCRd0C2J9s3tgDs6dfqfYwSQ",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "m5OtElnrk6jNwL0DTHA1V3wBuL6ghtEIaR_lDOT4kqk",
                "target": "BqegyJUJl8XtGxi594VUqxtArYQE7Yf-JDMtzm_ht0w",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.2
              },
              {
                "source": "m5OtElnrk6jNwL0DTHA1V3wBuL6ghtEIaR_lDOT4kqk",
                "target": "10Ocauj5hEvrAatGE9sCLSGDDj5pHtU51ivOJhvRxpg",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 1.0
              },
              {
                "source": "m5OtElnrk6jNwL0DTHA1V3wBuL6ghtEIaR_lDOT4kqk",
                "target": "zrcjFPSE7iSPcS0mey9dwg",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 1.0
              },
              {
                "source": "Nr9qZEKkFg2XvjTH92jdqkHX2BKqAalypC9sB6Tt_es",
                "target": "Uq0Fj57weeOOevIFX1grhnn83suv1Qhj9catKSyehYc",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "Nr9qZEKkFg2XvjTH92jdqkHX2BKqAalypC9sB6Tt_es",
                "target": "zkBwTfO2bSuJ225CwEufA9X_tisn8ttUz58WAun3w2A",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.7816738405704002
              },
              {
                "source": "Nr9qZEKkFg2XvjTH92jdqkHX2BKqAalypC9sB6Tt_es",
                "target": "m5OtElnrk6jNwL0DTHA1V3wBuL6ghtEIaR_lDOT4kqk",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 1.0
              },
              {
                "source": "Nr9qZEKkFg2XvjTH92jdqkHX2BKqAalypC9sB6Tt_es",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.6047241766166969
              },
              {
                "source": "BaUOLPRLn0GTbChdn85ejA",
                "target": "gM5IMWesm7tR3iGvuAasbUIJLiiRe4_Qo2-rgp0Nuo4",
                "rel": "appearance",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "NvLqzcL4PZo1auwI7EzlLQ",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "sentA",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "NvLqzcL4PZo1auwI7EzlLQ",
                "target": "BaUOLPRLn0GTbChdn85ejA",
                "rel": "sentB",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "-5bzkAxhgc0oEq0t4KbQM_nyR625g0rXtCfqvIvqcKA",
                "target": "cbQNmZMDfFeZXgRfSnvBbA8wbrAgOkWUq-JxFAzlMAA",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "-5bzkAxhgc0oEq0t4KbQM_nyR625g0rXtCfqvIvqcKA",
                "target": "NvLqzcL4PZo1auwI7EzlLQ",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.592
              },
              {
                "source": "MwDFdo6q83issqPd5LyReWBXDBynZz5BcTuq9nf6WFg",
                "target": "Q-HBTj4_Ey5Aat7SXIOQ_mTTRl8TAJcOON1tBORnRfs",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "MwDFdo6q83issqPd5LyReWBXDBynZz5BcTuq9nf6WFg",
                "target": "NvLqzcL4PZo1auwI7EzlLQ",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.9980405422803445
              },
              {
                "source": "zCmHKQWE6xTuQ-VK8MKNGC-8cSL1Bmvv-lhu-uratkI",
                "target": "KbF8SznYVInInLxwDsoyutkAEUsV5kLnOLI7bajBF30",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "zCmHKQWE6xTuQ-VK8MKNGC-8cSL1Bmvv-lhu-uratkI",
                "target": "-5bzkAxhgc0oEq0t4KbQM_nyR625g0rXtCfqvIvqcKA",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.592
              },
              {
                "source": "zCmHKQWE6xTuQ-VK8MKNGC-8cSL1Bmvv-lhu-uratkI",
                "target": "MwDFdo6q83issqPd5LyReWBXDBynZz5BcTuq9nf6WFg",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.9980405422803445
              },
              {
                "source": "zCmHKQWE6xTuQ-VK8MKNGC-8cSL1Bmvv-lhu-uratkI",
                "target": "NvLqzcL4PZo1auwI7EzlLQ",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.9980405422803445
              },
              {
                "source": "wyhE2Lk6BWaqDURwOMB7K81oYhb3lxxr6yDUd35S1-0",
                "target": "CYNKwrLb7HPkigyTeCsGNtFECsfV4G4vP9APRcXkQRo",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.2
              },
              {
                "source": "5y9BuCo5XvDoZqzvZjDkAXLf7pwHZcb0kgwgIDBJErM",
                "target": "CYNKwrLb7HPkigyTeCsGNtFECsfV4G4vP9APRcXkQRo",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "5y9BuCo5XvDoZqzvZjDkAXLf7pwHZcb0kgwgIDBJErM",
                "target": "http://www.expressen.se/",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.32800000000000009
              },
              {
                "source": "XihC1ekW5tgbwd5DX9em0vQ96bxcrhHxtS_aofpUPVA",
                "target": "wyhE2Lk6BWaqDURwOMB7K81oYhb3lxxr6yDUd35S1-0",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "XihC1ekW5tgbwd5DX9em0vQ96bxcrhHxtS_aofpUPVA",
                "target": "5y9BuCo5XvDoZqzvZjDkAXLf7pwHZcb0kgwgIDBJErM",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.32800000000000009
              },
              {
                "source": "XihC1ekW5tgbwd5DX9em0vQ96bxcrhHxtS_aofpUPVA",
                "target": "BaUOLPRLn0GTbChdn85ejA",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.32800000000000009
              },
              {
                "source": "_k2nTbdKzN2rjxdR8HuWE_ohD6Xlvs7BQK_heIWTmao",
                "target": "Uq0Fj57weeOOevIFX1grhnn83suv1Qhj9catKSyehYc",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "_k2nTbdKzN2rjxdR8HuWE_ohD6Xlvs7BQK_heIWTmao",
                "target": "zCmHKQWE6xTuQ-VK8MKNGC-8cSL1Bmvv-lhu-uratkI",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.9980405422803445
              },
              {
                "source": "_k2nTbdKzN2rjxdR8HuWE_ohD6Xlvs7BQK_heIWTmao",
                "target": "XihC1ekW5tgbwd5DX9em0vQ96bxcrhHxtS_aofpUPVA",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.32800000000000009
              },
              {
                "source": "_k2nTbdKzN2rjxdR8HuWE_ohD6Xlvs7BQK_heIWTmao",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.26413035310398466
              },
              {
                "source": "zAj1PSUqATtbD3emCF8MpQ",
                "target": "PLVwtkckNHaNO-PIKpkbdz8b3iyroPnl25Ea-EScubQ",
                "rel": "appearance",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "7aJrUn5f7FqmDi6z3x-q3A",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "sentA",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "7aJrUn5f7FqmDi6z3x-q3A",
                "target": "zAj1PSUqATtbD3emCF8MpQ",
                "rel": "sentB",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "nhoJxNYTb31M0sqju9y3aW99ZWuA-47p-br_WMZpzmg",
                "target": "cbQNmZMDfFeZXgRfSnvBbA8wbrAgOkWUq-JxFAzlMAA",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "nhoJxNYTb31M0sqju9y3aW99ZWuA-47p-br_WMZpzmg",
                "target": "7aJrUn5f7FqmDi6z3x-q3A",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.592
              },
              {
                "source": "rdmZqqMEAdQUbMIw7_h8PVMq7DJ7xTWUsLxTfrn4HiA",
                "target": "Q-HBTj4_Ey5Aat7SXIOQ_mTTRl8TAJcOON1tBORnRfs",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "rdmZqqMEAdQUbMIw7_h8PVMq7DJ7xTWUsLxTfrn4HiA",
                "target": "7aJrUn5f7FqmDi6z3x-q3A",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.9969833256052993
              },
              {
                "source": "UJHFCcttYQ9b3Hmz50tc6atXnwMpO0TgMQ0oUdJZPaQ",
                "target": "KbF8SznYVInInLxwDsoyutkAEUsV5kLnOLI7bajBF30",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "UJHFCcttYQ9b3Hmz50tc6atXnwMpO0TgMQ0oUdJZPaQ",
                "target": "nhoJxNYTb31M0sqju9y3aW99ZWuA-47p-br_WMZpzmg",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.592
              },
              {
                "source": "UJHFCcttYQ9b3Hmz50tc6atXnwMpO0TgMQ0oUdJZPaQ",
                "target": "rdmZqqMEAdQUbMIw7_h8PVMq7DJ7xTWUsLxTfrn4HiA",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.9969833256052993
              },
              {
                "source": "UJHFCcttYQ9b3Hmz50tc6atXnwMpO0TgMQ0oUdJZPaQ",
                "target": "7aJrUn5f7FqmDi6z3x-q3A",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.9969833256052993
              },
              {
                "source": "2UBHOKWiiMZnw9IQIpkwyNrPkc8vXWDFB4qd84I7duc",
                "target": "CYNKwrLb7HPkigyTeCsGNtFECsfV4G4vP9APRcXkQRo",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "2UBHOKWiiMZnw9IQIpkwyNrPkc8vXWDFB4qd84I7duc",
                "target": "http://www.expressen.se/",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.32800000000000009
              },
              {
                "source": "dYNhvYtJHNI2L48lUM4KxTaLhsdLm2hKlFBK377WSWs",
                "target": "wyhE2Lk6BWaqDURwOMB7K81oYhb3lxxr6yDUd35S1-0",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "dYNhvYtJHNI2L48lUM4KxTaLhsdLm2hKlFBK377WSWs",
                "target": "2UBHOKWiiMZnw9IQIpkwyNrPkc8vXWDFB4qd84I7duc",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.32800000000000009
              },
              {
                "source": "dYNhvYtJHNI2L48lUM4KxTaLhsdLm2hKlFBK377WSWs",
                "target": "zAj1PSUqATtbD3emCF8MpQ",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.32800000000000009
              },
              {
                "source": "MutLupoHhWdUdUd6ryTRbUIyxIYrKfUo6t4FH9UV3Tc",
                "target": "Uq0Fj57weeOOevIFX1grhnn83suv1Qhj9catKSyehYc",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "MutLupoHhWdUdUd6ryTRbUIyxIYrKfUo6t4FH9UV3Tc",
                "target": "UJHFCcttYQ9b3Hmz50tc6atXnwMpO0TgMQ0oUdJZPaQ",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.9969833256052993
              },
              {
                "source": "MutLupoHhWdUdUd6ryTRbUIyxIYrKfUo6t4FH9UV3Tc",
                "target": "dYNhvYtJHNI2L48lUM4KxTaLhsdLm2hKlFBK377WSWs",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.32800000000000009
              },
              {
                "source": "MutLupoHhWdUdUd6ryTRbUIyxIYrKfUo6t4FH9UV3Tc",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.26386239881302017
              },
              {
                "source": "M8VhxN-I53wiY_4Rx74JmQ",
                "target": "QLn5XjbTo5hRt5EBEvoUVugJqPbT0YUc2aLrFkEfqq4",
                "rel": "appearance",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "NJ_dLOUjsKOw5_lXyYcFtw",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "sentA",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "NJ_dLOUjsKOw5_lXyYcFtw",
                "target": "M8VhxN-I53wiY_4Rx74JmQ",
                "rel": "sentB",
                "value": 2.0,
                "opacity": 0.8
              },
              {
                "source": "5tNP-KdlW29Hq_jaC7_jdvtotSHkzOyJNXcudIdrtb8",
                "target": "cbQNmZMDfFeZXgRfSnvBbA8wbrAgOkWUq-JxFAzlMAA",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "5tNP-KdlW29Hq_jaC7_jdvtotSHkzOyJNXcudIdrtb8",
                "target": "NJ_dLOUjsKOw5_lXyYcFtw",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.592
              },
              {
                "source": "rjYpijCrY1GfAi97mRtpLYdUlvezHo7ljf31XOcLQPQ",
                "target": "Q-HBTj4_Ey5Aat7SXIOQ_mTTRl8TAJcOON1tBORnRfs",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "rjYpijCrY1GfAi97mRtpLYdUlvezHo7ljf31XOcLQPQ",
                "target": "NJ_dLOUjsKOw5_lXyYcFtw",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.531394186360967
              },
              {
                "source": "4qubSDgPGgfoHbbkrV9oJGIdxOPVlzpp9oYLuE2K3KM",
                "target": "KbF8SznYVInInLxwDsoyutkAEUsV5kLnOLI7bajBF30",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "4qubSDgPGgfoHbbkrV9oJGIdxOPVlzpp9oYLuE2K3KM",
                "target": "5tNP-KdlW29Hq_jaC7_jdvtotSHkzOyJNXcudIdrtb8",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.592
              },
              {
                "source": "4qubSDgPGgfoHbbkrV9oJGIdxOPVlzpp9oYLuE2K3KM",
                "target": "rjYpijCrY1GfAi97mRtpLYdUlvezHo7ljf31XOcLQPQ",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.531394186360967
              },
              {
                "source": "4qubSDgPGgfoHbbkrV9oJGIdxOPVlzpp9oYLuE2K3KM",
                "target": "NJ_dLOUjsKOw5_lXyYcFtw",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.531394186360967
              },
              {
                "source": "TB8BUM2StLvFqRQcGv-A1E27-vR_pOiine7jxdVTV1g",
                "target": "CYNKwrLb7HPkigyTeCsGNtFECsfV4G4vP9APRcXkQRo",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "TB8BUM2StLvFqRQcGv-A1E27-vR_pOiine7jxdVTV1g",
                "target": "http://www.zdf.de/",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.800888888888889
              },
              {
                "source": "JtpL9wi6y_4YHS3jiZBdI1ILQ52soj9BIFoUlpzYkbU",
                "target": "wyhE2Lk6BWaqDURwOMB7K81oYhb3lxxr6yDUd35S1-0",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "JtpL9wi6y_4YHS3jiZBdI1ILQ52soj9BIFoUlpzYkbU",
                "target": "TB8BUM2StLvFqRQcGv-A1E27-vR_pOiine7jxdVTV1g",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.800888888888889
              },
              {
                "source": "JtpL9wi6y_4YHS3jiZBdI1ILQ52soj9BIFoUlpzYkbU",
                "target": "M8VhxN-I53wiY_4Rx74JmQ",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.800888888888889
              },
              {
                "source": "BXKdk-KvKGPPVasCj-1HDbIzV_8JWv1YqBA2fv_3Pxs",
                "target": "Uq0Fj57weeOOevIFX1grhnn83suv1Qhj9catKSyehYc",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "BXKdk-KvKGPPVasCj-1HDbIzV_8JWv1YqBA2fv_3Pxs",
                "target": "4qubSDgPGgfoHbbkrV9oJGIdxOPVlzpp9oYLuE2K3KM",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.531394186360967
              },
              {
                "source": "BXKdk-KvKGPPVasCj-1HDbIzV_8JWv1YqBA2fv_3Pxs",
                "target": "JtpL9wi6y_4YHS3jiZBdI1ILQ52soj9BIFoUlpzYkbU",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.800888888888889
              },
              {
                "source": "BXKdk-KvKGPPVasCj-1HDbIzV_8JWv1YqBA2fv_3Pxs",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.4993528122789512
              },
              {
                "source": "ydt-G23ENk8gzbONp2R2uIEJmdrCEteHpORwItrk_do",
                "target": "8a2nk0f0VsNWBOjt9qT4FsV9CG9enr8OeqPVBfHZVpc",
                "rel": "author",
                "value": 2.0,
                "opacity": 0.4
              },
              {
                "source": "ydt-G23ENk8gzbONp2R2uIEJmdrCEteHpORwItrk_do",
                "target": "4qb-POCrNCxKpO-JzULDoljCt5AVZChYy6MEDmRS4ow",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.6355179647069141
              },
              {
                "source": "ydt-G23ENk8gzbONp2R2uIEJmdrCEteHpORwItrk_do",
                "target": "Nr9qZEKkFg2XvjTH92jdqkHX2BKqAalypC9sB6Tt_es",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.6047241766166969
              },
              {
                "source": "ydt-G23ENk8gzbONp2R2uIEJmdrCEteHpORwItrk_do",
                "target": "_k2nTbdKzN2rjxdR8HuWE_ohD6Xlvs7BQK_heIWTmao",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.26413035310398466
              },
              {
                "source": "ydt-G23ENk8gzbONp2R2uIEJmdrCEteHpORwItrk_do",
                "target": "MutLupoHhWdUdUd6ryTRbUIyxIYrKfUo6t4FH9UV3Tc",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.26386239881302017
              },
              {
                "source": "ydt-G23ENk8gzbONp2R2uIEJmdrCEteHpORwItrk_do",
                "target": "BXKdk-KvKGPPVasCj-1HDbIzV_8JWv1YqBA2fv_3Pxs",
                "rel": "isBasedOn",
                "value": 2.0,
                "opacity": 0.4993528122789512
              },
              {
                "source": "ydt-G23ENk8gzbONp2R2uIEJmdrCEteHpORwItrk_do",
                "target": "--1RRg8ttsArjJ_WfShZrg",
                "rel": "itemReviewed",
                "value": 2.0,
                "opacity": 0.6355179647069141
              }
            ],
            "mainNode": "ydt-G23ENk8gzbONp2R2uIEJmdrCEteHpORwItrk_do",
            "main_itemReviewed": "Sentence: Ford Motor Company is moving their small car divis..."
          }
          console.log('this is the new data: ', $scope.data)
          $scope.adjlist = [];
          $scope.selList = {};
          $scope.selListCopy = {};
          $scope.hoverList = {};
          $scope.taList = [];
          $scope.$on('typeahead-updated', function() {
            $scope.searchForNode();
          });

          $scope.data.nodes.forEach(function (d) {
            if ((d.group === 1 && $scope.panel.mute_category_1) || (d.group === 2 && $scope.panel.mute_category_2)) {
              $scope.selList["n" + d.node] = false;
            } else {
              $scope.selList["n" + d.node] = true;
            }

            $scope.taList.push(d.name);
          });

          $scope.selListCopy = _.extend({}, $scope.selList);

          $scope.data.links.forEach(function (d) {
            $scope.adjlist[d.source + "-" + d.target] = true;
            $scope.adjlist[d.target + "-" + d.source] = true;
          });

          $scope.render();
        }, function (error) {
          console.log(error);
        });


      };

      $scope.dash = dashboard;
      $scope.set_refresh = function (state) {
        $scope.refresh = state;
      };

      $scope.close_edit = function () {
        if ($scope.refresh) {
          $scope.get_data();
        }
        $scope.refresh = false;
        $scope.$emit('render');
      };

      $scope.render = function () {
        $scope.$emit('render');
      };

      $scope.populate_modal = function (request) {
        $scope.inspector = angular.toJson(JSON.parse(request.toString()), true);
      };

      $scope.pad = function (n) {
        return (n < 10 ? '0' : '') + n;
      };

      $scope.set_filters = function (d) {
        if (DEBUG) {
          console.log("Setting Filters to " + d);
        }
        for (var i = 0; i < d.length; i++) {
          filterSrv.set({
            type: 'terms',
            field: $scope.panel.facet_pivot_strings[i].replace(/ /g, ''),
            mandate: 'must',
            value: d[i]
          });
          console.log($scope.panel.facet_pivot_strings[i].replace(/ /g, '') + ' - ' + d[i]);

        }

        dashboard.refresh();
      };

    });

    module.directive('reviewGraphChart', function ($rootScope) {
      return {
        restrict: 'A',
        link: function (scope, element) {
          // Receive render events
          scope.$on('render', function () {
            render_panel();
          });

          // Re-render if the window is resized
          angular.element(window).bind('resize', function () {
            render_panel();
          });

          // Function for rendering panel
          function render_panel() {
            element.html("");

            const links = scope.data.links.map(d => Object.create(d));
            const nodes = scope.data.nodes.map(d => Object.create(d));
            console.log("Loaded", nodes.length, "nodes and", links.length, "links")

            var width = element.parent().width();
            var height = parseInt(scope.row.height);

            var margin = {top: 20, right: 20, bottom: 20, left: 20};
            width = width - margin.left - margin.right;
            height = height - margin.top - margin.bottom;

            var calcLinkDistance = function(link) {
              var rel = link.rel || "isRelatedTo";
              if (rel == "sentA") { //sentPair to query sent
                return 60;
              } else if (rel == "sentB") { //sentPair to db sent
                return 20;
              } else if (rel == "isBasedOn") {
                return 20;
              } else if (rel == "appearance") {
                return 30;
              } else if (rel == "author") {
                return 60;
              } else if (rel == "itemReviewed") {
                return 40; 
              } else if (rel == "basedOn") {
                return 30;
              } else if (rel == "creator") {
                return 60;
              }
              return 30;
            }

            console.log("Creating svg node")

            var svg = d3.select(element[0]).append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom);

            var container = svg.append("g").attr("class", "container");

            console.log("Register zoom handler")
            var zoom = d3.zoom()
              .scaleExtent([0.1, 4])
              .on("zoom", function () {
                container.attr("transform", d3.event.transform);
              });

            svg.call(zoom);

            var link_force = d3force.forceLink(links)
              .id(function (d) {
                return d.id;
              })
              .distance(calcLinkDistance) // let distance depend on the type of relation?

            if (scope.panel.link_strength_weight !== 0) {
              link_force.strength(function (d) {
                return Math.sqrt(d.value * scope.panel.link_strength_weight);
              });
            }
            if (scope.panel.link_distance_weight !== 0) {
              link_force.distance(function (d) {
                return Math.sqrt(d.value * scope.panel.link_distance_weight);
              });
            }

            console.log("defining forceSimulation")

            var simulation = d3force.forceSimulation()
              .force("charge_force", d3force.forceManyBody().strength(scope.panel.strength))
              .force("center_force", d3force.forceCenter(width / 2, height / 2))
              .nodes(nodes)
              .force("links", link_force);

            var isolate_force = function(force, nodeFilter) {
              let init = force.initialize;
              force.initialize = function() { 
                let fnodes = nodes.filter(nodeFilter);
                init.call(force, fnodes); };
              return force;
            }

            var link = container.append("g")
              .selectAll("polyline")
              .data(links)
              .join("polyline")
                .attr("stroke-width", d => Math.max(1, Math.sqrt(d.value)))
                .attr("stroke", "#999")
                .attr("stroke-opacity", d => d.opacity || 0.6)
                .attr("fill", d => "none")
                .attr("stroke-dasharray", d => { // some relations use dashed lines
                  var rel = d.rel;
                  if (rel == "itemReviewed") {
                    return "2 1";
                  } else {
                    return null;
                  }
                })
                .attr("marker-mid", d => "url(#arrow)");

            link.append("title")
                .text(d => d.rel)
            
            let hLevels = nodes.filter(n => typeof n.hierarchyLevel == "number")
              .map(n => n.hierarchyLevel || 0);
            let maxHLevel = Math.max(...hLevels);
            console.log("Max HLevel: ", maxHLevel, "of", hLevels);
            [...Array(maxHLevel).keys()].forEach(hLevel => {
              let targetY = hLevel * height / (1 + maxHLevel)
              let hLevelFilter = n => n.hierarchyLevel == hLevel;
              simulation.force("hierarchy_y_" + hLevel, 
                isolate_force(d3.forceY(targetY), hLevelFilter))
              });
            
            let groups = nodes.filter(n => typeof n.group == "number")
              .map(n => n.group || 0)
            let maxGroup = Math.max(...groups);
            console.log("Max Groups: ", maxGroup, "of", groups);
            [...Array(maxGroup).keys()].forEach(group => {
              let targetX = group * width / (1 + maxGroup);
              let groupFilter = n => n.group == group;
              simulation.force("group_x_" + group,
                isolate_force(d3.forceX(targetX), groupFilter));
            })
            
            var selectedNodeId = null;

            // TODO: remove this? or define groups that make sense in the context of ClaimReviews
            const scale = d3.scaleOrdinal(d3.schemeCategory10);
            //console.log("scale 0", scale(0), "1:", scale(1), "2:", scale(2))
            var colorByGroup = function(d) {
                return scale(d.group + (d.hierarchyLevel || 0));
            }

            /* Given a node object, return the appropriate symbol id 
            The symbol must be defined as part of the encompassing svg element.
            */
            var calcSymbolId = function(d) {
              var itType = d["@type"]
              if (typeof itType == "undefined") {
                return "#thing";
              } else if (itType == "NormalisedClaimReview") {
                return "#claimReview_accurate";
              } else if (itType.endsWith("Review")) {
                return "#review";
              } else if (itType == "ClaimReviewNormalizer") {
                return "#bot";
              } else if (itType == "SentenceEncoder") {
                return "#bot";
              } else if (itType.endsWith("Reviewer")) {
                return "#bot";
              } else if (itType == "Sentence") {
                return "#sentence";
              } else if (itType == "Article") {
                return "#article";
              } else if (itType == "WebSite") {
                return "#website";
              } else if (itType == "SentencePair") {
                return "#sentence_pair";
              } else {
                return "#thing";
              }
            }

            /* wrapper of number.toFixed in case v is not a number */
            var myToFixed = function(v) {
              if (typeof v == "number") {
                return v.toFixed(3);
              } else {
                return v;
              }
            }

            /* Given a node object, return the tooltip text */
            var itemToTooltipText = function(d) {
              // console.log("building tooltip text for", d);
              const itType = d["@type"];
              if (typeof itType == "undefined") {
                return "undefined type";
              } 
              const defaultVal = itType + ": " + d.id;
              // console.log("building tooltip text for type ", itType);
              if (itType == "NormalisedClaimReview") {
                var claimReved = d.claimReviewed || "unknown claim";
                var rating = d.reviewRating || {};
                var explanation = rating.ratingExplanation || "no explanation";
                return "Normalised ClaimReview" + 
                  "\\n\\tclaim: " + claimReved + 
                  "\\n\\texplanation: " + explanation;
              } else if (itType == "ClaimReviewNormalizer") {
                var description = d.description || "missing";
                var name = d.name || itType;
                var version = d.softwareVersion || "unknown";
                return name +
                  "\\n\\tversion: " + version +
                  "\\n\\tdescription: " + description;
              } else if (itType == "SentenceEncoder") {
                var description = d.description || "missing";
                var name = d.name || itType;
                var version = d.softwareVersion || "unknown";
                return name +
                  "\\n\\tversion: " + version +
                  "\\n\\tdescription: " + description;
              } else if (itType == "Sentence") {
                var text = d.text || "missing text";
                return itType + ":\\n\\t" + text;
              } else if (itType == "Article") {
                var url = d.url || "unknown";
                var publisher = d.publisher || "unkown";
                return itType + 
                  "\\n\\turl: " + url +
                  "\\n\\tpublisher: " + publisher;
              } else if (itType == "WebSite") {
                var name = d.name || "unkown";
                return itType + ": " + name;
              } else if (itType == "SentencePair") {
                var text = d.text || "missing text";
                var roleA = d.roleA || "first";
                var roleB = d.roleB || "second";
                return itType + ":\\n\\t" + text +
                  "\\n\\t1st role: " + roleA +
                  "\\n\\t2nd role: " + roleB;
              } else if (itType.endsWith("Review")) {
                var rating = d.reviewRating || {};
                var aspect = rating.reviewAspect || "unknown";
                var ratingValue = myToFixed(rating.ratingValue || "unknown");
                var conf = myToFixed(rating.confidence || "unknown");
                var explanation = rating.ratingExplanation || "none";
                return itType + "(" + aspect + ")" +
                  "\\n\\tvalue and confidence: " + ratingValue + "(" + conf + ")" +
                  "\\n\\texplanation: " + explanation;
              } else if (itType.endsWith("Reviewer")) {
                var description = d.description || "missing";
                var name = d.name || itType;
                var version = d.softwareVersion || "unknown";
                return name +
                  "\\n\\tversion: " + version +
                  "\\n\\tdescription: " + description;
              } else if (itType == "Organization") {
                var name = d.name || "unkown";
                return itType + ": " + name;
              } else {
                return defaultVal;
              }
              return defaultVal;
            }

            // create usr feedback (review)

            var getCoinformUserReviewSchema = () => {
              var coinformUserReviewDict = `{
              "context": "http://schema.org",
              "type": "CoinformUserReview",
              "url": "",
              "author": {
                "context": "http://coinform.eu",
                "type": "CoinformUser",
                "url": "",
                "identifier": ""
              },
              "text": "",
              "name": "string",
              "supportingItem": [
                {
                  "context": "http://schema.org",
                  "type": "",
                  "url": ""
                }
              ],
              "reviewAspect": "accuracy",
              "reviewRating": {
                "context": "string",
                "type": "CoinformAccuracyRating",
                "ratingValue": "",
                "reviewAspect": "accuracy"
              },
              "itemReviewed": {
                "context": "http://schema.org",
                "type": "",
                "url": ""
              },
              "dateCreated": "",
              "requestFactCheck": true
            }`;

            return JSON.parse(coinformUserReviewDict);
            }

            const coinformUrl = "http://coinform.eu/";
            const coinformUsrPath = coinformUrl + "users";
            const mockDevUser = "mock-dev-user";

            var dateTime = () => {
              return new Date().toISOString();
            }

            var mockUserUrl = () => {
              return coinformUsrPath + "/" + mockDevUser
            };

            var mockReviewUrl = () => {
              var mockId = Math.random().toString().slice(2,);
              return mockUserUrl() + "/" + mockId
            };

            var accurateSupportingTextReview = () => {
              return "The " + getCoinformUserReviewSchema().type + " is correct";
            };

            var inaccurateSupportingTextReview = () => {
              return "The " + getCoinformUserReviewSchema().type + " is incorrect";
            };

            var itemReviewedType = (selectedRelatedLink) => {
              return selectedRelatedLink["@type"]
            };

            var itemReviewedUrl = (selectedRelatedLink) => {
              return "http://coinform.eu/sentence?text=" + selectedRelatedLink.text
            };

            var createCoinformUserReview = (coinformUserReviewSchema) => {
              coinformUserReviewSchema = getCoinformUserReviewSchema();
              coinformUserReviewSchema.dateCreated = dateTime();
              coinformUserReviewSchema.url = mockReviewUrl();
              coinformUserReviewSchema.author.url = mockUserUrl();
              coinformUserReviewSchema.author.identifier = mockDevUser;
              coinformUserReviewSchema.text = prompt("If you want, insert your review comment please:", "Write your comment here");
              //coinformUserReviewSchema.itemReviewed.context = "http://schema.org";
              //coinformUserReviewSchema.itemReviewed.type = itemReviewedType(selectedRelatedLink);
              //coinformUserReviewSchema.itemReviewed.url = itemReviewedUrl(selectedRelatedLink);
              return coinformUserReviewSchema;
            }

            var confirmUserReview = (review) => {
              return confirm("Are you sure? This review will be stored in a collection", review)
            }

            var postReview = (review) => {
              jQuery.ajax({
                type: "POST",
              data: JSON.stringify(review),
              contentType: "application/json; charset=utf-8",
                dataType: "json",
                url: "http://127.0.0.1:8070/test/api/v1/user/accuracy-review",
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

            var handleAccurate = (nodeId) => {
              return function () {
                var accurateUserReview = createCoinformUserReview();
                accurateUserReview.reviewRating.ratingValue = "accurate";
              if (!accurateUserReview.text || 
                accurateUserReview.text == null ||
                accurateUserReview.text == "Write your comment here") {
                accurateUserReview.text = accurateSupportingTextReview();
              }
                console.log("User says review ", nodeId, "is accurate");
                console.log("The user review feedback is: ", accurateUserReview);
                var conf = confirmUserReview(accurateUserReview);
                if (conf == true) { 
                  postReview(accurateUserReview)
                }
              }
            }

            var handleInaccurate = nodeId => {
              return function() {
                var inaccurateUserReview = createCoinformUserReview();
                inaccurateUserReview.reviewRating.ratingValue = "inaccurate";
              if (!inaccurateUserReview.text || 
                inaccurateUserReview.text == null ||
                inaccurateUserReview.text == "Write your comment here") {
                inaccurateUserReview.text = inaccurateSupportingTextReview();
              }
                console.log("User says review ", nodeId, "is inaccurate");
                console.log("The user review feedback is: ", inaccurateUserReview);
                var conf = confirmUserReview(inaccurateUserReview);
                if (conf == true) { 
                  postReview(inaccurateUserReview)
                }
              }
            }

            var drag = function(simulation) {
              function dragstarted(d) {
                if (!d3.event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
              }
              function dragged(d) {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
              }
              function dragended(d) {
                if (!d3.event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
              }
              return d3.drag()
                  .on("start", dragstarted)
                  .on("drag", dragged)
                  .on("end", dragended);
            }

            var node_as_key_vals = (node, maxDepth, privateFields) => Object.entries(node)
              .filter(entry => !privateFields.includes(entry[0]))
              .flatMap(entry => {
                let [key, val] = entry;
                if (typeof val == "object" && maxDepth > 0) {
                  return node_as_key_vals(val, maxDepth - 1, privateFields)
                    .map(entry2 => [key + "." + entry2[0], entry2[1]]);
                } else if (typeof val == "object") {
                  return [[key, "Object"]];
                }
                return [entry]
                })

            var node_as_html_table = function(node) {
              const privateFields = ["id", "hierarchyLevel", "group", "opacity", "nodeSize", "nodeScale"];
              console.log("", node["@type"], node["id"], "as table");
              let rows = node_as_key_vals(node, 2, privateFields)
                .map(entry => {
                  let [key, val] = entry;
                  return ["<tr><td>" + key.toString() + "</td><td>" +  val.toString() + "</td></tr>"]
                })
                .join(" ");
              let table = "<font size='3'>  <table id=t01>" + rows + "</table> </font>"
              return table;
            }

            var nodeSize = function (d) {
              if (scope.panel.node_size_weight === 0) {
                return 5;
              } else {
                return (scope.panel.node_size_weight * Math.sqrt(d.count)) + 4;
              }
            };

            var svg_node = function(d) {
              var result = d.append("g")
                .attr("stroke", colorByGroup)
                .attr("fill", colorByGroup);
          
                var use = result.append("use")
                  .attr("xlink:href", calcSymbolId)
                  .attr("transform", d => {
                      let selectedFactor = (d.id == selectedNodeId) ? 2.0 : 1.0;
                      let scale = (d.nodeScale || 1.0) * selectedFactor;
                      return "scale(" + scale  + ")"
                    })
                  .attr("style", d => "opacity:" + (d.opacity || 0.8));

                use.on("click", d => {
                  console.log("clicked on ", d);
                  var selectedNodeId = d.id;
                  use.attr("transform", d => { //recalc scale
                      let selectedFactor = (d.id == selectedNodeId) ? 2.0 : 1.0;
                      let scale = (d.nodeScale || 1.0) * selectedFactor;
                      return "scale(" + scale  + ")"
                    })
                    var selectedNode = d.__proto__
                          d3.select("#selectedNode")
                            .html("<h2> > check and review the selected node</h2> <p>" + node_as_html_table(selectedNode) + "</p>");
                            if (selectedNode.rel == "itemReviewed") {
                              console.log("this is the target: ", selectedNode.target)
                            }
                            if (selectedNode['@type'].endsWith("Review")) {
                              d3.select("#reviewNode")
                                .html("<p><button class='button' id='accRev'>Accurate</button>" +
                                      "<button class='button' id='inaccRev'>Incorrect</button></p>");
                                }
                            else {
                              d3.select("#reviewNode")
                                .html("<p>cannot be reviewed</p>")
                            }
              
                          // select neighborhood
                          //selectedRelatedLinks = links.filter(function (i) { 
                          //  return i.__proto__.source == d.__proto__.identifier });
                          //selectedRelatedLink = selectedRelatedLinks.filter(function (i) { 
                          //  return i.__proto__.rel == "itemReviewed" })[0].target.__proto__;
              
                          let isReview = typeof selectedNode == "object" && Object.keys(selectedNode).includes("@type") && selectedNode["@type"].endsWith("Review");
                          console.log("selected node is review?", isReview, typeof d == "object", 
                            Object.keys(d), Object.keys(d).includes("@type"));
              
                          d3.select("#accRev")
                            .attr("hidden", isReview ? null : true)
                            .on("click", handleAccurate(selectedNode))
              
                          d3.select("#inaccRev")
                            .on("click", handleInaccurate(selectedNode))
                  });

              return result
            }
            
            console.log("Adding node svg elts")
            var node = container.append("g")
                  .selectAll("circle")
                  .data(nodes)
                  .join(svg_node)
                  .attr("stroke-width", 1.5)
                  .call(drag(simulation));
            
            console.log("Setting node titles")
            node.append("title")
                  .text(itemToTooltipText);
                  
            console.log("Register tick event handlers")
            simulation.on("tick", () => {
              link
                    //.attr("x1", d => d.source.x)
                    //.attr("y1", d => d.source.y)
                    //.attr("x2", d => d.target.x)
                    //.attr("y2", d => d.target.y)
                    
                    .attr("points", d => {
                    var src = d.source.x + "," + d.source.y;
                    var tgt = d.target.x + "," + d.target.y;
                    
                    var midx = d.source.x + (d.target.x - d.source.x) * 0.8;
                    var midy = d.source.y + (d.target.y - d.source.y) * 0.8;
                    var mid = midx + "," + midy;
                  
                    return src + " " + mid + " " + tgt;
                    });
            
                node
                    .attr("x", d => d.x)
                    .attr("y", d => d.y)
                    .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
              });

            $rootScope.$on(FORCE_SEARCH_FOR_NODE_EVENT, function (e, q) {
              var lq = q.toLowerCase().trim();

              if (lq === "") {
                scope.selList = _.extend({}, scope.selListCopy);
              } else {
                scope.selListCopy = _.extend({}, scope.selList);

                node.each(function(d) {
                  scope.selList["n" + d.node] = d.name.toLowerCase().indexOf(lq) !== -1;
                });
              }
            });

            scope.panelMeta.loading = false;
          }
        }
      };
    });
  });
