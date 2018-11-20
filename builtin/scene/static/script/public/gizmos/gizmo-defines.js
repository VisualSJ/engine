'use strict';

let GizmoDefines = {};
module.exports = GizmoDefines;

GizmoDefines.GizmosUtils = require('./utils');

GizmoDefines.position = require('./elements/transform/position-gizmo');
GizmoDefines.rotation = require('./elements/transform/rotation-gizmo');
GizmoDefines.scale = require('./elements/transform/scale-gizmo');