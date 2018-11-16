'use strict';
const vec3 = cc.vmath.vec3;
const vec2 = cc.vmath.vec2;
let snapPixelWihVec2 = Editor.GizmosUtils.snapPixelWihVec2;
const CameraTool = Editor.require('packages://scene/panel/tools/camera');
const NodeUtils = Editor.require('scene://utils/node');
const ControllerUtils = require('../3d/controller-utils');
const ControllerShapeCollider = require('../3d/controller-shape-collider');
const { isCreator2x, create3DNode, setMeshColor, getModel } = require('../../engine');

class ControllerBase
{
    constructor(graphic, view, rootNode)
    {
        this._graphic = graphic;
        this._view = view;
        this._shapeGroup = null;
        this._position = cc.v3(0,0,0);
        this._rotation = cc.quat(0,0,0,1);
        this._updated = false;

        // for 3d
        this.shape = null;
        this._rootNode = rootNode;
        this._baseDist = 600;
        this._axisDataMap = {};
        this._axisDir = {};
        this._axisDir['x'] = cc.v3(1,0,0);
        this._axisDir['y'] = cc.v3(0,1,0);
        this._axisDir['z'] = cc.v3(0,0,1);

        // for 2d
        this._is2D = isCreator2x;
        this._2DScale = 1;
    }

    createShapeNode(name)
    {
        this.shape = create3DNode(name);
        this.shape.parent = this._rootNode;
    }

    initAxis(node, axisName, oriColor = cc.Color.WHITE)
    {
        let axisData = {};
        axisData.topNode = node;
        axisData.rendererNodes = this.getRendererNodes(node);
        axisData.oriColor = oriColor;
        this._axisDataMap[axisName] = axisData;

        let rayDetectNodes = this.getRayDetectNodes(node);
        rayDetectNodes.forEach(node => {
            this.registerMouseEvents(node, axisName);
        });


        if (this.onInitAxis)
            this.onInitAxis(node, axisName);
    }

    setAxisColor(axisName, color)
    {
        let rendererNodes = this._axisDataMap[axisName].rendererNodes;
        if (rendererNodes != null)
        {
            rendererNodes.forEach(node => {
                setMeshColor(node, color);
            });
        }
    }

    resetAxisColor()
    {
        for(let key in this._axisDataMap)
        {
            this.setAxisColor(key, this._axisDataMap[key].oriColor);
        }
    }

    registerMouseEvents(node, axisName)
    {
        node.on('mouseDown', function(event)
        {
            event.axisName = axisName;
            event.node = node;
            this._updated = false;
            if (this.onMouseDown)
                this.onMouseDown(event);
            event.stopPropagation();
        }.bind(this));

        node.on('mouseMove', function(event)
        {
            this._updated = true;
            event.axisName = axisName;
            event.node = node;
            if (this.onMouseMove)
                this.onMouseMove(event);
            event.stopPropagation();

        }.bind(this));

        node.on('mouseUp', function(event)
        {
            event.axisName = axisName;
            event.node = node;
            if (this.onMouseUp)
                this.onMouseUp(event);
            event.stopPropagation();
            this._updated = false;
        }.bind(this));

        // 鼠标移出场景窗口，暂时处理为和mouseup等同
        node.on('mouseLeave', function(event)
        {
            if (this.onMouseLeave)
                this.onMouseLeave(event);
            event.stopPropagation();
            this._updated = false;
        }.bind(this));

        node.on('hoverIn', function(event)
        {
            event.axisName = axisName;
            event.node = node;
            if (this.onHoverIn)
                this.onHoverIn(event);
            event.stopPropagation();
        }.bind(this));

        node.on('hoverOut', function(event)
        {
            event.axisName = axisName;
            event.node = node;
            if (this.onHoverOut)
                this.onHoverOut(event);
            event.stopPropagation();
        }.bind(this));
    }

    get updated()
    {
        return this._updated;
    }

