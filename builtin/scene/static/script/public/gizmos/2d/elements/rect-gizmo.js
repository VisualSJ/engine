'use strict';

const NodeUtils = Editor.require('scene://utils/node');

let Tools = require('./tools');
let RectToolType = Tools.rectTool.Type;
let snapPixelWihVec2 = Editor.GizmosUtils.snapPixelWihVec2;
let vmath = cc.vmath;

let v2 = cc.v2;

let _tempMatrix = vmath.mat4.create();
let _tempV2a = new v2();
let _tempV2b = new v2();

function boundsToRect (bounds) {
    return cc.rect(
        bounds[1].x,
        bounds[1].y,
        bounds[3].x - bounds[1].x,
        bounds[3].y - bounds[1].y
    );
}

class RectGizmo extends Editor.Gizmo {
    init () {
        this._processing = false;
        this._rect = cc.rect(0, 0, 0, 0);
        this._tool = null;
    }

    layer () {
        return 'foreground';
    }

    onCreateMoveCallbacks () {
        let worldPosList = [],
            localPosList = [],
            sizeList = [],
            anchorList = [],
            rectList = [],
            self = this;

        function handleAnchorPoint (delta) {
            let node = self.target[0];
            let size = node.getContentSize();
            _tempV2a.set(node._position);

            let pos = worldPosList[0].add(delta);
            NodeUtils.setWorldPosition(node, pos);

            node.getLocalMatrix(_tempMatrix);
            vmath.mat4.invert(_tempMatrix, _tempMatrix);
            _tempMatrix.m12 = 0;
            _tempMatrix.m13 = 0;

            // compute position
            _tempV2b.x = node.x;
            _tempV2b.y = node.y;
            _tempV2b.subSelf(_tempV2a);
            vmath.vec2.transformMat4(_tempV2b, _tempV2b, _tempMatrix);
            _tempV2b.x = _tempV2b.x / size.width;
            _tempV2b.y = _tempV2b.y / size.height;

            _tempV2a.x = node.anchorX;
            _tempV2a.y = node.anchorY;
            _tempV2a.addSelf(_tempV2b);
            node.setAnchorPoint(_tempV2a);
        }

        function handleCenterRect (delta) {
            let length = self.target.length;
            for (let i = 0; i < length; ++i) {
                let node = self.target[i];
                let position = worldPosList[i];
                let size = node.getContentSize();
                let anchor = anchorList[i];

                _tempV2a.x = _tempV2a.y = 0;
                let s = node.parent.convertToNodeSpaceAR(_tempV2a);
                let d = node.parent.convertToNodeSpaceAR(delta);
    
                // compute position
                s.sub(d, d);
                node.getLocalMatrix(_tempMatrix);
                vmath.mat4.invert(_tempMatrix, _tempMatrix);
                _tempMatrix.m12 = 0;
                _tempMatrix.m13 = 0;
                vmath.vec2.transformMat4(d, d, _tempMatrix);
            
                d.x = d.x / size.width;
                d.y = d.y / size.height;
                anchor.add(d, _tempV2a);
                node.setAnchorPoint(_tempV2a);

                // NodeUtils.setWorldPosition(node, worldPosList[i].add(delta) );
            }
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
            let size = sizeList[0];

            if (keepAspectRatio) {
                delta.y = delta.x * (size.height / size.width);
            }

            let sizeDelta = delta.clone();
            let localPosition = localPosList[0];
            let node = self.target[0];

            // compute transform
            node.getWorldMatrix(_tempMatrix);
            vmath.mat4.invert(_tempMatrix, _tempMatrix);
            _tempMatrix.m12 = _tempMatrix.m13 = 0;

            let d = vmath.vec2.transformMat4(cc.v2(), delta, _tempMatrix);
            let sd = vmath.vec2.transformMat4(cc.v2(), sizeDelta, _tempMatrix);
            let anchor = node.getAnchorPoint();

            formatDeltaWithAnchor(type, anchor, d, sd, keepCenter);
            formatDelta(type, d, sd, keepAspectRatio);

            // apply results
            if (!keepCenter) {
                node.getLocalMatrix(_tempMatrix);
                _tempMatrix.m12 = _tempMatrix.m13 = 0;
                vmath.vec2.transformMat4(d, d, _tempMatrix);
                
                node.position = localPosition.add(d);
            }
            node.setContentSize(cc.size(size.width + sd.x, size.height + sd.y));
        }

        function handleMutiSizePoint (type, delta, keepAspectRatio, keepCenter) {
            let originRect = rectList.tempRect;

            if (keepAspectRatio) {
                delta.y = delta.x * (originRect.height / originRect.width);
            }

            let sizeDelta = delta.clone();

            formatDelta(type, delta, sizeDelta, keepAspectRatio);

            let anchor = keepCenter ? v2(0.5, 0.5) : v2(0, 0);
            formatDeltaWithAnchor(type, anchor, delta, sizeDelta, keepCenter);

            let rect = originRect.clone();
            rect.x = originRect.x - delta.x;
            rect.y = originRect.y - delta.y;
            rect.width = originRect.width + sizeDelta.x;
            rect.height = originRect.height + sizeDelta.y;

            self._rect = rect;

            for (let i = 0, l = self.target.length; i < l; i++) {
                let node = self.target[i];
                let worldPosition = worldPosList[i];

                let xp = (worldPosition.x - originRect.x) / originRect.width;
                let yp = (worldPosition.y - originRect.y) / originRect.height;

                NodeUtils.setWorldPosition(node, v2(rect.x + xp * rect.width, rect.y + yp * rect.height) );

                let r = rectList[i];
                let wp = r.width / originRect.width;
                let hp = r.height / originRect.height;

                let size = sizeList[i];
                let widthDirection = size.width > 0 ? 1 : -1;
                let heightDirection = size.height > 0 ? 1 : -1;

                let sd = sizeDelta.clone();
                sd.x = sd.x * wp * widthDirection;
                sd.y = sd.y * hp * heightDirection;

                // make transform
                let mat = vmath.mat4.create();
                node.getWorldMatrix(mat);
                vmath.mat4.invert(mat, mat);
                mat.m12 = mat.m13 = 0;
                mat.m00 = Math.abs(mat.m00);
                mat.m01 = Math.abs(mat.m01);
                mat.m04 = Math.abs(mat.m04);
                mat.m05 = Math.abs(mat.m05);

                vmath.vec2.transformMat4(sd, sd, mat);
                node.setContentSize(cc.size(size.width + sd.x, size.height + sd.y));
            }
        }

        return {
            start: () => {
                worldPosList.length = 0;
                sizeList.length = 0;
                localPosList.length = 0;
                anchorList.length = 0;
                rectList.length = 0;

                rectList.tempRect = boundsToRect(self.getBounds());

                self._processing = true;

                for (let i = 0, l = self.target.length; i < l; ++i) {
                    let node = self.target[i];
                    worldPosList.push( NodeUtils.getWorldPosition(node) );
                    localPosList.push(node.position);
                    sizeList.push(node.getContentSize());
                    anchorList.push(node.getAnchorPoint());
                    rectList.push( NodeUtils.getWorldBounds(node) );
                }
            },

            update: (dx, dy, event, type) => {
                let delta = new cc.Vec2(dx, dy);

                if (type === RectToolType.Anchor) {
                    handleAnchorPoint(delta.clone());
                }
                else if (type === RectToolType.Center) {
                    handleCenterRect(delta.clone());
                }
                else {
                    let keepAspectRatio = event ? event.shiftKey : false;
                    let keepCenter = event ? event.altKey : false;

                    if (self.target.length > 1) {
                        handleMutiSizePoint(type, delta.clone(), keepAspectRatio, keepCenter);
                    }
                    else {
                        handleSizePoint(type, delta.clone(), keepAspectRatio, keepCenter);
                    }
                }
            },

            end: (updated, event, type) => {

                if (updated) {
                    if (type < RectToolType.Center) {
                        // this.adjustValue(self.target, ['x', 'y']);
                        this.adjustValue(node, ['anchorX', 'anchorY']);
                    }
                    else if (type === RectToolType.Anchor) {
                        let node = self.target[0];
                        this.adjustValue(node, ['x', 'y']);

                        // ajust anchor point according to width and height, ensure pixel change is smalled than 1
                        let length = Math.max(node.width, node.height);
                        let diff = (length | 0).toString().length;
                        this.adjustValue(node, ['anchorX', 'anchorY'], this.defaultMinDifference() + diff);
                    }
                    else {
                        this.adjustValue(self.target, ['x', 'y', 'width', 'height']);
                    }
                }

                self._processing = false;
            }
        };
    }

