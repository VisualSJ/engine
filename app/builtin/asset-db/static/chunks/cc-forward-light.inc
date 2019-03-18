// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.
#define MAX_LIGHTS 2

#pragma builtin(local)
uniform CCForwardLight {
  vec4 cc_sphereLitPos[MAX_LIGHTS]; // xyz: pos
  vec4 cc_sphereLitSizeRange[MAX_LIGHTS]; // x: size, y: range
  vec4 cc_sphereLitColor[MAX_LIGHTS]; // xyz: color, w: intensity
  vec4 cc_spotLitPos[MAX_LIGHTS]; // xyz: pos
  vec4 cc_spotLitSizeRangeAngle[MAX_LIGHTS]; // x: size, y: range, z: spotAngle
  vec4 cc_spotLitDir[MAX_LIGHTS]; // xyz: dir
  vec4 cc_spotLitColor[MAX_LIGHTS]; // xyz: color, w: intensity
};
