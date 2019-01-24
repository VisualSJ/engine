// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

uniform CCGlobal {
  // constants
  vec4 cc_time; // x
  vec4 cc_screenSize; // xy zw
  vec4 cc_screenScale; //
  // transforms
  mat4 cc_matProj;
  mat4 cc_matProjInv;
  mat4 cc_matView;
  mat4 cc_matViewInv;
  mat4 cc_matViewProj;
  mat4 cc_matViewProjInv;
  vec4 cc_cameraPos; // xyz
  // directional lights
  vec4 cc_dirLightDirection[4]; // xyz
  vec4 cc_dirLightColor[4]; // xyz
  // point lights
  vec4 cc_pointLightPositionAndRange[4]; // xyz w
  vec4 cc_pointLightColor[4]; // xyz
  // spot lights
  vec4 cc_spotLightPositionAndRange[4]; // xyz w
  vec4 cc_spotLightDirection[4]; // xyz w
  vec4 cc_spotLightColor[4]; // xyz
  // shadows
  mat4 cc_matViewProjLight;
  vec4 cc_shadowParam1; // vec4(minDepth, maxDepth, bias, depthScale)
  vec4 cc_shadowParam2; // vec4(darkness, edgeFalloff, texelSize.x, texelSize.y)
};
