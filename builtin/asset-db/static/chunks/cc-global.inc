// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

#define MAX_DIR_LIGHTS 4
#define MAX_POINT_LIGHTS 4
#define MAX_SPOT_LIGHTS 4

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
  vec4 cc_dirLightDirection[MAX_DIR_LIGHTS]; // xyz
  vec4 cc_dirLightColor[MAX_DIR_LIGHTS]; // xyz
  // point lights
  vec4 cc_pointLightPositionAndRange[MAX_POINT_LIGHTS]; // xyz w
  vec4 cc_pointLightColor[MAX_POINT_LIGHTS]; // xyz
  // spot lights
  vec4 cc_spotLightPositionAndRange[MAX_SPOT_LIGHTS]; // xyz w
  vec4 cc_spotLightDirection[MAX_SPOT_LIGHTS]; // xyz
  vec4 cc_spotLightColor[MAX_SPOT_LIGHTS]; // xyz
  // shadows
  mat4 cc_matViewProjLight;
  vec4 cc_shadowParam1; // vec4(minDepth, maxDepth, bias, depthScale)
  vec4 cc_shadowParam2; // vec4(darkness, edgeFalloff, texelSize.x, texelSize.y)
};
