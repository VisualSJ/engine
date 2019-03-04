'use strict';

const Utils = require('../../../utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const EditorMath = External.EditorMath;
const GizmoUtils = Utils.GizmoUtils;
let TransformGizmo = require('./transform-gizmo');
let RectController = require('../controller/rectangle-controller');
const TransformToolData = require('../../../utils/transform-tool-data');

const HandleType = RectController.HandleType;
let tempMat4 = cc.vmath.mat4.create();
let tempVec2 = new cc.v2();
const vec3 = cc.vmath.vec3;

class RectGizmo extends TransformGizmo {
    init() {
        this._localScaleList = [];
        this._offsetList = [];
        this._center = cc.v2(0, 0);

        this._worldPosList = [];
        this._localPosList = [];
        this._sizeList = [];
        this._anchorList = [];
        this._rectList = [];
        this._validTarget = [];

        this.createController();
    }

    layer() {
        return 'foreground';
    }

    createController() {
        this._controller = new RectController(this.getGizmoRoot());
        this._controller.editable = true;

        this._controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        this._controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        this._controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
    }

    onControllerMouseDown() {
        this._worldPosList.length = 0;
        this._localPosList.length = 0;
        this._sizeList.length = 0;
        this._anchorList.length = 0;
        this._rectList.length = 0;
        // 可能有不含uitransfromcomponent的node被选中
        this._validTarget.length = 0;

        for (let i = 0; i < this.target.length; i++) {
            let node = this.target[i];
            let uiTransComp = node.getComponent(cc.UITransformComponent);
            if (uiTransComp) {
                this._validTarget.push(uiTransComp);
                this._worldPosList.push(NodeUtils.getWorldPosition3D(node));
                this._localPosList.push(node.getPosition());
                this._sizeList.push(uiTransComp.contentSize.clone());
                this._anchorList.push(uiTransComp.anchorPoint.clone());
            }
        }
    }

    onControllerMouseMove() {
        this.updateDataFromController();
        // update scaleController transform
        this.updateControllerTransform();
    }

    onControllerMouseUp() {
        if (this._controller.updated) {
            this.commitChanges();
        }
    }

    handleAreaMove(delta) {
        for (let i = 0; i < this._validTarget.length; i++) {
            let node = this._validTarget[i].node;
            let worldPos = this._worldPosList[i];

            NodeUtils.makeVec3InPrecision(delta, 3);
            node.setWorldPosition(worldPos.add(delta));
            Utils.broadcastMessage('scene:node-changed', node);
        }
    }

    handleAnchorMove(delta) {
        let uiTransComp = this._validTarget[0];
        let node = uiTransComp.node;
        let size = this._sizeList[0];
        let oldAnchor = this._anchorList[0];
        let worldPos = this._worldPosList[0];

        node.setWorldPosition(worldPos.add(delta));

        tempVec2.x = delta.x / size.width;
        tempVec2.y = delta.y / size.height;

        tempVec2.addSelf(oldAnchor);
        uiTransComp.anchorPoint = tempVec2;

        Utils.broadcastMessage('scene:node-changed', node);
    }

    modifyPosDeltaWithAnchor(type, posDelta, sizeDelta, anchor) {
        if (type === HandleType.Right ||
            type === HandleType.TopRight ||
            type === HandleType.BottomRight) {
            posDelta.x = sizeDelta.x * anchor.x;
        } else {
            posDelta.x = -sizeDelta.x * (1 - anchor.x);
        }

        if (type === HandleType.Bottom ||
            type === HandleType.BottomRight ||
            type === HandleType.BottomLeft) {
            posDelta.y = -sizeDelta.y * anchor.y;
        } else {
            posDelta.y = sizeDelta.y * (1 - anchor.y);
        }
    }

    handleOneTarget(type, delta) {
        let size = this._sizeList[0];

        // delta中的符号做为size增加的方向
        let sizeDelta = cc.v2(delta.x, delta.y);
        let localPos = this._localPosList[0];
        let worldPos = this._worldPosList[0];
        let uiTransComp = this._validTarget[0];
        let node = uiTransComp.node;
        let anchor = this._anchorList[0];

        this.modifyPosDeltaWithAnchor(type, delta, sizeDelta, anchor);
        NodeUtils.makeVec3InPrecision(delta, 3);
        node.setWorldPosition(worldPos.add(delta));
        let width = EditorMath.toPrecision(size.width + sizeDelta.x, 3);
        let height = EditorMath.toPrecision(size.height + sizeDelta.y, 3);
        uiTransComp.contentSize = cc.size(width, height);
        Utils.broadcastMessage('scene:node-changed', node);
    }

    updateDataFromController() {
        if (this._controller.updated) {
            this.recordChanges();

            let handleType = this._controller.getCurHandleType();
            let deltaSize = this._controller.getDeltaSize();
            if (handleType === HandleType.Area) {
                this.handleAreaMove(deltaSize);
            } else if (handleType === HandleType.Anchor) {
                this.handleAnchorMove(deltaSize);
            } else {
                this.handleOneTarget(handleType, deltaSize);
            }

        }
    }

    updateControllerTransform() {
        let node = this.node;
        let worldPos = NodeUtils.getWorldPosition3D(node);
        let worldRot = NodeUtils.getWorldRotation3D(node);

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);

        this.updateControllerData();
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        this._controller.checkEdit();
        for (let i = 0; i < this.target.length; i++) {
            let node = this.target[i];
            let uiTransComp = node.getComponent(cc.UITransformComponent);
            if (uiTransComp) {
                let size = uiTransComp.contentSize;
                let anchor = uiTransComp.anchorPoint;
                let center = cc.v3();
                center.x = (0.5 - anchor.x) * size.width;
                center.y = (0.5 - anchor.y) * size.height;
                this._controller.updateSize(center, cc.v2(size.width, size.height));
            }
        }
    }

    onSubRegisterListeners(nodes) {
        this.registerListener(nodes, 'anchor-changed', this.onNodeTransformChanged);
        this.registerListener(nodes, 'size-changed', this.onNodeTransformChanged);
    }

    onSubUnregisterListeners(nodes) {
        this.unregisterListener(nodes, 'anchor-changed', this.onNodeTransformChanged);
        this.unregisterListener(nodes, 'size-changed', this.onNodeTransformChanged);
    }
}

module.exports = RectGizmo;
