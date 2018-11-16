'use strict';
const NodeUtils = Editor.require('scene://utils/node');
let PositionController = require('../controller/position-controller');

class MoveGizmo extends Editor.Gizmo {
    init () 
    {
        this.nodesWorldPosList = [];
    }

    layer () {
        return 'foreground';
    }

    onCreateRoot () {

    }

    onCreateController()
    {
        let rootNode = _Scene.view.foregroundNode.getChildByName('gizmoRoot');
        this._controller = new PositionController(this._root, this._view, rootNode);

        this._controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        this._controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        this._controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
    }

    visible () {
        return true;
    }

    dirty () {
        return true;
    }

    onControllerMouseDown()
    {
        this.nodesWorldPosList.length = 0;
        let topNodes = this.topNodes;
        for (let i = 0; i < topNodes.length; ++i) {
            this.nodesWorldPosList.push( NodeUtils.getWorldPosition3D(topNodes[i]) );
        }
    }

    onControllerMouseMove(/*event*/)
    {      
    }

    onControllerMouseUp()
    {
        if (this._controller.updated)
        {
            this.commitChanges();
        }
    }

    onGizmoKeyDown(event){
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

        let curPos = cc.v3();
        this.topNodes.forEach(node => {
            node.getPosition(curPos);
            curPos = curPos.add(dif);
            node.setPosition(curPos.x, curPos.y, curPos.z);
            
        });

        this._view.repaintHost();
    }

    onGizmoKeyUp(event){
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

    onKeyDown (/*event*/) {

    }

    onKeyUp (/*event*/) {

    }

    onUpdate () {
        if (this._controller.updated)
        {
            this.recordChanges();

            let deltaPos = this._controller.getDeltaPosition();
            let topNodes = this.topNodes;
            let curNodePos;
            for (let i = 0; i < this.nodesWorldPosList.length; ++i) 
            {
                curNodePos = this.nodesWorldPosList[i].add(deltaPos);
                NodeUtils.setWorldPosition3D(topNodes[i], curNodePos);
            }
            
            this._view.repaintHost();
        }


        // update controller transform
        this.updateControllerTransform();
    }

    // 由于inspect之类的地方也会修改位置旋转等，所以暂时在update里调用可以确保位置一直是正确的，更好的
    // 作法应该是在各种引起Node的Transform的变化的地方发送一个消息来通知Gizmo的Trasform更新。
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
    
        if ( this._view.coordinate !== 'global' ) {
            worldRot = NodeUtils.getWorldRotation3D(node);
        }

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);   
    }
}

module.exports = MoveGizmo;
