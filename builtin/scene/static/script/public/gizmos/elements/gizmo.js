'use strict';

let EPSILON = 1e-6;

function close(a, b) {
    return Math.abs(a - b) < EPSILON;
}

let _tempMatrix = cc.vmath.mat4.create();

class Gizmo {
    constructor(target) {
        this.hovering = false;
        this.selecting = false;
        this.editing = false;

        this._hidden = true;
        this._controller = null;

        this._dirty = true;

        this._lastMats = {};

        //this.createController();

        this.target = target;

        if (this.init) {
            this.init();
        }
    }

    get target() {
        return this._target;
    }

    set target(value) {
        if (this._target && this._target.length > 0) {
            this.unRegistTransformEvent(this.nodes);
        }

        this._target = value;
        if (this._target == null || this._target.length <= 0) {
            return;
        }

        this.registTransformEvent(this.nodes);

        if (this.onTargetsUpdate) {
            this.onTargetsUpdate();
        }
    }

    onTargetsUpdate() {
        if (this._controller && this.updateControllerTransform) {
            this.updateControllerTransform();
        }
    }

    // foreground, scene, background
    layer() {
        return 'scene';
    }

    getGizmoRoot() {
        if (!this._rootNode) {
            this._rootNode = Manager.foregroundNode.getChildByName('gizmoRoot');
        }

        return this._rootNode;
    }

    // 延迟controller的创建，可以在show gizmo时再创建
    ensureController() {
        if (this._controller) {
            return;
        }

        this.createController();
    }

    createController() {
        if (this.onCreateController) {
            this.onCreateController();
        }
    }

    recordChanges() {
        // this.nodes.forEach( node => {
        //     _Scene.Undo.recordNode( node.uuid );
        // });

        this._dirty = true;
    }

    commitChanges() {
        // AnimUtils.recordNodeChanged(this.nodes);
        // _Scene.Undo.commit();

        this._dirty = true;
    }

    //判断当前选中节点是否被锁定
    _checkLockStatus() {
        return this.node._objFlags & cc.Object.Flags.LockedInEditor;
    }

    targetValid() {
        let target = this.target;
        if (Array.isArray(target)) {
            target = target[0];
        }

        return target && target.isValid;
    }

    visible() {
        //return this.selecting || this.editing;
        return !this._hidden;
    }

    _nodeDirty(node) {
        node = node || this.node;
        node.getWorldMatrix(_tempMatrix);
        let dirty = false;

        let lastMat = this._lastMats[node.uuid];
        if (!lastMat) {
            this._lastMats[node.uuid] = lastMat = cc.vmath.mat4.create();
            dirty = true;
        } else if (!close(lastMat.a, _tempMatrix.a) ||
            !close(lastMat.b, _tempMatrix.b) ||
            !close(lastMat.c, _tempMatrix.c) ||
            !close(lastMat.d, _tempMatrix.d) ||
            !close(lastMat.tx, _tempMatrix.tx) ||
            !close(lastMat.ty, _tempMatrix.ty)) {
            dirty = true;
        }

        cc.vmath.mat4.copy(lastMat, _tempMatrix);
        return dirty;
    }

    dirty() {
        return this._nodeDirty() || this._dirty;
    }

    hide() {
        if (this._hidden) {
            return;
        }

        if (this._controller) {
            this._controller.hide();
        }

        this._hidden = true;
        this._dirty = true;
    }

    show() {
        if (!this._hidden) {
            return;
        }

        this.ensureController();

        if (this._controller) {
            this._controller.show();
            if (this.updateControllerTransform) {
                this.updateControllerTransform();
            }
        }

        this._hidden = false;
        this._dirty = true;
    }

    // 监听Node的transform改变事件
    registTransformEvent(nodes) {
        if (this.updateControllerTransform) {
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].on('transform-changed', this.updateControllerTransform, this);
            }
        }
    }

    unRegistTransformEvent(nodes) {
        if (this.updateControllerTransform) {
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].off('transform-changed', this.updateControllerTransform, this);
            }
        }
    }

    get node() {
        let target = this.target;
        if (Array.isArray(target)) {
            target = target[0];
        }

        if (cc.Node.isNode(target)) {
            return target;
        } else if (target instanceof cc.Component) {
            return target.node;
        }

        return null;
    }

    get nodes() {
        let nodes = [];
        let target = this.target;
        if (Array.isArray(target)) {
            for (let i = 0; i < target.length; ++i) {
                let t = target[i];
                if (cc.Node.isNode(t)) {
                    nodes.push(t);
                } else if (t instanceof cc.Component) {
                    nodes.push(t.node);
                }
            }
        } else {
            if (cc.Node.isNode(target)) {
                nodes.push(target);
            } else if (target instanceof cc.Component) {
                nodes.push(target.node);
            }
        }

        return nodes;
    }

    get topNodes() {
        let topNodes = this.target.filter((node) => {
            let parent = node.parent;
            while (parent) {
                if (this.target.indexOf(parent) !== -1) {
                    return false;
                }

                parent = parent.parent;
            }

            return true;
        });

        return topNodes;
    }

    get selecting() {
        return this._selecting;
    }

    set selecting(value) {
        this._dirty = value !== this._selecting;
        this._selecting = value;
    }

    get editing() {
        return this._editing;
    }

    set editing(value) {
        this._dirty = value !== this._editing;
        this._editing = value;
    }

    get hovering() {
        return this._hovering;
    }

    set hovering(value) {
        this._dirty = value !== this._hovering;
        this._hovering = value;
    }

    onMouseWheel(event) {
        if (this._controller) {
            this._controller.adjustControllerSize();
        }
    }
}

module.exports = Gizmo;
