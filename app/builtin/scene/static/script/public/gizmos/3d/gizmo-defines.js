'use strict';

let GizmoDefines = {};
module.exports = GizmoDefines;

// node gizmo
GizmoDefines['cc.Node'] = require('./elements/node-gizmo');

// for transform tool
GizmoDefines.position = require('./elements/transform/position-gizmo');
GizmoDefines.rotation = require('./elements/transform/rotation-gizmo');
GizmoDefines.scale = require('./elements/transform/scale-gizmo');
GizmoDefines.rect = require('./elements/transform/rect-gizmo');

// component gizmos
GizmoDefines.components = {};
GizmoDefines.components['cc.ModelComponent'] = require('./elements/components/model-component-gizmo');
GizmoDefines.components['cc.SkinningModelComponent'] = require('./elements/components/skinning-model-component-gizmo');
GizmoDefines.components['cc.CameraComponent'] = require('./elements/components/camera-component-gizmo');
GizmoDefines.components['cc.ParticleSystemComponent'] = require('./elements/components/particle-system-component-gizmo');

// collider gizmos
GizmoDefines.components['cc.BoxColliderComponent'] = require(
    './elements/components/colliders/box-collider-component-gizmo');
GizmoDefines.components['cc.SphereColliderComponent'] = require(
    './elements/components/colliders/sphere-collider-component-gizmo');

// light gizmos
GizmoDefines.components['cc.DirectionalLightComponent'] = require(
    './elements/components/light/directional-light-component-gizmo');
GizmoDefines.components['cc.SphereLightComponent'] = require(
    './elements/components/light/sphere-light-component-gizmo');
GizmoDefines.components['cc.SpotLightComponent'] = require(
    './elements/components/light/spot-light-component-gizmo');
