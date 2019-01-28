'use strict';
const { create3DNode, getRaycastResults } = require('../utils/engine');
const GizmoDefines = require('./gizmo-defines');
const NodeQueryUtils = require('../../../3d/manager/node');
const Selection = require('../../selection');
const TransformToolData = require('../utils/transform-tool-data');
const operationManager = require('../../operation');
const WorldAxisController = require('./elements/controller/world-axis-controller');

let hitPoint = cc.v3();

class GizmoManager {

    queryToolName() {
        return this.transformToolName;
    }

    setTransformToolName(name) {
        if (['position', 'rotation', 'scale'].includes(name)) {
            this.transformToolName = name;
        }
    }

    queryCoordinate() {
        return this.coordinate;
    }

    setCoordinate(name) {
        if (['local', 'global'].includes(name)) {
            this.coordinate = name;
        }
    }

    queryPivot() {
        return this.pivot;
    }

    setPivot(name) {
        if (['pivot', 'center'].includes(name)) {
            this.pivot = name;
        }
    }

    init() {
        this.gizmoRootNode = create3DNode('gizmoRoot');
        this.gizmoRootNode.parent = Manager.foregroundNode;
        this.hoverinNode = null;
        this.curSelectNode = null;

        // events
        operationManager.on('mousedown', this.onMouseDown.bind(this));
        operationManager.on('mousemove', this.onMouseMove.bind(this));
        operationManager.on('mouseup', this.onMouseUp.bind(this));
        operationManager.on('wheel', this.onMouseWheel.bind(this));
        operationManager.on('keydown', this.onKeyDown.bind(this));
        operationManager.on('keyup', this.onKeyUp.bind(this));

        // for gizmo tool
        this._gizmoToolMap = {};
        this._selection = [];
        this._gizmosPool = {};

        // selection events
        Selection.on('select', (uuid, uuids) => {
            this.select(uuid, uuids);
        });

        Selection.on('unselect', (uuid) => {
            this.unselect([uuid]);
        });

        // world axis gizmo
        this._worldAxisController = new WorldAxisController(this.gizmoRootNode);
    }

    onSceneLoaded() {
        this.clearAllGizmos();
        // 需要场景加载完对Node的active才有效果
        this.transformToolName = 'position';

        // 软刷新后保留原先的gizmo
        let selectedNodes = Selection.query();
        this.select(selectedNodes);
    }

    get transformTool() {
        return this._transformTool;
    }

    get transformToolName() {
        return TransformToolData.toolName;
    }

    set transformToolName(toolName) {
        TransformToolData.toolName = toolName;

        let tool = this.getGizmoToolByName(TransformToolData.toolName);

        if (tool != null && tool !== this._transformTool) {
            let curEditNodes = [];
            if (this._transformTool != null) {
                this._transformTool.hide();
                curEditNodes = this._transformTool.target;
            }

            this._transformTool = tool;
            this.edit(curEditNodes);
        }
    }

    get coordinate() {
        return TransformToolData.coordinate;
    }

    set coordinate(value) {
        TransformToolData.coordinate = value;

        if (this._transformTool) {
            this.edit(this._transformTool.target);
        }
    }

    get pivot() {
        return TransformToolData.pivot;
    }

    set pivot(value) {
        TransformToolData.pivot = value;

        if (this._transformTool) {
            this.edit(this._transformTool.target);
        }
    }

    lockGizmoTool(value) {
        TransformToolData.isLocked = value;
    }

    isGizmoToolLocked() {
        return TransformToolData.isLocked;
    }

    getGizmoToolByName(toolName) {
        let tool = this._gizmoToolMap[toolName];

        if (tool == null) {
            let gizmoDef;
            switch (toolName) {
                case 'position':
                    gizmoDef = GizmoDefines.position;
                    break;
                case 'rotation':
                    gizmoDef = GizmoDefines.rotation;
                    break;
                case 'scale':
                    gizmoDef = GizmoDefines.scale;
                    break;
                default:

            }
            if (gizmoDef != null) {
                this._gizmoToolMap[toolName] = this.createGizmo(toolName, gizmoDef);
                tool = this._gizmoToolMap[toolName];
            } else {
                console.error('Unknown transform tool %s', toolName);
            }
        }

        return tool;
    }

    clearAllGizmos() {
        Object.keys(this._gizmosPool).forEach((key) => {
            let gizmoObjList = this._gizmosPool[key];
            gizmoObjList.forEach((gizmo) => {
                this.destoryGizmo(gizmo);
            });
        });
    }

