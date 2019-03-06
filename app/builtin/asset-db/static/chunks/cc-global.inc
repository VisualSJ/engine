// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

uniform CCGlobal {
  // constants
  vec4 cc_time; // x
  vec4 cc_screenSize; // xy zw
  vec4 cc_screenScale; //
  // transforms
  mat4 cc_matView;
  mat4 cc_matViewInv;
  mat4 cc_matProj;
  mat4 cc_matProjInv;
  mat4 cc_matViewProj;
  mat4 cc_matViewProjInv;
  vec4 cc_cameraPos; // xyz
  vec4 cc_mainLitDir; // xyz
  vec4 cc_mainLitColor; // xyz: color, w: intensity
  vec4 cc_ambientSky;
  vec4 cc_ambientGround;
};
