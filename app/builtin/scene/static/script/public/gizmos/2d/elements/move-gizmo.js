'use strict';

const Tools = require('./tools');
const NodeUtils = Editor.require('scene://utils/node');

class MoveGizmo extends Editor.Gizmo {
    init () {
    }

    layer () {
        return 'foreground';
    }

    onCreateMoveCallbacks () {
        let worldPosList = [];

        return {
            start: () => {
                worldPosList.length = 0;
                let topNodes = this.topNodes;
                for (let i = 0; i < topNodes.length; ++i) {
                    worldPosList.push( NodeUtils.getWorldPosition(topNodes[i]) );
                }
            },

            update: (dx, dy) => {
                let delta = new cc.Vec2(dx, dy);

                let topNodes = this.topNodes;
                for (let i = 0; i < worldPosList.length; ++i) {
                    NodeUtils.setWorldPosition(topNodes[i], worldPosList[i].add(delta));
                }

                this.adjustValue(topNodes, ['x', 'y']);
            }
        };
    }

    onCreateRoot () {
        this._tool = Tools.positionTool( this._root, this.createMoveCallbacks() );
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
            rotation = 0.0;

            if ( this._view.coordinate !== 'global' ) {
                rotation = -NodeUtils.getSceneRotation(node);
            }
        }

        this._tool.position = screenPos;
        this._tool.rotation = rotation;

        this._tool
            .translate(this._tool.position.x, this._tool.position.y)
            .rotate(this._tool.rotation, 0.0, 0.0)
            ;
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
            dif.x = -offset;
        }
        else if (keyCode === 'right') {
            dif.x = offset;
        }
        else if (keyCode === 'up') {
            dif.y = offset;
        }
        else if (keyCode === 'down') {
            dif.y = -offset;
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
}

module.exports = MoveGizmo;