    createGizmo(name, gizmoDef, target) {
        if (gizmoDef == null) {
            return;
        }

        let gizmoObjList = this._gizmosPool[name];
        let newGizmoObj = null;
        if (gizmoObjList == null) {
            gizmoObjList = [];
            newGizmoObj = new gizmoDef(target);
            gizmoObjList.push(newGizmoObj);
            this._gizmosPool[name] = gizmoObjList;
        } else {
            for (let i = 0; i < gizmoObjList.length; i++) {
                if (!gizmoObjList[i].visible()) {
                    newGizmoObj = gizmoObjList[i];
                    newGizmoObj.target = target;
                    break;
                }
            }

            //如果当前池中没有可用的obj
            if (!newGizmoObj) {
                newGizmoObj = new gizmoDef(target);
                gizmoObjList.push(newGizmoObj);
            }
        }

        return newGizmoObj;
    }

    destoryGizmo(gizmo) {
        if (gizmo) {
            gizmo.hide();
        }
    }

    showNodeGizmo(node) {
        if (!node) {
            return;
        }

        let gizmoDef = null;
        let gizmoObj = null;
        // node gizmo
        if (node.gizmo == null) {
            let className = cc.js.getClassName(node);
            gizmoDef = GizmoDefines[className];
            if (gizmoDef) {
                gizmoObj = this.createGizmo(className, gizmoDef, node);
                gizmoObj.show();
                node.gizmo = gizmoObj;
            }
        }

        // for component gizmo
        node._components.forEach((component) => {
            let needShow = node.active && component.enabled;
            if (needShow && component.gizmo == null) {
                gizmoDef = null;
                gizmoObj = null;
                let componentName = cc.js.getClassName(component);

                // builtin component gizmo
                gizmoDef = GizmoDefines.components[componentName];
                if (gizmoDef != null) {
                    gizmoObj = this.createGizmo(componentName, gizmoDef, component);
                    gizmoObj.show();
                    component.gizmo = gizmoObj;
                }
            }
        });
    }

    hideNodeGizmo(node) {
        if (!node) {
            return;
        }

        if (node.gizmo) {
            this.destoryGizmo(node.gizmo);
            node.gizmo = null;
        }

        // for component gizmo
        node._components.forEach((component) => {
            if (component.gizmo) {
                this.destoryGizmo(component.gizmo);
                component.gizmo = null;
            }
        });
    }

    onComponentEnable(id) {
        let component = cc.engine.getInstanceById(id);
        //let className = cc.js.getClassName(component);

        let index = this._selection.indexOf(component.node.uuid);
        //当前component所在node为选中状态
        if (index !== -1) {
            this.showNodeGizmo(component.node);
        }
    }

    onComponentDisable(id) {
        let component = cc.engine.getInstanceById(id);
        if (component && component.gizmo) {
            this.destoryGizmo(component.gizmo);
            component.gizmo = null;
        }
    }

    /**
     *
     * @param {*} node
     * @param {*} states
     */
    updateGizmosState(node, states) {
        if (!node) {
            return;
        }

        let components = node._components;

        Object.keys(states).forEach((key) => {
            if (node.gizmo) {
                node.gizmo[key] = states[key];
            }

            components.forEach((component) => {
                if (!component.gizmo) {
                    return;
                }

                component.gizmo[key] = states[key];
            });
        });
    }

    /**
     * 选中节点
     * @param {*} newId
     * @param {*} ids
     */
    select(newId, ids) {
        if (!newId || !ids) {
            return;
        }

        let newSelecedNode = NodeQueryUtils.query(newId);
        if (!newSelecedNode) {
            return;
        }
        this.showNodeGizmo(newSelecedNode);

        this._selection = ids;
        let nodes = [];
        ids.forEach((id) => {
            let node = NodeQueryUtils.query(id);
            if (!node) {
                return;
            }

            this.updateGizmosState(node, {
                selecting: true,
                editing: false,
            });

            nodes.push(node);
        });

        this.edit(nodes);
    }

    /**
     * 取消选中
     * @param {*} ids
     */
    unselect(ids) {
        ids.forEach((id) => {
            let index = this._selection.indexOf(id);
            if (index !== -1) {
                this._selection.splice(index, 1);
            }

            let node = NodeQueryUtils.query(id);
            this.updateGizmosState(node, {
                selecting: false,
                editing: false,
            });

            this.hideNodeGizmo(node);
        });

        let nodes = this._selection.map((id) => {
            return NodeQueryUtils.query(id);
        });

        this.edit(
            nodes.filter((node) => {
                return !!node;
            })
        );
    }

