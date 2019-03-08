// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.
#define MAX_LIGHTS 4

#pragma localData
uniform CCForwardLights {
  vec4 cc_sphereLitPos[MAX_LIGHTS]; // xyz: pos
  vec4 cc_sphereLitSizeRange[MAX_LIGHTS]; // x: size, y: range
  vec4 cc_sphereLitColor[MAX_LIGHTS]; // xyz: color, w: intensity
  vec4 cc_spotLitPosSize[MAX_LIGHTS]; // xyz: pos, w: size
  vec4 cc_spotLitDirRange[MAX_LIGHTS]; // xyz: dir, w: range
  vec4 cc_spotLitColor[MAX_LIGHTS]; // xyz: color, w: intensity
};
