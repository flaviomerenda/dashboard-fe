# ReviewGraph component implementation

The reviewGraph component is implemented as follows.
* controller: `src/app/controllers/reviewGraph.js` delegates to
  * `src/app/services/rgProcessor.js`
* view: `src/app/partials/reviewGraph.html`
  * uses an element managed by `src/app/directives/reviewGraphDir.js` which delegates to
    * `src/app/services/rgBuilder.js`

## Controller
Implemented in `src/app/controllers/reviewGraph.js` 
It should be called as follows in some calling html template (see e.g. the `src/app/panels/table/module.html`):

``` html
<div ng-controller='reviewGraph' ng-init="init(ciDoc)" ng-include="'app/partials/reviewGraph.html'"></div>
```
where `ciDoc` is a co-inform document. The controller fetches an `acred` credibility review graph if one is available for the document. It then delegates to:

* the `rgProcessor` to enrich the `acred` graph so that nodes and
  links are compatible with the D3js force-graph library. The
  processed graph is stored in `$scope.wholeGraph`.
* angular to render the html template using the new
  `$scope.wholeGraph` state. As part of the rendering, the `reviewGraphDir`ective actually builds the
  D3js force graph and handles events.

### Service `rgProcessor`
1. enriches acred credibility review Graphs to make them compatible with D3js force-graphs. Both graphs contains nodes and links, but the enriching process adds fields:
   * for nodes:
     * `id`: either the identifier, '@id' of 'url' value
     * `hierarchyLevel`: int with depth from the mainNode 
     * `group`: int based on the nodeType (e.g. Review, Bot, Thing)
     * `nodeSize`: deprecated, useful only if using svg circle
     * `nodeScale`: used to transform the standard size of the svg element
     * `enabledNode`: bool currently fixed to true
   * for links:
     * `value`: float, currently fixed value
   * for both nodes and links:
     * `opacity`: used to store the "current" opacity
     * `originalOpacity`: used to store "temporary" opacity //FIXME: we should be able to calculate opacity based on some global state, instead of introducing state here
   * Adds calculated field values value, originalOpacity and opacity to links

 2. providing common extractor functions to access and calculate
   information about nodes and links in the graph. These are available
   via the `search`, `nodeMapper` and `linkMapper` properties.


## View
Implemented in `src/app/partials/reviewGraph.html` (of course the dashboard css is used to format the html elements).
The view is relatively simple and defines:
* title `.review-graph-explanation` (sic)
* main graph `.review-graph`
  * sidebar `.review-graph-sidebar`
    * contains buttons with the icons calling `sidebarGraphEvent(nodeType:graphId)`
  * the actual graph `.review-graph-render` rendered by the `reviewGraphDir`ective
* view buttons `.rg-critical-path-bar`
  * "fit to view" calls `zoomFit()`
  * "show/hide discarded evidence" calls `clickCriticalPath()`
* doc details `.ciDocument` (sic)
  * shows different cards depending on current selection
    * given by state flags `activateReviewCard`, `activateItemReviewedCard`, `activateBotCard` or `activateOrganizationCard`
    
### `reviewGraphDir`ective 
This is the **real** controller and does most of the work
