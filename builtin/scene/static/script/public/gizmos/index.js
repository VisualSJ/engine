'use strict';
const { create3DNode, getRaycastResults } = require('./engine');
const GizmoDefines = require('./gizmo-defines');
const NodeUtils = require('../../3d/manager/node');
const Selection = require('../selection');

const operationManager = require('../operation');

let hitPoint = cc.v3();

module.exports = {
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
        this._coordinate = 'local';     // local/global
        this._pivot = 'pivot';           // pivot/center
        this._selection = [];
        this._gizmosPool = {};

        // selection events
        Selection.on('select', (uuid, uuids) => {
            this.select(uuid, uuids);
        });

        Selection.on('unselect', (uuid) => {
            this.unselect([uuid]);
        });
    },

    onSceneLoaded() {
        // 需要场景加载完对Node的active才有效果
        this.transformToolName = 'position';

        // 软刷新后保留原先的gizmo
        let selectedNodes = Selection.query();
        this.select(selectedNodes);
    },

    get transformTool() {
        return this._transformTool;
    },

    get transformToolName() {
        return this._transformToolName;
    },

    set transformToolName(toolName) {
        this._transformToolName = toolName;

        let tool = this.getGizmoToolByName(this._transformToolName);

        if (tool != null && tool !== this._transformTool) {
            let curEditNodes = [];
            if (this._transformTool != null) {
                this._transformTool.hide();
                curEditNodes = this._transformTool.target;
            }

            this._transformTool = tool;
            this.edit(curEditNodes);
        }
    },

    get coordinate() {
        return this._coordinate;
    },

    set coordinate(value) {
        this._coordinate = value;

        if (this._transformTool) {
            this.edit(this._transformTool.target);
        }
    },

    get pivot() {
        return this._pivot;
    },

    set pivot(value) {
        this._pivot = value;

        if (this._transformTool) {
            this.edit(this._transformTool.target);
        }
    },

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
                this._gizmoToolMap[toolName] = this.createGizmo(gizmoDef);
                tool = this._gizmoToolMap[toolName];
            } else {
                Editor.error('Unknown transform tool %s', toolName);
            }
        }

        return tool;
    },

    createGizmo(gizmoDef, target) {
        if (gizmoDef == null) {
            return;
        }

        let gizmoObjList = this._gizmosPool[name];
        let newGizmoObj = null;
        if (gizmoObjList == null) {
            gizmoObjList = [];
            newGizmoObj = new gizmoDef(target);
            gizmoObjList.push(newGizmoObj);
        } else {
            for (let i = 0; i < gizmoObjList.length; i++) {
                if (!gizmoObjList[i].visible()) {
                    newGizmoObj = gizmoObjList[i];
                    break;
                }
            }
        }

        return newGizmoObj;
    },

    destoryGizmo(gizmo) {
        gizmo.hide();
    },

    showNodeGizmo(node) {
        let gizmoDef = null;
        let gizmoObj = null;
        // node gizmo
        if (node.gizmo == null) {
            let className = cc.js.getClassName(node);
            gizmoDef = GizmoDefines[className];
            if (gizmoDef) {
                gizmoObj = this.createGizmo(gizmoDef, node);
                gizmoObj.show();
                node.gizmo = gizmoObj;
            }
        }

        // for component gizmo
        node._components.forEach((component) => {
            if (component.gizmo == null) {
                let componentName = cc.js.getClassName(component);
                gizmoDef = GizmoDefines.components[componentName];
                if (gizmoDef != null) {
                    gizmoObj = this.createGizmo(gizmoDef, component);
                    gizmoObj.show();
                    component.gizmo = gizmoObj;
                }
            }
        });
    },

    hideNodeGizmo(node) {
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
    },

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
    },

    /**
     * 选中节点
     * @param {*} newId
     * @param {*} ids
     */
    select(newId, ids) {
        let newSelecedNode = NodeUtils.query(newId);
        if (!newSelecedNode) {
            return;
        }
        this.showNodeGizmo(newSelecedNode);

        this._selection = ids;
        let nodes = [];
        ids.forEach((id) => {
            let node = NodeUtils.query(id);
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
    },

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

            let node = NodeUtils.query(id);
            this.updateGizmosState(node, {
                selecting: false,
                editing: false,
            });

            this.hideNodeGizmo(node);
        });

        let nodes = this._selection.map((id) => {
            return NodeUtils.query(id);
        });

        this.edit(
            nodes.filter((node) => {
                return !!node;
            })
        );
    },

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
    },

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
        }
    },

    onMouseWheel(event) {
        if (this.transformTool && this.transformTool.onMouseWheel) {
            this.transformTool.onMouseWheel(event);
        }
    },

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

    },
    onMouseUp(event) {
        let x = event.x;
        let y = cc.game.canvas.height - event.y;
        let customEvent = new cc.Event('mouseUp', true);

        if (this.curSelectNode != null) {
            this.curSelectNode.emit(customEvent.type, customEvent);
            this.curSelectNode = null;
            return true;
        } else {
            let results = getRaycastResults(this.gizmoRootNode, x, y);

            for (let i = 0; i < results.length; i++) {
                results[i].node.emit(customEvent.type, customEvent);
            }
        }

    },
    onMouseLeave(/*event*/) {
        let customEvent = new cc.Event('mouseLeave', true);

        if (this.curSelectNode != null) {
            this.curSelectNode.emit(customEvent.type, customEvent);
            this.curSelectNode = null;
        }
    },
    onKeyDown(event) {

        // test
        switch (event.key.toLowerCase()) {
            case 'w': this.transformToolName = 'position'; break;
            case 'e': this.transformToolName = 'rotation'; break;
            case 'r': this.transformToolName = 'scale'; break;
            case 'g': this.coordinate = 'global'; break;
            case 'l': this.coordinate = 'local'; break;
        }
        // test end

        if (this.transformTool) {
            if (this.transformTool.onGizmoKeyDown) {
                this.transformTool.onGizmoKeyDown(event);
            }
        }
    },
    onKeyUp(event) {
        if (this.transformTool) {
            if (this.transformTool.onGizmoKeyUp) {
                this.transformTool.onGizmoKeyUp(event);
            }
        }
    },

};
