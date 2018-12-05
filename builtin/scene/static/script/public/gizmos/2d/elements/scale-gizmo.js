'use strict';

const Tools = require('./tools');
const NodeUtils = Editor.require('scene://utils/node');

class ScaleGizmo extends Editor.Gizmo {
    init () {
    }

    layer () {
        return 'foreground';
    }

    onCreateMoveCallbacks () {
        let localscaleList = [], offsetList = [];
        let center;

        return {
            start: () => {
                localscaleList = [];

                let topNodes = this.topNodes;
                for (let i = 0; i < topNodes.length; ++i) {
                    let node = topNodes[i];
                    localscaleList.push(cc.v2(node.scaleX, node.scaleY));
                }

                if (this._view.pivot === 'center') {
                    center = Editor.GizmosUtils.getCenter(this.target);
                    offsetList.length = 0;
                    for (let i = 0; i < topNodes.length; ++i) {
                        let scenePosition = NodeUtils.getScenePosition(topNodes[i]);
                        offsetList.push(scenePosition.sub(center));
                    }
                }
            },

            update: (dx, dy) => {
                let i;
                let scale = cc.v2(1.0 + dx, 1.0 + dy);
                let topNodes = this.topNodes;

                if (this._view.pivot === 'center') {
                    for (i = 0; i < localscaleList.length; ++i) {
                        topNodes[i].setScale(
                            localscaleList[i].x * scale.x, 
                            localscaleList[i].y * scale.y
                        );

                        let offset = cc.v2(
                            offsetList[i].x * scale.x,
                            offsetList[i].y * scale.y
                        );
                        NodeUtils.setScenePosition(topNodes[i], center.add(offset));

                    }

                    this.adjustValue(topNodes, ['x', 'y', 'scaleX', 'scaleY'], 2);
                }
                else {
                    for (i = 0; i < localscaleList.length; ++i) {
                        topNodes[i].setScale(
                            localscaleList[i].x * scale.x,
                            localscaleList[i].y * scale.y
                        );
                    }

                    this.adjustValue(topNodes, ['scaleX', 'scaleY'], 2);
                }
            }
        };
    }

    onCreateRoot () {
        this._tool = Tools.scaleTool( this._root, this.createMoveCallbacks() );
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

        let offset = event.shiftKey ? 1 : 0.1;
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

        this.topNodes.forEach(function (node) {
            node.scaleX = Editor.Math.toPrecision( node.scaleX + dif.x, 3 );
            node.scaleY = Editor.Math.toPrecision( node.scaleY + dif.y, 3 );
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
        let node = this.node;
        let scenePos, screenPos, rotation;

        if (this._view.pivot === 'center') {
            scenePos = Editor.GizmosUtils.getCenter(this.target);
            screenPos = this.sceneToPixel(scenePos);
            rotation = 0.0;
        }
        else {
            scenePos = NodeUtils.getScenePosition(node);
            screenPos = this.sceneToPixel(scenePos);
            rotation = NodeUtils.getSceneRotation(node);
        }

        this._tool.position = screenPos;
        this._tool.rotation = rotation;

        this._tool
            .translate(this._tool.position.x, this._tool.position.y)
            .rotate(this._tool.rotation, 0.0, 0.0)
            ;
    }
}

module.exports = ScaleGizmo;