    onCreateRoot () {
        this._tool = Tools.rectTool( this._root, this.createMoveCallbacks() );
    }

    formatBounds (bounds) {
        return [
            this.worldToPixel(bounds[0]),
            this.worldToPixel(bounds[1]),
            this.worldToPixel(bounds[2]),
            this.worldToPixel(bounds[3])
        ];
    }

    getBounds (flipX, flipY) {
        let minX = Number.MAX_VALUE,
            maxX = -Number.MAX_VALUE,
            minY = Number.MAX_VALUE,
            maxY = -Number.MAX_VALUE;

        function calcBounds (p) {
            if (p.x > maxX) maxX = p.x;
            if (p.x < minX) minX = p.x;

            if (p.y > maxY) maxY = p.y;
            if (p.y < minY) minY = p.y;
        }

        this.target.forEach((node) => {
            let bs = NodeUtils.getWorldOrientedBounds(node);

            calcBounds(bs[0]);
            calcBounds(bs[1]);
            calcBounds(bs[2]);
            calcBounds(bs[3]);
        });

        let temp;
        if (flipX) {
            temp = minX;
            minX = maxX;
            maxX = temp;
        }

        if (flipY) {
            temp = minY;
            minY = maxY;
            maxY = temp;
        }

        // bl, tl, tr, br
        return [cc.v2(minX, maxY), cc.v2(minX, minY), cc.v2(maxX, minY), cc.v2(maxX, maxY)];
    }

