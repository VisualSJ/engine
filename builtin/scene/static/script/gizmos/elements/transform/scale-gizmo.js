'use strict';

const NodeUtils = Editor.require('scene://utils/node');
let ScaleController = require('../controller/scale-controller');

class ScaleGizmo extends Editor.Gizmo {
    init () {
        this._localScaleList = [];
        this._offsetList = [];
        this._center = cc.v2(0,0);
    }

    layer () {
        return 'foreground';
    }

    onCreateRoot () {
        //this._tool = Tools.scaleTool( this._root, this.createMoveCallbacks() );

    }

    onCreateController()
    {
        let rootNode = _Scene.view.foregroundNode.getChildByName('gizmoRoot');
        this._controller = new ScaleController(this._root, this._view, rootNode);

        this._controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        this._controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        this._controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
    }

    onControllerMouseDown()
    {
        this._localScaleList = [];

        let topNodes = this.topNodes;
        for (let i = 0; i < topNodes.length; ++i) {
            let node = topNodes[i];
            let scale = cc.v3();
            node.getScale(scale);
            this._localScaleList.push(scale);
        }

        if (this._view.pivot === 'center') {
            this._center = Editor.GizmosUtils.getCenterWorldPos3D(this.target);
            this._offsetList.length = 0;
            for (let i = 0; i < topNodes.length; ++i) {
                let nodeWorldPos = NodeUtils.getWorldPosition3D(topNodes[i]);
                this._offsetList.push(nodeWorldPos.sub(this._center));
            }
        }
    }

    onControllerMouseMove()
    {

    }

    onControllerMouseUp()
    {
        if (this._controller.updated)
        {
            this.commitChanges();
        }
    }

    onKeyDown (event) {
  
    }

    onKeyUp (event) {

    }

    onGizmoKeyDown(event)
    {
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

        let curScale = cc.v3();
        this.topNodes.forEach(function (node) {
            node.getScale(curScale);

            curScale.x = curScale.x + dif.x;
            curScale.y = curScale.y + dif.y;

            this.setScaleWithPrecision(node, curScale, 3);
        }.bind(this));

        this._view.repaintHost();
    }

    onGizmoKeyUp(event)
    {
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

    setScaleWithPrecision(node, newScale, precision)
    {
        newScale = NodeUtils.makeVec3InPrecision(newScale, precision);
        node.setScale(newScale.x, newScale.y, newScale.z);
    }

    onUpdate () {

        if (this._controller.updated)
        {
            this.recordChanges();
            
            let i;
            let scaleDelta = this._controller.getDeltaScale();
            let scale = cc.v3(1.0 + scaleDelta.x, 1.0 + scaleDelta.y, 1.0 + scaleDelta.z);
            let newScale = cc.v3();
            let topNodes = this.topNodes;

            if (this._view.pivot === 'center') {
                let curNodePos;
                for (i = 0; i < this._localScaleList.length; ++i) {

                    newScale.x = this._localScaleList[i].x * scale.x;
                    newScale.y = this._localScaleList[i].y * scale.y;
                    newScale.z = this._localScaleList[i].z * scale.z;

                    this.setScaleWithPrecision(topNodes[i], newScale, 3);

                    let offset = cc.v3(
                        this._offsetList[i].x * scale.x,
                        this._offsetList[i].y * scale.y,
                        this._offsetList[i].z * scale.z
                    );

                    curNodePos = this._center.add(offset);
                    NodeUtils.setWorldPosition3D(topNodes[i], curNodePos);                    
                }
            }
            else {
                for (i = 0; i < this._localScaleList.length; ++i) {
                    newScale.x = this._localScaleList[i].x * scale.x;
                    newScale.y = this._localScaleList[i].y * scale.y;
                    newScale.z = this._localScaleList[i].z * scale.z;

                    this.setScaleWithPrecision(topNodes[i], newScale, 3);
                }
            }
        }

        // update scaleController transform
        this.updateControllerTransform();
    }

    updateControllerTransform()
    {
        let node = this.node;
        let worldPos;
        let worldRot = cc.quat(0,0,0,1);

        if (this._view.pivot === 'center') {
            worldPos = Editor.GizmosUtils.getCenterWorldPos3D(this.target);
        }
        else {
            worldPos = NodeUtils.getWorldPosition3D(node);

        }

        worldRot = NodeUtils.getWorldRotation3D(node);

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);
    }

}

module.exports = ScaleGizmo;
