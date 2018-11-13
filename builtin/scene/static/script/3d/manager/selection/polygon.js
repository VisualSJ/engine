'use strict';

function Polygon(points) {
    this.points = points;

    if (this.points.length < 3) {
        console.warn('Invalid polygon, the data must contains 3 or more points.');
    }
}

Polygon.prototype.intersects = function(polygon) {
    return Editor.Utils.Intersection.polygonPolygon(this, polygon);
};

Polygon.prototype.contains = function(point) {
    var inside = false;
    var x = point.x;
    var y = point.y;

    // use some raycasting to test hits
    // https://github.com/substack/point-in-polygon/blob/master/index.js
    var length = this.points.length;

    for (var i = 0, j = length - 1; i < length; j = i++) {
        var xi = this.points[i].x;
        var yi = this.points[i].y;
        var xj = this.points[j].x;
        var yj = this.points[j].y;
        var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) { inside = !inside; }
    }

    return inside;
};

Object.defineProperty(Polygon.prototype, 'center', {
    get: function() {
        if (this.points.length < 3) {
            return null;
        }

        var min_x = this.points[0].x;
        var min_y = this.points[0].y;
        var max_x = this.points[0].x;
        var max_y = this.points[0].y;

        for (var i = 1; i < this.points.length; ++i) {
            var x = this.points[i].x;
            var y = this.points[i].y;

            if (x < min_x) {
                min_x = x;
            } else if (x > max_x) {
                max_x = x;
                 }

            if (y < min_y) {
                min_y = y;
            } else if (y > max_y) {
                max_y = y;
                 }
        }

        return new cc.Vec2((max_x + min_x) * 0.5,
                              (max_y + min_y) * 0.5);
    }
});

module.exports = Polygon;