    onKeyDown (event) {
        if (!this.target) {
            return;
        }

        let keyCode = Editor.KeyCode(event.which);

        if (keyCode !== 'left' &&
            keyCode !== 'right' &&
            keyCode !== 'up' &&
            keyCode !== 'down') {
            return;
        }

        let offset = event.shiftKey ? 10 : 1;
        let dif = cc.v2();
        if (keyCode === 'left') {
            dif.x = offset * -1;
        }
        else if (keyCode === 'right') {
            dif.x = offset;
        }
        else if (keyCode === 'up') {
            dif.y = offset;
        }
        else if (keyCode === 'down') {
            dif.y = offset * -1;
        }

        this.recordChanges();
        
        this.topNodes.forEach(node => {
            node.position = node.position.add(dif);
        });

        this._view.repaintHost();
    }

    onKeyUp (event) {
        if (!this.target) {
            return;
        }

        let keyCode = Editor.KeyCode(event.which);

        if (keyCode !== 'left' &&
            keyCode !== 'right' &&
            keyCode !== 'up' &&
            keyCode !== 'down') {
            return;
        }

        this.commitChanges();
    }

    visible () {
        return true;
    }

    dirty () {
        return true;
    }

    onUpdate () {
        let length = this.target.length;
        let bounds = [];

        if (length === 1) {
            let node = this.target[0];
            bounds = NodeUtils.getWorldOrientedBounds(node);
            bounds = this.formatBounds(bounds);

            let worldPosition = NodeUtils.getWorldPosition(node);
            let parentWorldPosition = NodeUtils.getWorldPosition(node.parent);

            bounds.anchor = this.worldToPixel( worldPosition );
            bounds.origin = this.worldToPixel( parentWorldPosition );
            bounds.localPosition = snapPixelWihVec2( node.getPosition() );
            if (node.getContentSize) bounds.localSize = node.getContentSize();
            else bounds.localSize = cc.size();
        }
        else {
            let flipX = false;
            let flipY = false;

            if (this._processing) {
                flipX = this._rect.width < 0;
                flipY = this._rect.height < 0;
            }

            bounds = this.getBounds(flipX, flipY);
            bounds = this.formatBounds(bounds);
        }

        this._tool.setBounds(bounds);
    }
}

module.exports = RectGizmo;
