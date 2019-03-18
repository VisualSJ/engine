'use strict';

const CameraControllerBase = require('./camera-controller-base');
const utils = require('./utils');
const CameraMoveMode = utils.CameraMoveMode;
const TransformToolData = require('../../../public/gizmos/utils/transform-tool-data');
const Grid = require('./grid');
const EditorMath = require('../../../utils/math');
const nodeManager = require('../node');
const tween = require('./tween');

const _defaultMargin = 5;
const _lineColor = cc.color().fromHEX('#555555');
const _lineEnd = 1000000;
const _maxTicks = 100;

let flat = function(arr, fn) {
    return arr.map(fn).reduce((acc, val) => acc.concat(val), []);
};

let updateVBAttr = function(comp, attr, data) {
    const model = comp.model.getSubModel(0);
    if (!model) { return; }
    const ia = model.inputAssembler;
    if (ia && model.subMeshData) {
        const mesh = model.subMeshData;
        // update vb
        let flatData;
        if (attr === cc.GFXAttributeName.ATTR_POSITION) {
            flatData = flat(data, (v) => [v.x, v.y, v.z]);
        } else if (attr === cc.GFXAttributeName.ATTR_COLOR) {
            flatData = flat(data, (c) => [c.r / 255, c.g / 255, c.b / 255, c.a / 255]);
        }

        ia.updateVertexAttr(mesh.vbuffer, attr, flatData);
    }
};

let updateIB = function(comp, data) {
    const model = comp.model.getSubModel(0);
    if (!model) { return; }
    const ia = model.inputAssembler;
    if (ia && model.subMeshData) {
        const mesh = model.subMeshData;
        // update ib
        ia.updateIndexBuffer(mesh.ibuffer, data);
        model.updateCommandBuffer();
    }
};

class CameraController2D extends CameraControllerBase {

    init(camera) {
        super.init(camera);
        this._initGrid();
        this._initGridNode();

        this.panningSpeed = 1.5;
    }

    _initGrid() {
        let editorViewSize = cc.view.getCanvasSize();
        let grid = new Grid(editorViewSize.width, editorViewSize.height);

        let mappingH = [0, 1, 1];
        let mappingV = [1, 0, 1];
        grid.setScaleH([5, 2], 0.01, 5000);
        grid.setMappingH(mappingH[0], mappingH[1], mappingH[2]);

        grid.setScaleV([5, 2], 0.01, 5000);
        grid.setMappingV(mappingV[0], mappingV[1], mappingV[2]);

        grid.setAnchor(0.5, 0.5);

        this._grid = grid;
    }

    _initGridNode() {
        let node = new cc.Node('2D Grid');
        node.layer = cc.Layers.Editor | cc.Layers.IgnoreRaycast;
        node.parent = Manager.backgroundNode;
        node.setWorldPosition(cc.v3(0, 0, 0));
        let model = node.addComponent(cc.ModelComponent);
        this._gridMeshComp = model;
        this._gridNode = node;

        let positions = [];
        let colors = [];
        let indices = [];

        // init gird data
        let initPositions = [];
        let initColors = [];
        this._updateGridData(initPositions, initColors, _lineColor, _lineEnd);
        // 直接创建一大块Mesh用的内存，方便后面动态加线
        for (let i = 0; i < _maxTicks * _maxTicks; i++) {
            if (i < initPositions.length) {
                positions.push(initPositions[i]);
                colors.push(initColors[i]);
            } else {
                positions.push(cc.v3(0, 0, 0));
                colors.push(cc.Color.WHITE);
            }
        }

        for (let i = 0; i < positions.length; i++) {
            indices.push(i);
        }

        positions = flat(positions, (v) => [v.x, v.y, v.z]);
        colors = flat(colors, (c) => [c.r / 255, c.g / 255, c.b / 255, c.a / 255]);
        let primitiveMode = cc.GFXPrimitiveMode.LINE_LIST;
        let mesh = cc.utils.createMesh({positions, indices, colors, primitiveMode});

        const submesh = mesh.renderingMesh.getSubmesh(0);
        const vbInfo = mesh.struct.vertexBundles[0].data;
        submesh.vbuffer = mesh.data.buffer.slice(vbInfo.offset, vbInfo.offset + vbInfo.length);
        const ibInfo = mesh.struct.primitives[0].indices.range;
        submesh.ibuffer = mesh.data.buffer.slice(ibInfo.offset, ibInfo.offset + ibInfo.length);
        model.mesh = mesh;

        // for material
        const mtl = new cc.Material();
        mtl.initialize({ effectName: 'builtin-base'});
        let overrides = {};
        overrides.primitive = primitiveMode;
        mtl.overridePipelineStates(overrides);
        model.material = mtl;

        this._gridNode.active = false;
    }

