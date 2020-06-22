// similar to the RowCtrl, except for panels that appear in the side panel
// typically, this container will consists of the main filters
define([
    'angular',
    'app',
    'underscore'
],
function (angular, app, _) {
    'use strict';

    var module = angular.module('kibana.controllers');

    module.controller('SideColumnCtrl', function ($scope, $rootScope, $timeout, dashboard, ejsResource, sjsResource, querySrv) {
        var _d = {
            title: "Column",
            width: "250px",
            collapse: false,
            collapsable: true,
            editable: true,
            panels: []
        };


        $scope.init = function () {
            _.defaults((dashboard.current.sideColumn || {}), _d);
            $scope.querySrv = querySrv;
            $scope.reset_panel();
        };

        $scope.toggle_column = function (col) {
            if (!col.collapsable) {
                return;
            }
            col.collapse = col.collapse ? false : true;
            if (!col.collapse) {
                $timeout(function () {
                    $scope.$broadcast('render');
                });
            }
        };

        $scope.colSpan = function (col) {
            var panels = _.filter(col.panels, function (p) {
                return $scope.isPanel(p);
            });
            return _.reduce(_.pluck(panels, 'span'), function (p, v) {
                return p + v;
            }, 0);
        };

        // This can be overridden by individual panels
        $scope.close_edit = function () {
            $scope.$broadcast('render');
        };

        $scope.add_panel = function (col, panel) {
            $scope.col.panels.push(panel);
        };

        $scope.reset_panel = function (type) {
            /*
            var
                defaultSpan = 4,
                _as = 12 - $scope.colSpan($scope.col);

            $scope.panel = {
                error: false,
                span: _as < defaultSpan && _as > 0 ? _as : defaultSpan,
                editable: true,
                type: type
            };
            */
        };

        $scope.init();
    });
});
