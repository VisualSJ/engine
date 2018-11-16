'use strict';

const NodeUtils = Editor.require('scene://utils/node');
let PositionController = require('../controller/position-controller');

class MovePoints extends Editor.Gizmo {
    init () {
    }

    layer () {
        return 'foreground';
    }
    
    onCreateRoot () {
        //this._tool = Tools.positionTool( this._root, this.createMoveCallbacks() );
        this.testPositions = [];
        this._positionCtrl = [];

        for (let i = 0; i < 5; i++)
        {
            this.testPositions[i] = new cc.Vec2(i * 50, 100)
            this._positionCtrl[i] = new PositionController(this._root, this._view, 
                this.testPositions[i]);

            this._positionCtrl[i].onControllerMouseMove = this.onControllerMove.bind(this);
            this._positionCtrl[i].onControllerMouseUp = this.onControllerMouseUp.bind(this);
        }
    }

    visible () {
        return true;
    }

    dirty () {
        return true;
    }

    onUpdate () {
     
        for (let i = 0; i < 5; i++)
        {
            this.testPositions[i] = this._positionCtrl[i].getPosition();
        }
        //let scenePos = this._positionCtrl.getPosition();

        //NodeUtils.setWorldPosition(this.node, scenePos);

        //this.adjustValue(this.node, ['x', 'y']);
    }

    onControllerMove(event)
    {      
        //this.recordChanges();

        // NodeUtils.setWorldPosition(this.node, newPos);

        // this.adjustValue(this.node, ['x', 'y']);

    }

    onControllerMouseUp()
    {
        for (let i = 0; i < 5; i++)
        {
            if (this._positionCtrl[i].isUpdated())
            {
                this.commitChanges();
            }
        }
    }

}

module.exports = MovePoints;