    updateGrid() {
        let positions = [];
        let colors = [];
        let indices = [];

        this._updateGridData(positions, colors, _lineColor, _lineEnd);

        for (let i = 0; i < positions.length; i++) {
            indices.push(i);
        }

        updateVBAttr(this._gridMeshComp, cc.GFXAttributeName.ATTR_POSITION, positions);
        updateVBAttr(this._gridMeshComp, cc.GFXAttributeName.ATTR_COLOR, colors);
        updateIB(this._gridMeshComp, indices);

    }

    set active(value) {
        this._gridNode.active = value;

        if (value) {
            this._camera.projection = 0;    //0:ortho,1:perspective

            let cameraRot = cc.quat();
            //quat.fromEuler(cameraRot, 0, 0, 0);
            this.node.setWorldRotation(cameraRot);

            this._adjustToCenter(_defaultMargin);
        }
    }

    _adjustToCenter(margin, contentBounds, immediate) {
        let contentX = 0;
        let contentY = 0;
        let contentWidth = 0;
        let contentHeight = 0;

        if (contentBounds) {
            contentX = contentBounds.x;
            contentY = contentBounds.y;
            contentWidth = contentBounds.width;
            contentHeight = contentBounds.height;
        } else {
            let canvasComps = utils.queryComponent(cc.CanvasComponent);
            if (canvasComps.length > 0) {
                let canvasSize = canvasComps[0].designResolution;
                contentWidth = canvasSize.width;
                contentHeight = canvasSize.height;
            }
        }

        // calculate scale
        let scale = 1;
        let editorViewSize = cc.view.getCanvasSize();
        let fitWidth = editorViewSize.width - margin * 2;
        let fitHeight = editorViewSize.height - margin * 2;

        if (contentWidth <= fitWidth && contentHeight <= fitHeight) {
            scale = 1;
        } else {
            let result = this.fitSize(contentWidth, contentHeight,
                        fitWidth, fitHeight);
            scale = this.getSizeScale(result[0], result[1], contentWidth, contentHeight);
            contentWidth = result[0];
            contentHeight = result[1];
        }

        TransformToolData.scale2D = scale;

        let gridX = ((editorViewSize.width - contentWidth) / 2 - contentX * scale) * this._grid.xDirection;
        let gridY = ((editorViewSize.height - contentHeight) / 2 - contentY * scale) * this._grid.yDirection;
        this._grid.xAxisSync(gridX, scale);
        this._grid.yAxisSync(gridY, scale);
        this.updateGrid();

        this._adjustCamera(immediate);
    }

    _adjustCamera(immediate = true) {
        let scale = TransformToolData.scale2D;

        let sceneX = this._grid.xDirection * this._grid.xAxisOffset;
        let sceneY = this._grid.yDirection * this._grid.yAxisOffset;
        let pos = cc.v3(
            cc.game.canvas.width / 2 / scale - sceneX / scale,
            cc.game.canvas.height / 2 / scale - sceneY / scale,
            1000
        );

        if (immediate) {
            this.node.setWorldPosition(pos);
        } else {
            const startPosition = this.node.getPosition();
            tween.position(startPosition, pos, 200).step((position) => {
                this.node.setWorldPosition(position);
            });
        }

        this._updateOrthoHeight(scale);
    }

    _updateGridData(positions, colors, lineColor, lineEnd) {
        let grid = this._grid;
        grid.updateRange();

        // draw h ticks
        if (grid.hTicks) {
            for (let i = grid.hTicks.minTickLevel; i <= grid.hTicks.maxTickLevel; i++) {
                let ratio = grid.hTicks.tickRatios[i];
                if (ratio > 0) {
                    let color = lineColor.clone();
                    color.a = ratio * 255;
                    let ticks = grid.hTicks.ticksAtLevel(i, true);
                    for (let j = 0; j < ticks.length; j++) {
                        let x = ticks[j];
                        positions.push(cc.v3(x, -lineEnd, -5));
                        positions.push(cc.v3(x, lineEnd, -5));
                        colors.push(color);
                        colors.push(color);
                    }
                }
            }
        }

        // draw v ticks
        if (grid.vTicks) {
            for (let i = grid.vTicks.minTickLevel; i <= grid.vTicks.maxTickLevel; i++) {
                let ratio = grid.vTicks.tickRatios[i];
                if (ratio > 0) {
                    let color = lineColor.clone();
                    color.a = ratio * 255;
                    let ticks = grid.vTicks.ticksAtLevel(i, true);
                    for (let j = 0; j < ticks.length; j++) {
                        let y = ticks[j];
                        positions.push(cc.v3(-lineEnd, y, -5));
                        positions.push(cc.v3(lineEnd, y, -5));
                        colors.push(color);
                        colors.push(color);
                    }
                }
            }
        }
    }

