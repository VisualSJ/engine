'use strict';

let ColliderGizmo = require('./collider-gizmo');
let Tools = require('../tools');

let ToolType = {
    None: 0,
    Side: 1,
    Center: 2
};

class CircleColliderGizmo extends ColliderGizmo {
    onCreateMoveCallbacks () {
        let startOffset;
        let startRadius;
        let pressx, pressy;

        return {
            start: (x, y, event, type) => {
                startOffset = this.target.offset;
                startRadius = this.target.radius;
                pressx = x;
                pressy = y;
            },

            update: (dx, dy, event, type) => {
                let node = this.node;

                if (type === ToolType.Center) {
                    let mat = cc.vmath.mat4.create();
                    this.node.getWorldMatrix(mat);
                    cc.vmath.mat4.invert(mat, mat);
                    mat.m12 = mat.m13 = 0;
                    
                    let d = cc.v2(dx, dy);
                    cc.vmath.vec2.transformMat4(d, d, mat);
                    d.addSelf(startOffset);
                    this.target.offset = d;
                    this.adjustValue(this.target, 'offset');
                }
                else {
                    let o = node.convertToNodeSpace(cc.v2(pressx + dx, pressy + dy));
                    let d = o.subSelf(startOffset).mag();
                    this.target.radius = d;
                    this.adjustValue(this.target, 'radius');
                }
            }
        };
    }

    onCreateRoot () {
        let root = this._root;
        let circle;
        let sidePointGroup;
        let lp, tp, rp, bp;     // size sides points
        let dragArea;           // center drag area

        let createSidePoint = (svg, cursor) => {
            return Tools.circleTool(svg, 5, {color: '#7fc97a'}, null, this.createMoveCallbacks(ToolType.Side))
                .style( 'cursor', cursor );
        };

        // init center drag area
        root.dragArea = dragArea = root.circle('0,0,0,0,0,0')
            .fill( { color: 'rgba(0,128,255,0.2)' } )
            .stroke('none')
            .style( 'pointer-events', 'fill' )
            ;

        this.registerMoveSvg( dragArea, ToolType.Center );

        // init circle
        circle = root.circle = Tools.circleTool(root, 0, null, {color: '#7fc97a'}, this.createMoveCallbacks(ToolType.Side));
        circle.style( 'pointer-events', 'none' );

        // init sides points
        sidePointGroup = root.sidePointGroup = root.group();
        sidePointGroup.hide();

        lp = createSidePoint(sidePointGroup, 'col-resize');
        tp = createSidePoint(sidePointGroup, 'row-resize');
        rp = createSidePoint(sidePointGroup, 'col-resize');
        bp = createSidePoint(sidePointGroup, 'row-resize');

        // set bounds
        root.plot =  (pos, radius) => {
            circle.radius(radius).center(pos.x, pos.y);
            dragArea.radius(radius).center(pos.x, pos.y);

            if (this._targetEditing) {
                lp.center(pos.x - radius, pos.y);
                tp.center(pos.x, pos.y + radius);
                rp.center(pos.x + radius, pos.y);
                bp.center(pos.x, pos.y - radius);
            }
        };
    }

    onUpdate () {
        let node = this.node;
        let radius = this.target.radius;

        let p  = this.worldToPixel( node.convertToWorldSpaceAR(this.target.offset) );

        let p1 = node.convertToWorldSpaceAR(cc.v2(0, 0));
        let p2 = node.convertToWorldSpaceAR(cc.v2(radius, 0));
        let d = p1.sub(p2).mag();

        this._root.plot(p, d);
    }

    enterEditing () {
        let root = this._root;
        root.circle.style( 'pointer-events', 'stroke' );
        root.dragArea.style( 'cursor', 'move' );
        root.sidePointGroup.show();
    }

    leaveEditing () {
        let root = this._root;
        root.circle.style( 'pointer-events', 'none' );
        root.dragArea.style( 'cursor', null );
        root.sidePointGroup.hide();
    }
}

module.exports = CircleColliderGizmo;
