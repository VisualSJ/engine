'use strict';

let GizmoDefines = {};
module.exports = GizmoDefines;

//GizmoDefines.GizmosUtils = require('../utils/utils');

// for transform tool
GizmoDefines.position = require('./elements/transform/position-gizmo');
GizmoDefines.rotation = require('./elements/transform/rotation-gizmo');
GizmoDefines.scale = require('./elements/transform/scale-gizmo');

// component gizmos
GizmoDefines.components = {};
GizmoDefines.components['cc.LightComponent'] = require('./elements/components/light-component-gizmo');
GizmoDefines.components['cc.ModelComponent'] = require('./elements/components/model-component-gizmo');
GizmoDefines.components['cc.SkinningModelComponent'] = require('./elements/components/skinning-model-component-gizmo');
GizmoDefines.components['cc.CameraComponent'] = require('./elements/components/camera-component-gizmo');
