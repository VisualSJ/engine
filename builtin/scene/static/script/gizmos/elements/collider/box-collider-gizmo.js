'use strict';

const NodeUtils = Editor.require('scene://utils/node');

let ColliderGizmo = require('./collider-gizmo');
let Tools = require('../tools');
let RectToolType = Tools.rectTool.Type;

let _tempMatrix = cc.vmath.mat4.create();


class BoxColliderGizmo extends ColliderGizmo {
    onCreateMoveCallbacks () {
        let startOffset;
        let startSize;
        let self = this;

        function handleCenterRect (delta) {
            let node = self.node;
            let mat = cc.vmath.mat4.create();
            node.getWorldMatrix(mat);
            cc.vmath.mat4.invert(mat, mat);
            mat.m12 = mat.m13 = 0;
            
            let d = cc.v2();
            cc.vmath.vec2.transformMat4(d, delta, mat);
            d.addSelf(startOffset);
            self.target.offset = d;
        }

        function formatDelta (type, delta, sizeDelta, keepAspectRatio) {
            if (type === RectToolType.LeftBottom) {
                sizeDelta.x *= -1;
            }
            else if (type === RectToolType.LeftTop) {
                sizeDelta.x *= -1;
                sizeDelta.y *= -1;
            }
            else if (type === RectToolType.RightTop) {
                sizeDelta.y *= -1;
            }
            else if (type === RectToolType.Left) {
                sizeDelta.x *= -1;
                if (!keepAspectRatio) {
                    delta.y = sizeDelta.y = 0;
                }
            }
            else if (type === RectToolType.Right) {
                if (!keepAspectRatio) {
                    delta.y = sizeDelta.y = 0;
                }
            }
            else if (type === RectToolType.Top) {
                sizeDelta.y *= -1;
                if (!keepAspectRatio) {
                    delta.x = sizeDelta.x = 0;
                }
            }
            else if (type === RectToolType.Bottom) {
                if (!keepAspectRatio) {
                    delta.x = sizeDelta.x = 0;
                }
            }
        }

        function formatDeltaWithAnchor (type, anchor, delta, sizeDelta, keepCenter) {
            if (type === RectToolType.Right ||
                type === RectToolType.RightTop ||
                type === RectToolType.RightBottom) {
                if (keepCenter) {
                    sizeDelta.x /= (1 - anchor.x);
                }
                delta.x = sizeDelta.x * anchor.x;
            }
            else {
                if (keepCenter) {
                    sizeDelta.x /= anchor.x;
                }
                delta.x = sizeDelta.x * (1 - anchor.x);
            }

            if (type === RectToolType.LeftBottom ||
                type === RectToolType.Bottom ||
                type === RectToolType.RightBottom) {
                if (keepCenter) {
                    sizeDelta.y /= (1- anchor.y);
                }
                delta.y = sizeDelta.y * anchor.y;
            }
            else {
                if (keepCenter) {
                    sizeDelta.y /= anchor.y;
                }
                delta.y = sizeDelta.y * (1 - anchor.y);
            }

            return delta;
        }

        function handleSizePoint (type, delta, keepAspectRatio, keepCenter) {

            let sizeDelta = delta.clone();
            let node = self.node;
            let target = self.target;

            // compute transform
            let mat = cc.vmath.mat4.create();
            node.getWorldMatrix(mat);
            cc.vmath.mat4.invert(mat, mat);
            mat.m12 = mat.m13 = 0;

            // compute position and size
            let d = cc.v2();
            let sd = cc.v2();
            cc.vmath.vec2.transformMat4(d, delta, mat);
            cc.vmath.vec2.transformMat4(sd, sizeDelta, mat);
            let anchor = cc.v2(0.5, 0.5);

            formatDeltaWithAnchor(type, anchor, d, sd, keepCenter);
            formatDelta(type, d, sd, keepAspectRatio);

            if (keepAspectRatio) {
                sd.y = sd.x * (startSize.height / startSize.width);
            }

            // apply results
            let size = cc.size(startSize.width + sd.x, startSize.height + sd.y);

            if (!keepCenter) {
                if (size.width < 0) {
                    d.x -= size.width/2;
                }
                if (size.height < 0) {
                    d.y -= size.height/2;
                }
                d = startOffset.add(d);
                target.offset = d;
            }

            if (size.width < 0) {
                size.width = 0;
            }
            if (size.height < 0) {
                size.height = 0;
            }
            target.size = size;
        }

        return {
            start: () => {
                startOffset = this.target.offset.clone();
                startSize = this.target.size.clone();
            },

            update: (dx, dy, event, type) => {
                let delta = new cc.Vec2(dx, dy);

                if (type === RectToolType.Center) {
                    handleCenterRect(delta.clone());
                }
                else {
                    let keepAspectRatio = event ? event.shiftKey : false;
                    let keepCenter = event ? event.altKey : false;

                    handleSizePoint(type, delta.clone(), keepAspectRatio, keepCenter);
                }
            },

            end: (updated, event, type) => {
                if (!updated) return;

                let target = self.target;
                if (type === RectToolType.Center) {
                    this.adjustValue(target, ['offset']);
                }
                else {
                    this.adjustValue(target, ['offset', 'size']);
                }
            }
        };
    }

