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