    sceneToPixel (p) 
    {
        return snapPixelWihVec2( this._view.sceneToPixel(p) );
    }

    setPosition(value)
    {
        if ( value instanceof cc.Vec3 )
        {
            this._position = value;
        }
        else
        {
            this._position = cc.v3(value.x, value.y, 0);
        }
        this.updateController();
    }

    getPosition()
    {
        return this._position;
    }

    setRotation(value)
    {
        this._rotation = value;
        this.updateController();
    }

    updateController()
    {
        this.updateController3D();
    }

    updateController3D()
    {
        NodeUtils.setWorldPosition3D(this.shape, this._position);
        NodeUtils.setWorldRotation3D(this.shape, this._rotation);

        // 根据和相机的距离，对坐标系进行整体放缩
        let scalar = this.getDistScalar();
        this.shape.setScale(scalar, scalar, scalar);
    }

    getDistScalar()
    {
        let scalar = 1;

        if (this._is2D)
        {
            scalar = 1 / this._2DScale;
        }
        else
        {
            let cameraNode = CameraTool._camera.node;
            let dist = ControllerUtils.getCameraDistanceFactor(this._position, cameraNode);
            scalar = dist / this._baseDist;
        }

        return scalar;
    }

    needRender(node){
        let csc = node.getComponent(ControllerShapeCollider);
        if (csc && csc.isRender == false)
            return false;
        
        return true;
    }

    getRendererNodes(node)
    {
        let renderNodes = [];

        if (getModel(node) && this.needRender(node))
            renderNodes.push(node);

        for (let i = 0; i < node.childrenCount; i++)
        {
            let child = node._children[i];
            renderNodes = renderNodes.concat(this.getRendererNodes(child));
        }

        return renderNodes;
    }

    getRayDetectNodes(node)
    {
        let rayDetectNodes = [];
        if (getModel(node)) rayDetectNodes.push(node);

        for (let i = 0; i < node.childrenCount; i++)
        {
            let child = node._children[i];
            rayDetectNodes = rayDetectNodes.concat(this.getRayDetectNodes(child));
        }

        return rayDetectNodes;
    }

    localToWorldPosition(localPos)
    {
        let worldMatrix = cc.mat4();
        let worldPos = cc.v3(0,0,0);
        this.shape.getWorldMatrix(worldMatrix);
    
        vec3.transformMat4(worldPos, localPos, worldMatrix);
    
        return worldPos;
    }

    worldPosToScreenPos(worldPos)
    {
        let camera = CameraTool._camera._camera;
        let screenPos = cc.v2();
        camera.worldToScreen(screenPos, worldPos, cc.visibleRect.width, cc.visibleRect.height);

        return screenPos;
    }

    getScreenPos(localPos)
    {
        return this.worldPosToScreenPos(this.localToWorldPosition(localPos));
    }

    getAlignAxisMoveDistance(axisWorldDirEndPos, deltaPos)
    {
        let dirInScreen = this.worldPosToScreenPos(axisWorldDirEndPos);
        let oriPosInScreen = this.worldPosToScreenPos(this._position);
        vec2.sub(dirInScreen, dirInScreen, oriPosInScreen);
        vec2.normalize(dirInScreen, dirInScreen);
        //console.log(axisWorldDir, dirInScreen, deltaPos);
        let alignAxisMoveDist = vec2.dot(deltaPos, dirInScreen);
        return alignAxisMoveDist;
    }

    show()
    {
        this.shape.active = true;

        if (this.onShow)
        {
            this.onShow();
        }
    }

    hide()
    {
        this.shape.active = false;

        if (this.onHide)
        {
            this.onHide();
        }
    }

    setDimension(is2D)
    {
        this._is2D = is2D;
        this.show();
        this.updateController();
    }

    set2DScale(scale)
    {
        this._2DScale = scale;
        this.updateController();
    }
}

module.exports = ControllerBase;