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

        this._isInited = false;
        this._hidden = true;

        this.target = target;
    }

    get target() {
        return this._target;
    }

    // component的gizmo是1对1关系，transform gizmo可以同时操作多个对像
    set target(value) {
        let nodes = this.nodes;
        if (nodes && nodes.length > 0) {
            this.unRegisterTransformEvent(this.nodes);
            this.unRegisterNodeEvents(this.nodes);
        }

        this._target = value;
        nodes = this.nodes;
        if (nodes && nodes.length > 0) {
            this.registerTransformEvent(this.nodes);
            this.registerNodeEvents(this.nodes);

            if (this.onTargetUpdate) {
                this.onTargetUpdate();
            }
        } else {
            this.hide();
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

    recordChanges() {
        // this.nodes.forEach( node => {
        //     _Scene.Undo.recordNode( node.uuid );
        // });

    }

    commitChanges() {
        // AnimUtils.recordNodeChanged(this.nodes);
        // _Scene.Undo.commit();

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

    hide() {
        if (this._hidden) {
            return;
        }

        if (this.onHide) {
            this.onHide();
        }

        this._hidden = true;
    }

    show() {
        if (!this._hidden) {
            return;
        }

        if (!this._isInited) {
            if (this.init) {
                this.init();
            }
            this._isInited = true;
        }

        if (this.onShow) {
            this.onShow();
        }

        this._hidden = false;
    }

    onNodeTransformChanged() {
        if (this.updateControllerTransform) {
            this.updateControllerTransform();
        }
    }

    // 监听Node的transform改变事件
    registerTransformEvent(nodes) {
        if (this.onNodeTransformChanged) {
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].on('transform-changed', this.onNodeTransformChanged, this);
            }
        }
    }

    unRegisterTransformEvent(nodes) {
        if (this.onNodeTransformChanged) {
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].off('transform-changed', this.onNodeTransformChanged, this);
            }
        }
    }

    // 监听Node和component的属性变化事件，目前由编辑器发送
    registerNodeEvents(nodes) {
        if (this.onNodeChanged) {
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].on('change', this.onNodeChanged, this);
            }
        }
    }

    // gizmo会被复用，所以在component Hide的时候要取消注册事件
    unRegisterNodeEvents(nodes) {
        if (this.onNodeChanged) {
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].off('change', this.onNodeChanged, this);
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
        this._selecting = value;
    }

    get editing() {
        return this._editing;
    }

    set editing(value) {
        this._editing = value;
    }

    get hovering() {
        return this._hovering;
    }

    set hovering(value) {
        this._hovering = value;
    }
}

module.exports = Gizmo;
