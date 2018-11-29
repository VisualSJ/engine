'use strict';
let ControllerShape = require('./controller-shape');
const NodeUtils = require('../../../../utils/node');
const ControllerShapeCollider = require('./controller-shape-collider');
const { gfx, create3DNode, addMeshToNode, setMeshColor, setNodeOpacity } = require('../../engine');
let ControllerUtils = {};

ControllerUtils.YELLOW = new cc.Color(255, 255, 0);

ControllerUtils.arrow = function(headHeight, headRadius, bodyHeight, color, name) {
    if (name == null) {
        name = 'arrow';
    }

    let axisNode = create3DNode(name);

    // body
    let cylinderNode = create3DNode('ArrowBody');
    cylinderNode.parent = axisNode;
    addMeshToNode(cylinderNode,
        //ControllerShape.Cylinder(bodyRadius, bodyRadius, bodyHeight, 10, 10));
        ControllerShape.LineWithBoundingBox(bodyHeight));
    setMeshColor(cylinderNode, color);
    cylinderNode.eulerAngles = cc.v3(0, 0, 90);
    let csc = cylinderNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = false;

    // head
    let coneNode = create3DNode('ArrowHead');
    coneNode.parent = axisNode;
    addMeshToNode(coneNode,
        ControllerShape.Cone(headRadius, headHeight), { cullMode: gfx.CULL_BACK });
    setMeshColor(coneNode, color);
    coneNode.setPosition(cc.v3(0, bodyHeight + headHeight / 2, 0));
    csc = coneNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = false;

    return axisNode;
};

ControllerUtils.plane = function(width, height, color = cc.Color.RED, name = 'plane') {
    let planeNode = create3DNode(name);
    addMeshToNode(planeNode, ControllerShape.Plane(width, height));
    setMeshColor(planeNode, color);
    return planeNode;
};

ControllerUtils.borderPlane = function(width, height, color, name) {
    if (name == null) {
        name = 'borderPlane';
    }

    let halfWidth = width / 2;
    let halfHeight = height / 2;
    let borderPlane = create3DNode(name);
    // plane
    let planeNode = create3DNode('Plane');
    addMeshToNode(planeNode,
        ControllerShape.Plane(width, height));
    setMeshColor(planeNode, color);
    setNodeOpacity(planeNode, 128);
    planeNode.parent = borderPlane;
    let csc = planeNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = false;

    function createBorder(startPos, endPos, color) {
        let borderNode = create3DNode('border');
        addMeshToNode(borderNode,
            ControllerShape.Line(startPos, endPos));
        setMeshColor(borderNode, color);
        borderNode.parent = borderPlane;
        return borderNode;
    }

    // borders
    createBorder(cc.v3(0, 0, height / 2), cc.v3(halfWidth, 0, height / 2), color);
    createBorder(cc.v3(halfWidth, 0, halfHeight), cc.v3(halfWidth, 0, 0), color);

    return borderPlane;
};

ControllerUtils.circle = function(radius, color, name) {
    if (name == null) {
        name = 'circle';
    }

    let circleNode = create3DNode(name);
    addMeshToNode(circleNode,
        ControllerShape.Circle(radius, 64));
    setMeshColor(circleNode, color);

    return circleNode;
};

ControllerUtils.torus = function(radius, tube, opts, color, name = 'torus') {
    let torusNode = create3DNode(name);
    addMeshToNode(torusNode,
        ControllerShape.Torus(radius, tube, opts), { cullMode: gfx.CULL_BACK });
    setMeshColor(torusNode, color);
    let csc = torusNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = true;
    csc.isRender = false;

    return torusNode;
};

ControllerUtils.cube = function(width, height, depth, color, name) {
    if (name == null) {
        name = 'cube';
    }
    let cubeNode = create3DNode(name);
    addMeshToNode(cubeNode,
        ControllerShape.Cube(width, height, depth), { cullMode: gfx.CULL_BACK });
    setMeshColor(cubeNode, color);
    let csc = cubeNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = false;
    return cubeNode;
};

ControllerUtils.scaleSlider = function(headWidth, bodyHeight, color, name) {
    if (name == null) {
        name = 'scaleSlider';
    }
    let scaleSliderNode = create3DNode(name);
    let headNode = ControllerUtils.cube(headWidth, headWidth, headWidth, color, 'ScaleSliderHead');
    headNode.parent = scaleSliderNode;
    headNode.setPosition(0, bodyHeight + headWidth / 2, 0);

    let bodyNode = create3DNode('ScaleSliderBody');
    addMeshToNode(bodyNode,
        ControllerShape.LineWithBoundingBox(bodyHeight));
    setMeshColor(bodyNode, color);
    bodyNode.parent = scaleSliderNode;
    bodyNode.eulerAngles = cc.v3(0, 0, 90);
    let csc = bodyNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = false;

    return scaleSliderNode;
};

ControllerUtils.getCameraDistanceFactor = function(pos, camera) {
    let cameraPos = NodeUtils.getWorldPosition3D(camera);
    let dist = cc.vmath.vec3.distance(pos, cameraPos);

    return dist;
};

ControllerUtils.lineTo = function(startPos, endPos, color = cc.Color.RED) {
    let lineNode = create3DNode('line');
    addMeshToNode(lineNode,
        ControllerShape.Line(startPos, endPos));
    setMeshColor(lineNode, color);

    return lineNode;
};

ControllerUtils.sector = function(center, normal, fromDir, radian, radius, color = cc.Color.RED) {
    let sectorNode = create3DNode('sector');
    addMeshToNode(sectorNode,
        ControllerShape.Sector(center, normal, fromDir, radian, radius, 60));
    setMeshColor(sectorNode, color);

    return sectorNode;
};

ControllerUtils.arc = function(center, normal, fromDir, radian, radius, color = cc.Color.RED) {
    let arcNode = create3DNode('arc');
    addMeshToNode(arcNode,
        ControllerShape.Arc(center, normal, fromDir, radian, radius));
    setMeshColor(arcNode, color);

    return arcNode;
};

ControllerUtils.arcDirectionLine = function(center, normal, fromDir, radian,
                                            radius, length, segments, color = cc.Color.RED) {
    let arcDirNode = create3DNode('arcDirLine');
    addMeshToNode(arcDirNode,
        ControllerShape.ArcDirectionLine(center, normal, fromDir, radian, radius, length, segments));
    setMeshColor(arcDirNode, color);

    return arcDirNode;
};

ControllerUtils.lines = function(vertices, indices, color = cc.Color.RED) {
    let linesNode = create3DNode('lines');
    addMeshToNode(linesNode,
        ControllerShape.Lines(vertices, indices));
    setMeshColor(linesNode, color);

    return linesNode;
};

ControllerUtils.wireframeBox = function(center, size, color) {
    let boxNode = create3DNode('wireframeBox');
    addMeshToNode(boxNode,
        ControllerShape.WireframeBox(center, size));
    setMeshColor(boxNode, color);

    return boxNode;
};

ControllerUtils.frustum = function(fov, aspect, near, far, color) {
    let frustumNode = create3DNode('frustumNode');
    addMeshToNode(frustumNode,
        ControllerShape.Frustum(fov, aspect, near, far));
    setMeshColor(frustumNode, color);

    return frustumNode;
};

module.exports = ControllerUtils;