    onCreateRoot () {
        let root = this._root;
        let sideGroup = root.sideGroup = root.group().style( 'pointer-events', 'none' );
        let sidePointGroup;
        let l, t, r, b;         // size sides
        let lb, lt, rt, rb;     // size sides points
        let dragArea;           // center dragArea

        // init center dragArea
        root.dragArea = dragArea = root.polygon('0,0,0,0,0,0')
            .fill( { color: 'rgba(0,128,255,0.2)' } )
            .stroke('none')
            .style( 'pointer-events', 'fill' )
            ;

        this.registerMoveSvg( dragArea, RectToolType.Center );

        // init sides
        let createLineTool = (type, cursor) => {
            return Tools.lineTool( sideGroup, cc.v2(0,0), cc.v2(0,0), '#7fc97a', cursor, this.createMoveCallbacks(type))
                .style( 'cursor', cursor );
        };

        l = createLineTool(RectToolType.Left, 'col-resize');
        t = createLineTool(RectToolType.Top, 'row-resize');
        r = createLineTool(RectToolType.Right, 'col-resize');
        b = createLineTool(RectToolType.Bottom, 'row-resize');

        // init sides points
        sidePointGroup = root.sidePointGroup = root.group();
        sidePointGroup.hide();

        let createSidePoint = (type, svg, cursor) => {
            return Tools.circleTool(svg, 5, {color: '#7fc97a'}, null, this.createMoveCallbacks(type))
                .style( 'cursor', cursor );
        };

        lb = createSidePoint(RectToolType.LeftBottom, sidePointGroup, 'nwse-resize');
        lt = createSidePoint(RectToolType.LeftTop, sidePointGroup, 'nesw-resize');
        rt = createSidePoint(RectToolType.RightTop, sidePointGroup, 'nwse-resize');
        rb = createSidePoint(RectToolType.RightBottom, sidePointGroup, 'nesw-resize');

        // set bounds
        root.plot =  (bounds) => {
            dragArea.plot([
                [bounds[0].x, bounds[0].y],
                [bounds[1].x, bounds[1].y],
                [bounds[2].x, bounds[2].y],
                [bounds[3].x, bounds[3].y]
            ]);

            l.plot(bounds[0].x, bounds[0].y, bounds[1].x, bounds[1].y);
            t.plot(bounds[1].x, bounds[1].y, bounds[2].x, bounds[2].y);
            r.plot(bounds[2].x, bounds[2].y, bounds[3].x, bounds[3].y);
            b.plot(bounds[3].x, bounds[3].y, bounds[0].x, bounds[0].y);

            if (this._targetEditing) {
                lb.center(bounds[0].x, bounds[0].y);
                lt.center(bounds[1].x, bounds[1].y);
                rt.center(bounds[2].x, bounds[2].y);
                rb.center(bounds[3].x, bounds[3].y);
            }
        };        
    }

    onUpdate () {
        let target = this.target;
        let size = target.size;
        let offset = target.offset;
        let rect = cc.rect(offset.x - size.width/2, offset.y - size.height/2, size.width, size.height);

        this.node.getWorldMatrix(_tempMatrix);
        let obb = NodeUtils.getObbFromRect(_tempMatrix, rect);
        obb[0] = this.worldToPixel(obb[0]);
        obb[1] = this.worldToPixel(obb[1]);
        obb[2] = this.worldToPixel(obb[2]);
        obb[3] = this.worldToPixel(obb[3]);

        this._root.plot(obb);
    }

    enterEditing () {
        let root = this._root;
        root.sideGroup.style( 'pointer-events', 'stroke' );
        root.dragArea.style( 'cursor', 'move' );
        root.sidePointGroup.show();
    }

    leaveEditing () {
        let root = this._root;
        root.sideGroup.style( 'pointer-events', 'none' );
        root.dragArea.style( 'cursor', null );
        root.sidePointGroup.hide();
    }
}

module.exports = BoxColliderGizmo;
