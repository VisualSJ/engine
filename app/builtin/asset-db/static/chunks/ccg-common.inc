// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

uniform CCG_Common {
  vec4 ccg_time; // x
  vec4 ccg_screenSize; // xy zw
  vec4 ccg_screenScale; //
  mat4 ccg_matView;
  mat4 ccg_matViewInv;
  mat4 ccg_matProj;
  mat4 ccg_matProjInv;
  mat4 ccg_matViewProj;
  mat4 ccg_matViewProjInv;
  vec4 ccg_cameraPos; // xyz
  vec4 ccg_exposure; // x: exp, y: expInv, w: expScale
  vec4 ccg_mainLitDir; // xyz
  vec4 ccg_mainLitColor; // xyz: color, w: intensity
  vec4 ccg_ambientSky;
  vec4 ccg_ambientGround;
};
