'use strict';

let ColliderGizmo = require('./collider-gizmo');
let Tools = require('../tools');

let ToolType = {
    None: 0,
    Point: 1,
    Line: 2,
};

class ChainColliderGizmo extends ColliderGizmo {
    onCreateMoveCallbacks () {
        let startPoint;
        let pointInstance;

        return {
            start: (x, y, event, type) => {
                if (type === ToolType.Point) {
                    let el = event.currentTarget.instance;
                    pointInstance = el.point.origin;
                    startPoint = pointInstance.clone();

                    let deleteKeyDown = event.ctrlKey || event.metaKey;
                    if (deleteKeyDown) {
                        this.recordChanges();

                        let points = this.target.points;
                        points.splice(points.indexOf(pointInstance), 1);

                        this.commitChanges();

                        return;
                    }
                }
                else if (type === ToolType.Line) {
                    this.recordChanges();

                    let p = this.node.convertToNodeSpaceAR(cc.v2(x, y));
                    
                    let el = event.currentTarget.instance;
                    let start = el.startSvgPoint.point.origin;
                    let end = el.endSvgPoint.point.origin;

                    let points = this.target.points; 
                    let nextIndex = points.indexOf(start) + 1;

                    // allign point to line
                    let dx = start.x - end.x;  
                    let dy = start.y - end.y;  
                    let u = (p.x - start.x)*(start.x - end.x) + (p.y - start.y)*(start.y - end.y);  
                    u = u/((dx*dx)+(dy*dy));  
                  
                    p.x = start.x + u*dx;
                    p.y = start.y + u*dy;

                    this.adjustValue(p);

                    this.target.points.splice(nextIndex, 0, p);

                    this.commitChanges();
                }
            },

            update: (dx, dy, event, type) => {
                let mat = cc.vmath.mat4.create();
                this.node.getWorldMatrix(mat);
                cc.vmath.mat4.invert(mat, mat);
                mat.m12 = mat.m13 = 0;

                if (type === ToolType.Point) {
                    let deleteKeyDown = event.ctrlKey || event.metaKey;
                    if (deleteKeyDown) {
                        return;
                    }

                    let d = cc.v2(dx, dy);
                    cc.vmath.vec2.transformMat4(d, d, mat);
                    d.addSelf(startPoint);
                    this.adjustValue(d);

                    pointInstance.x = d.x;
                    pointInstance.y = d.y;
                }
            }
        };
    }

    onCreateRoot () {
        let root = this._root;

        // lines
        let linesGroup = root.linesGroup = root.group();
        let linesPool = [];

        linesGroup.style('cursor', 'normal');

        let createLine = () => {
            return Tools.lineTool( linesGroup, cc.v2(0,0), cc.v2(0,0), '#7fc97a', null, this.createMoveCallbacks(ToolType.Line));
        };

        // points
        let pointsGroup = root.pointsGroup = root.group();
        let pointsPool = [];

        pointsGroup.hide();

        let createPoint = () => {
            let svg = Tools.circleTool(pointsGroup, 5, {color: '#7fc97a'}, null, 'pointer', this.createMoveCallbacks(ToolType.Point));
            svg.on('mouseover', function (event) {
                let deleteKeyDown = event.ctrlKey || event.metaKey;
                if (deleteKeyDown) {
                    svg.fill({color: '#f00'});
                    if (svg.l1) svg.l1.stroke({color: '#f00'});
                    if (svg.l2) svg.l2.stroke({color: '#f00'});
                }
            });

            svg.on('mouseout', function (event) {
                svg.fill({color: '#7fc97a'});
                if (svg.l1) svg.l1.stroke({color: '#7fc97a'});
                if (svg.l2) svg.l2.stroke({color: '#7fc97a'});
            });

            return svg;
        };

        // plot
        root.plot = function (points) {
            let ps = [];
            for (let i = 0, l = points.length; i < l; i++) {
                let p = points[i];
                ps.push([p.x, p.y]);

                // svg point
                let sp = pointsPool[i];
                if (!sp) {
                    sp = pointsPool[i] = createPoint();
                }

                sp.point = p;
                sp.show();
                sp.center(p.x, p.y);

                if (i === l - 1) {
                    continue;
                }

                // next index
                let ni = i + 1;

                // pre generate next svg point
                let nsp = pointsPool[ni];
                if (!nsp) {
                    nsp = pointsPool[ni] = createPoint();
                }

                // line
                let line = linesPool[i];
                if (!line) {
                    line = linesPool[i] = createLine();
                }

                let start = p;
                let end = points[ni];
                line.show();
                line.plot(start.x, start.y, end.x, end.y);
                line.startSvgPoint = sp;
                line.endSvgPoint = nsp;

                sp.l1 = line;
                nsp.l2 = line;
            }

            for (let i = points.length, l = pointsPool.length; i < l; i++) {
                pointsPool[i].hide();
            }

            for (let i = points.length-1, l = pointsPool.length; i < l; i++) {
                if (linesPool[i]) {
                    linesPool[i].hide();
                }
            }
        };
    }

    onUpdate () {
        let points = this.target.points;
        let node = this.node;
        let mat = cc.vmath.mat4.create();
        this.node.getWorldMatrix(mat);

        let wpoints = [];

        for (let i = 0, l = points.length; i < l; i++) {
            let p = points[i];
            let wp = cc.v2();
            cc.vmath.vec2.transformMat4(wp, p, mat);
            wp = this.worldToPixel(wp);
            wp.origin = points[i];
            wpoints.push(wp);
        }

        this._root.plot(wpoints);
    }

    enterEditing () {
        let root = this._root;
        root.pointsGroup.show();
        root.linesGroup.style('cursor', 'copy');
    }

    leaveEditing () {
        let root = this._root;
        root.pointsGroup.hide();
        root.linesGroup.style('cursor', 'normal');
    }
}

module.exports = ChainColliderGizmo;
