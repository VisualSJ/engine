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

let tempVec2 = cc.v2();
let tempVec3 = cc.v3();
const { vec3, vec2, mat4}  = cc.vmath;
let tempMat4 = mat4.create();
let tempQuat = cc.quat();

function boundsToRect(bounds) {
    return cc.rect(
        bounds[1].x,
        bounds[1].y,
        bounds[3].x - bounds[1].x,
        bounds[3].y - bounds[1].y
    );
}
class RectGizmo extends TransformGizmo {
    init() {
        this._worldPosList = [];
        this._localPosList = [];
        this._sizeList = [];
        this._anchorList = [];
        this._rectList = [];
        this._validTarget = [];
        this._tempRect = cc.rect();
        this._editRect = cc.rect();
        this._altKey = false;

        this.createController();
    }

    layer() {
        return 'foreground';
    }

    createController() {
        this._controller = new RectController(this.getGizmoRoot());
        this._controller.editable = true;
        this._controller.setColor(new cc.Color(0, 153, 255));
        this._controller.setEditCtrlColor(new cc.Color(0, 153, 255));

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
        // 可能有不含uitransfromcomponent的node被选中，剔除掉
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
                this._rectList.push(NodeUtils.getWorldBounds(node));
            }
        }

        let validNode = this._validTarget.map((target) => { return target.node; });
        let bounds = this.getBounds(false, false, validNode);
        this._tempRect = boundsToRect(bounds);
    }

    onControllerMouseMove() {
        this.updateDataFromController();
        // update scaleController transform
        this.updateControllerTransform();
    }

    onControllerMouseUp() {
        if (this._controller.updated) {
            this.onControlEnd('position');
        }
    }

    onGizmoKeyDown(event) {
        this._altKey = event.altKey;
    }

    onGizmoKeyUp(event) {
        this._altKey = event.altKey;
    }

    handleAreaMove(delta) {
        for (let i = 0; i < this._validTarget.length; i++) {
            let node = this._validTarget[i].node;
            let localPos = this._localPosList[i];

            let posDelta = delta.clone();
            if (node.parent) {
                node.parent.getWorldMatrix(tempMat4);
                mat4.invert(tempMat4, tempMat4);
                tempMat4.m12 = tempMat4.m13 = 0;
                vec3.transformMat4(posDelta, posDelta, tempMat4);
            }
            NodeUtils.makeVec3InPrecision(posDelta, 3);
            posDelta.z = 0;
            node.setPosition(localPos.add(posDelta));
            Utils.onNodeChanged(node);
        }
    }

    handleAnchorMove(delta) {
        // 不处理多UI选择的anchor编辑
        if (this._validTarget.length > 1) {
            return;
        }

        let uiTransComp = this._validTarget[0];
        let node = uiTransComp.node;
        let size = this._sizeList[0];
        let oldAnchor = this._anchorList[0];
        let worldPos = this._worldPosList[0];

        let posDelta = delta.clone();
        NodeUtils.makeVec3InPrecision(posDelta, 3);
        node.setWorldPosition(worldPos.add(posDelta));

        // 转换到局部坐标
        node.getWorldMatrix(tempMat4);
        mat4.invert(tempMat4, tempMat4);
        tempMat4.m12 = tempMat4.m13 = 0;
        vec3.transformMat4(posDelta, posDelta, tempMat4);

        tempVec2.x = posDelta.x / size.width;
        tempVec2.y = posDelta.y / size.height;

        tempVec2.addSelf(oldAnchor);
        uiTransComp.anchorPoint = tempVec2;

        Utils.onNodeChanged(node);
    }

    modifyPosDeltaWithAnchor(type, posDelta, sizeDelta, anchor, keepCenter) {
        if (type === HandleType.Right ||
            type === HandleType.TopRight ||
            type === HandleType.BottomRight) {
            if (keepCenter) {
                sizeDelta.x /= (1 - anchor.x);
            }
            posDelta.x = sizeDelta.x * anchor.x;
        } else {
            if (keepCenter) {
                sizeDelta.x /= anchor.x;
            }
            posDelta.x = -sizeDelta.x * (1 - anchor.x);
        }

        if (type === HandleType.Bottom ||
            type === HandleType.BottomRight ||
            type === HandleType.BottomLeft) {
            if (keepCenter) {
                sizeDelta.y /= anchor.y;
            }
            posDelta.y = -sizeDelta.y * (1 - anchor.y);
        } else {
            if (keepCenter) {
                sizeDelta.y /= (1 - anchor.y);
            }
            posDelta.y = sizeDelta.y * anchor.y;
        }
    }

    handleOneTargetSize(type, delta, keepCenter) {
        let size = this._sizeList[0];

        // delta中的符号做为size增加的方向
        let posDelta = delta.clone();
        let sizeDelta = cc.v2(delta.x, delta.y);
        let localPos = this._localPosList[0];
        let uiTransComp = this._validTarget[0];
        let node = uiTransComp.node;
        let anchor = this._anchorList[0];

        sizeDelta.x = EditorMath.toPrecision(sizeDelta.x, 3);
        sizeDelta.y = EditorMath.toPrecision(sizeDelta.y, 3);
        this.modifyPosDeltaWithAnchor(type, posDelta, sizeDelta, anchor, keepCenter);
        // 转换到基于父结点的局部坐标系
        if (node.parent) {
            node.parent.getWorldMatrix(tempMat4);
            mat4.invert(tempMat4, tempMat4);
            tempMat4.m12 = tempMat4.m13 = 0;
            vec3.transformMat4(posDelta, posDelta, tempMat4);
        }

        if (!keepCenter) {
        // 乘上当前结点的旋转
        let localRot = cc.quat();
        node.getRotation(localRot);
        vec3.transformQuat(posDelta, posDelta, localRot);
        posDelta.z = 0;
        node.setPosition(localPos.add(posDelta));
        }

        // contenSize 受到scale 影响,
        let worldScale = cc.v3();
        node.getWorldScale(worldScale);
        sizeDelta.x = sizeDelta.x / worldScale.x;
        sizeDelta.y = sizeDelta.y / worldScale.y;

        let width = size.width + sizeDelta.x;
        let height = size.height + sizeDelta.y;
        uiTransComp.contentSize = cc.size(width, height);
        Utils.onNodeChanged(node);
    }

    handleMultiTargetSize(type, delta) {
        let oriRect = this._tempRect;

        let sizeDelta = cc.v2(delta.x, delta.y);
        let posDelta = delta.clone();
        let anchor = cc.v2(0, 0);

        sizeDelta.x = EditorMath.toPrecision(sizeDelta.x, 3);
        sizeDelta.y = EditorMath.toPrecision(sizeDelta.y, 3);
        this.modifyPosDeltaWithAnchor(type, posDelta, sizeDelta, anchor);

        let rect = oriRect.clone();
        rect.x = oriRect.x + posDelta.x;
        rect.y = oriRect.y + posDelta.y;
        rect.width = oriRect.width + sizeDelta.x;
        rect.height = oriRect.height + sizeDelta.y;

        this._editRect = rect;

        for (let i = 0, l = this._validTarget.length; i < l; i++) {
            let uiTransComp = this._validTarget[i];
            let node = uiTransComp.node;
            let worldPos = this._worldPosList[i];

            let xPercent = (worldPos.x - oriRect.x) / oriRect.width;
            let yPercent = (worldPos.y - oriRect.y) / oriRect.height;

            let newPos = cc.v3(rect.x + xPercent * rect.width,
                               rect.y + yPercent * rect.height,
                               worldPos.z);
            node.setWorldPosition(newPos);

            let r = this._rectList[i];
            let wPercent = r.width / oriRect.width;
            let hPercent = r.height / oriRect.height;

            let size = this._sizeList[i];
            let sd = sizeDelta.clone();
            sd.x = sd.x * wPercent;
            sd.y = sd.y * hPercent;

            // contenSize 受到scale 影响,
            let worldScale = cc.v3();
            node.getWorldScale(worldScale);
            sd.x = sd.x / worldScale.x;
            sd.y = sd.y / worldScale.y;

            uiTransComp.contentSize = cc.size(size.width + sd.x, size.height + sd.y);

            Utils.onNodeChanged(node);
        }
    }

    getBounds(flipX, flipY, nodes) {
        let minX = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;

        function calcBounds(p) {
            if (p.x > maxX) { maxX = p.x; }
            if (p.x < minX) { minX = p.x; }

            if (p.y > maxY) { maxY = p.y; }
            if (p.y < minY) { minY = p.y; }
        }

        nodes.forEach((node) => {
            let uiTransComp = node.getComponent(cc.UITransformComponent);
            if (uiTransComp) {
                let ob = NodeUtils.getWorldOrientedBounds(node);

                calcBounds(ob[0]);
                calcBounds(ob[1]);
                calcBounds(ob[2]);
                calcBounds(ob[3]);
            }
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

        // tl, bl, br, tr
        return [cc.v2(minX, maxY), cc.v2(minX, minY), cc.v2(maxX, minY), cc.v2(maxX, maxY)];
    }

    updateDataFromController() {
        if (this._controller.updated) {
            this.onControlUpdate('position');

            let handleType = this._controller.getCurHandleType();
            let deltaSize = this._controller.getDeltaSize();
            if (handleType === HandleType.Area) {
                this.handleAreaMove(deltaSize);
            } else if (handleType === HandleType.Anchor) {
                this.handleAnchorMove(deltaSize);
            } else {
                let keepCenter = this._altKey;
                if (this.target.length > 1) {
                    this.handleMultiTargetSize(handleType, deltaSize, keepCenter);
                } else {
                    this.handleOneTargetSize(handleType, deltaSize, keepCenter);
                }
            }

        }
    }

    updateControllerTransform() {
        this.updateControllerData();
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        this._controller.checkEdit();

        let length = this.target.length;
        if (length === 1) {
            let node = this.target[0];

            let worldPos = NodeUtils.getWorldPosition3D(node);
            let worldRot = NodeUtils.getWorldRotation3D(node);
            let worldScale = NodeUtils.getWorldScale3D(node);

            this._controller.setPosition(worldPos);
            this._controller.setRotation(worldRot);
            this._controller.setScale(worldScale);

            let uiTransComp = node.getComponent(cc.UITransformComponent);
            if (uiTransComp) {
                let size = uiTransComp.contentSize;
                let anchor = uiTransComp.anchorPoint;
                let center = cc.v3();
                center.x = (0.5 - anchor.x) * size.width;
                center.y = (0.5 - anchor.y) * size.height;
                this._controller.updateSize(center, cc.v2(size.width, size.height));
            } else {
                this._controller.hide();
            }
        } else {
            let flipX = false;
            let flipY = false;

            let bounds = this.getBounds(flipX, flipY, this.nodes);
            let rect = boundsToRect(bounds);
            let rectCenter = cc.v3(rect.x + rect.width / 2, rect.y + rect.height / 2, 0);
            this._controller.setPosition(rectCenter);
            this._controller.setRotation(cc.quat());
            this._controller.setScale(cc.v3(1, 1, 1));
            this._controller.updateSize(cc.v3(), cc.v2(rect.width, rect.height));
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
