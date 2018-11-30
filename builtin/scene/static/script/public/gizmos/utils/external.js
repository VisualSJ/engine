'use strict';
let GizmoConfig = require('../gizmo-config');

//对Gizmo文件夹以外的文件的引用路径
exports.GeometryUtils = {};
if (GizmoConfig.isCreator2x) {
    exports.NodeUtils = Editor.require('scene://utils/node');
    exports.EditorMath = Editor.Math;
    exports.EditorCamera = Editor.require('packages://scene/panel/tools/camera');
} else {
    exports.NodeUtils = require('../../../utils/node');
    exports.EditorMath = require('../../../utils/math');
    exports.EditorCamera = require('../../../3d/manager/camera').EditorCamera;
    exports.GeometryUtils.aabb = require('../../../utils/aabb');
}
