'use strict';

let GizmoDefines = {};
module.exports = GizmoDefines;

GizmoDefines.GizmosUtils = require('./utils');

// for transform tool
GizmoDefines.position = require('./elements/transform/position-gizmo');
GizmoDefines.rotation = require('./elements/transform/rotation-gizmo');
GizmoDefines.scale = require('./elements/transform/scale-gizmo');

// component gizmos
GizmoDefines.components = {};
GizmoDefines.components['cc.LightComponent'] = require('./elements/components/light-component-gizmo');