    edit(nodes) {
        if (nodes.length === 0) {
            if (this._transformTool) {
                this._transformTool.target = [];
            }
            return;
        }

        if (nodes.length === 1) {
            this.updateGizmosState(nodes[0], {
                selecting: false,
                editing: true,
            });
        }

        if (this.transformTool == null) {
            return;
        }

        this.transformTool.target = nodes;
        this.transformTool.show();
    }

    onMouseDown(event) {
        if (event.leftButton) {
            let x = event.x;
            let y = cc.game.canvas.height - event.y;

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
            return false;
        }
    }

    onMouseWheel(event) {

    }

    onMouseMove(event) {
        let x = event.x;
        let y = cc.game.canvas.height - event.y;

        let results = getRaycastResults(this.gizmoRootNode, x, y);

        let customEvent = new cc.Event('mouseMove', true);

        customEvent.x = x;
        customEvent.y = y;
        customEvent.moveDeltaX = event.moveDeltaX;
        customEvent.moveDeltaY = -event.moveDeltaY;

        if (this.curSelectNode != null) {
            this.curSelectNode.emit(customEvent.type, customEvent);
        } else {
            if (results.length > 0) {
                let firstReuslt = results[0];
                let target = firstReuslt.node;

                if (target !== this.hoverinNode) {
                    if (this.hoverinNode != null) {
                        customEvent = new cc.Event('hoverOut', true);
                        this.hoverinNode.emit(customEvent.type, customEvent);
                    }

                    this.hoverinNode = target;
                    customEvent = new cc.Event('hoverIn', true);
                    customEvent.x = x;
                    customEvent.y = y;
                    this.hoverinNode.emit(customEvent.type, customEvent);
                }
            } else {
                if (this.hoverinNode != null) {
                    customEvent = new cc.Event('hoverOut', true);
                    this.hoverinNode.emit(customEvent.type, customEvent);
                }

                this.hoverinNode = null;
            }

        }

    }

    onMouseUp(event) {
        let x = event.x;
        let y = cc.game.canvas.height - event.y;
        let customEvent = new cc.Event('mouseUp', true);

        if (this.curSelectNode != null) {
            this.curSelectNode.emit(customEvent.type, customEvent);
            this.curSelectNode = null;
            return false;
        } else {
            let results = getRaycastResults(this.gizmoRootNode, x, y);

            for (let i = 0; i < results.length; i++) {
                results[i].node.emit(customEvent.type, customEvent);
            }
        }

    }

    onMouseLeave(/*event*/) {
        let customEvent = new cc.Event('mouseLeave', true);

        if (this.curSelectNode != null) {
            this.curSelectNode.emit(customEvent.type, customEvent);
            this.curSelectNode = null;
        }
    }

    onKeyDown(event) {

        // test
        if (!this.isGizmoToolLocked()) {
            switch (event.key.toLowerCase()) {
                // case 'w': this.transformToolName = 'position'; break;
                // case 'e': this.transformToolName = 'rotation'; break;
                // case 'r': this.transformToolName = 'scale'; break;
                case 'g': this.coordinate = 'global'; break;
                case 'l': this.coordinate = 'local'; break;
            }
        }
        // test end

        if (this.transformTool) {
            if (this.transformTool.onGizmoKeyDown) {
                this.transformTool.onGizmoKeyDown(event);
            }
        }
    }
    onKeyUp(event) {
        if (this.transformTool) {
            if (this.transformTool.onGizmoKeyUp) {
                this.transformTool.onGizmoKeyUp(event);
            }
        }
    }

    onNodeChanged(node) {
        if (node != null) {
            node.emit('change');
        }

        // 目前node的active,component的enable都走nodechange事件，
        // 先在这里统一处理，把Node的所有gizmo重置一遍。
        this.hideNodeGizmo(node);

        let index = this._selection.indexOf(node.uuid);
        if (index !== -1) {
            this.showNodeGizmo(node);
        }
    }

    onNodeRemoved(node) {
        if (node != null) {
            this.hideNodeGizmo(node);
        }
    }

    onComponentAdded(comp, node) {
        this.showNodeGizmo(node);
    }

    onBeforeComponentRemove(comp, node) {
        this.destoryGizmo(comp.gizmo);
    }
}

TransformToolData.on('tool-name-changed', (name) => {
    Manager.Ipc.send('broadcast', 'scene:gizmo-tool-changed', name);
});

TransformToolData.on('coordinate-changed', (name) => {
    Manager.Ipc.send('broadcast', 'scene:gizmo-coordinate-changed', name);
});

TransformToolData.on('pivot-changed', (name) => {
    Manager.Ipc.send('broadcast', 'scene:gizmo-pivot-changed', name);
});

module.exports = new GizmoManager();
