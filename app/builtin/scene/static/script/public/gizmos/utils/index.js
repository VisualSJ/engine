'use strict';
let GizmoConfig = require('../gizmo-config');

if (GizmoConfig.isCreator2x) {
    module.exports = require('./2d');
} else {
    module.exports = require('./3d');
}
