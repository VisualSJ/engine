'use strict';

const Tools = require('./tools');
const NodeUtils = Editor.require('scene://utils/node');
const AnimUtils = Editor.require('scene://utils/animation');

class RotateGizmo extends Editor.Gizmo {
    init () {
        this._rotating = false;
    }

    layer () {
        return 'foreground';
    }

    onCreateRoot () {
        let rotList = [], offsetList = [];
        let center;

        let updated = false;

        this._tool = Tools.rotationTool( this._root, {
            start: () => {
                this._rotating = true;
                rotList = [];

                let topNodes = this.topNodes;
                for (let i = 0; i < topNodes.length; ++i) {
                    rotList.push(topNodes[i].angle);
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

            update: (delta) => {
                if (delta === 0) {
                    return;
                }

                updated = true;

                this.target.forEach( node => {
                    _Scene.Undo.recordNode( node.uuid );
                });

                let i, rot, deltaInt;

                deltaInt = Math.floor(delta);

                let topNodes = this.topNodes;

                if (this._view.pivot === 'center') {
                    for (i = 0; i < rotList.length; ++i) {
                        rot = Editor.Math.deg180(rotList[i] + deltaInt);
                        rot = Math.floor(rot);

                        let offset = offsetList[i].rotate(Editor.Math.deg2rad(deltaInt));
                        NodeUtils.setScenePosition( topNodes[i], center.add(offset) );
                        topNodes[i].angle = rot;

                        this._tool.rotation = -delta;
                    }
                }
                else {
                    for (i = 0; i < rotList.length; ++i) {
                        rot = Editor.Math.deg180(rotList[i] + deltaInt);
                        rot = Math.floor(rot);
                        topNodes[i].angle = rot;
                    }
                }

                this._view.repaintHost();
            },

            end: () => {
                if (this._view.pivot === 'center') {
                    let scenePos = Editor.GizmosUtils.getCenter(this.target);
                    let screenPos = this.sceneToPixel(scenePos);

                    this._tool.rotation = 0;
                    this._tool.position = screenPos;

                    this._tool.translate(this._tool.position.x, this._tool.position.y)
                        .rotate(this._tool.rotation, 0.0, 0.0)
                        ;
                }
                this._rotating = false;

                if (updated) {
                    AnimUtils.recordNodeChanged(this.target);
                    _Scene.Undo.commit();
                }

                updated = false;
            }
        });
    }

    onKeyDown (event) {
        if (!this.target) {
            return;
        }

        this._rotating = true;

        let keyCode = Editor.KeyCode(event.which);

        if (keyCode !== 'left' &&
            keyCode !== 'right' &&
            keyCode !== 'up' &&
            keyCode !== 'down') {
            return;
        }

        let delta = event.shiftKey ? 10 : 1;// right and down
        if (keyCode === 'right' || keyCode === 'down') {
            delta *= -1;
        }

        if (!this.keydownDelta) {
            this.keydownDelta = 0;
        }

        this.keydownDelta -= delta;

        this.recordChanges();

        let topNodes = this.topNodes;

        if (this._view.pivot === 'center') {
            let center = Editor.GizmosUtils.getCenter(this.target);

            for (let i = 0; i < topNodes.length; ++i) {
                let node = topNodes[i];

                let rot = Editor.Math.deg180(node.angle + delta);
                rot = Math.floor(rot);

                let offset = NodeUtils.getScenePosition(node).sub(center);
                offset = offset.rotate(Editor.Math.deg2rad(-delta));
                NodeUtils.setScenePosition( node, center.add(offset) );
                node.rotation = rot;

                this._tool.rotation = this.keydownDelta;
            }
        }
        else {
            for (let i = 0; i < topNodes.length; ++i) {
                topNodes[i].angle += delta;
            }
        }

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

        if (this._view.pivot === 'center') {
            let scenePos = Editor.GizmosUtils.getCenter(this.target);
            let screenPos = this.sceneToPixel(scenePos);

            let tool = this._tool;
            tool.rotation = 0;
            tool.position = screenPos;

            tool.translate(tool.position.x, tool.position.y)
                .rotate(tool.rotation, 0.0, 0.0)
                ;

            this._view.repaintHost();
        }

        this.keydownDelta = null;
        this._rotating = false;

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
            if (this._rotating) {
                this._tool.rotate(this._tool.rotation, 0.0, 0.0);
                return;
            }

            scenePos = Editor.GizmosUtils.getCenter(this.target);
            screenPos = this.sceneToPixel(scenePos);
        }
        else {
            scenePos = NodeUtils.getScenePosition(node);
            screenPos = this.sceneToPixel(scenePos);
            rotation = -NodeUtils.getSceneRotation(node);
        }

        this._tool.position = screenPos;
        this._tool.rotation = rotation;

        this._tool
            .translate(this._tool.position.x, this._tool.position.y)
            .rotate(this._tool.rotation, 0.0, 0.0)
            ;
    }
}

module.exports = RotateGizmo;