    _updateOrthoHeight(scale) {
        this._camera.orthoHeight = cc.game.canvas.height / 2 / cc.view._scaleY / scale;
    }

    focus(nodes) {
        let contentBounds;
        let maxX = -1e10;
        let maxY = -1e10;
        let minX = 1e10;
        let minY = 1e10;

        if (nodes) {
            nodes.forEach((id) => {
                let node = nodeManager.query(id);
                let uiTransComp = node.getComponent(cc.UITransformComponent);
                if (uiTransComp) {
                    let bounds = uiTransComp.getBoundingBoxToWorld();
                    maxX = Math.max(bounds.xMax, maxX);
                    maxY = Math.max(bounds.yMax, maxY);
                    minX = Math.min(bounds.xMin, minX);
                    minY = Math.min(bounds.yMin, minY);
                }
            });
            contentBounds = cc.rect(minX, minY, maxX - minX, maxY - minY);
        }

        this._adjustToCenter(_defaultMargin, contentBounds, false);
    }

    smoothScale(curScale, delta) {
        let scale = curScale;
        scale = Math.pow(2, delta * 0.002) * scale;

        return scale;
    }

    /**
     * @method fitSize
     * @param {number} srcWidth
     * @param {number} srcHeight
     * @param {number} destWidth
     * @param {number} destHeight
     * @return {number[]} - [width, height]
     */
    fitSize(srcWidth, srcHeight, destWidth, destHeight) {
        let width = 0;
        let height = 0;

        if (
        srcWidth > destWidth &&
        srcHeight > destHeight
        ) {
        width = destWidth;
        height = srcHeight * destWidth / srcWidth;

        if (height > destHeight) {
            height = destHeight;
            width = srcWidth * destHeight / srcHeight;
        }

        } else if (srcWidth > destWidth) {
        width = destWidth;
        height = srcHeight * destWidth / srcWidth;

        } else if (srcHeight > destHeight) {
        width = srcWidth * destHeight / srcHeight;
        height = destHeight;

        } else {
        width = srcWidth;
        height = srcHeight;
        }

        return [width, height];
    }

    getSizeScale(newWidth, newHeight, oldWidth, oldHeight) {
        let scaleWidth = oldWidth <= 0 ? 1 : newWidth / oldWidth;
        let scaleHeight = oldHeight <= 0 ? 1 : newHeight / oldHeight;

        let scale = Math.max(scaleWidth, scaleHeight);
        return scale;
    }

    move(dx, dy) {
        if (this.camera_move_mode === CameraMoveMode.PAN) {
            this._grid.pan(dx, dy);
            this.updateGrid();
            this._adjustCamera();
        }
    }

    scale(delta, offsetX, offsetY) {
        let newScale = this.smoothScale(TransformToolData.scale2D, delta);
        newScale = EditorMath.clamp(
            newScale,
            this._grid.hTicks.minValueScale,
            this._grid.hTicks.maxValueScale
        );

        this._grid.xAxisScaleAt(offsetX, newScale);
        this._grid.yAxisScaleAt(offsetY, newScale);

        TransformToolData.scale2D = newScale;

        this.updateGrid();

        this._adjustCamera();
    }

    enterPanMode() {
        this.camera_move_mode = CameraMoveMode.PAN;
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    exitPanMode() {
        this.camera_move_mode = CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    onMouseDown(event) {
        if (this.camera_move_mode !== CameraMoveMode.NONE) {
            return;
        }

        if (event.middleButton) {
            // 鼠标中间键
            this.enterPanMode();
            return false;
        } else if (event.rightButton) {
            // 鼠标右键
            this.enterPanMode();
            return false;
        }
    }

    onMouseMove(event) {
        if (this.camera_move_mode === CameraMoveMode.NONE) {
            return;
        }
        this.move(event.moveDeltaX, event.moveDeltaY);

        return true;
    }

    onMouseUp(event) {
        if (this.camera_move_mode === CameraMoveMode.NONE) {
            return;
        }

        if (event.middleButton) { // middle button: panning
            this.exitPanMode();
        } else if (event.rightButton) { // right button: panning
            this.exitPanMode();
        }
    }

    onMouseWheel(event) {
        if (Math.max(Math.abs(event.wheelDeltaX), Math.abs(event.wheelDeltaY)) > 60) {
            this.scale(event.wheelDeltaY / 6, event.x, event.y);
        } else {
            if (this.camera_move_mode !== CameraMoveMode.PAN) {
                this.enterPanMode();
            }
            this.move(event.wheelDeltaX, event.wheelDeltaY);
        }
    }

    onKeyDown(event) {
    }

    onKeyUp(event) {

    }

    onUpdate() {

    }

    onResize() {
        this._grid.resize(cc.game.canvas.width, cc.game.canvas.height);
        this.updateGrid();
        this._adjustCamera();
    }
}

module.exports = CameraController2D;
