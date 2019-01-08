'use strict';
const { create3DNode, getRaycastResults } = require('../utils/engine');

let hitPoint = cc.v3();

module.exports = {
    init () {
        this.gizmoRootNode = create3DNode('gizmoRoot');
        this.gizmoRootNode.parent = _Scene.view.foregroundNode;
        this.recordLastX = 0;
        this.recordLastY = 0;
        this.hoverinNode = null;
        this.curSelectNode = null;
    },

    onMouseDown (event) {
        if (event.button) return;

        if (event.which === 1) {
            let x = event.offsetX;
            let y = cc.game.canvas.height - event.offsetY;
            this.recordLastX = x;
            this.recordLastY = y;

            let results = getRaycastResults(this.gizmoRootNode, x, y);
            let ray = results.ray;

            if (results.length > 0) {
                let firstReuslt = results[0];
                let customEvent = new cc.Event('mouseDown', true);
                cc.vmath.vec3.scale(hitPoint, ray.d, firstReuslt.distance);
                cc.vmath.vec3.add(hitPoint, ray.o, hitPoint);
                customEvent.hitPoint = hitPoint;
                customEvent.x = x;
                customEvent.y = y;
                this.curSelectNode = firstReuslt.node;
                this.curSelectNode.emit(customEvent.type, customEvent);
                return true;
            }
        }
    },

    onMouseWheel (/*event*/) {

    },

    onMouseMove (event) {
        let x = event.offsetX;
        let y = cc.game.canvas.height - event.offsetY;

        let results = getRaycastResults(this.gizmoRootNode, x, y);

        let customEvent = new cc.Event('mouseMove', true);
        // customEvent.deltaX = x - this.recordLastX;
        // customEvent.deltaY = y - this.recordLastY;
        // this.recordLastX = x;
        // this.recordLastY = y;

        customEvent.x = x;
        customEvent.y = y;
        customEvent.moveDeltaX = event.movementX;
        customEvent.moveDeltaY = -event.movementY;

        if (this.curSelectNode != null) {
            this.curSelectNode.emit(customEvent.type, customEvent);
        }
        else {
            if (results.length > 0) {
                let firstReuslt = results[0];
                let target = firstReuslt.node;

                if (target != this.hoverinNode) {
                    if (this.hoverinNode != null) {
                        customEvent = new cc.Event('hoverOut', true);
                        this.hoverinNode.emit(customEvent.type, customEvent);
                    }

                    this.hoverinNode = target;
                    customEvent = new cc.Event('hoverIn', true);
                    this.hoverinNode.emit(customEvent.type, customEvent);
                }
            }
            else {
                if (this.hoverinNode != null) {
                    customEvent = new cc.Event('hoverOut', true);
                    this.hoverinNode.emit(customEvent.type, customEvent);
                }

                this.hoverinNode = null;
            }

        }

    },
    onMouseUp (event) {
        let x = event.offsetX;
        let y = cc.game.canvas.height - event.offsetY;
        let customEvent = new cc.Event('mouseUp', true);

        if (this.curSelectNode != null) {
            this.curSelectNode.emit(customEvent.type, customEvent);
            this.curSelectNode = null;

            //当前在操作gizmo的物体，事件不往下传递，防止选择其它物体
            return true;
        }
        else {
            let results = getRaycastResults(this.gizmoRootNode, x, y);

            for (let i = 0; i < results.length; i++) {
                results[i].node.emit(customEvent.type, customEvent);
            }
        }

    },
    onMouseLeave (/*event*/) {
        let customEvent = new cc.Event('mouseLeave', true);

        if (this.curSelectNode != null) {
            this.curSelectNode.emit(customEvent.type, customEvent);
            this.curSelectNode = null;
        }
    },
    onKeyDown (event) {

        // 兼容2D的svg临时作法，后面应该把\scene\gizmos\index.js里的东西都移到manager这里
        if (_Scene.gizmosView && _Scene.gizmosView.svg.transform) {
            if (_Scene.gizmosView.svg.transform.onGizmoKeyDown) {
                _Scene.gizmosView.svg.transform.onGizmoKeyDown(event);
            }
        }
    },
    onKeyUp (event) {
        if (_Scene.gizmosView && _Scene.gizmosView.svg.transform) {
            if (_Scene.gizmosView.svg.transform.onGizmoKeyUp) {
                _Scene.gizmosView.svg.transform.onGizmoKeyUp(event);
            }
        }
    },

};
