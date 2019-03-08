// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.
#define MAX_LIGHTS 4

uniform CCL_ForwardLights {
  vec4 ccl_sphereLitPos[MAX_LIGHTS]; // xyz: pos
  vec4 ccl_sphereLitSizeRange[MAX_LIGHTS]; // x: size, y: range
  vec4 ccl_sphereLitColor[MAX_LIGHTS]; // xyz: color, w: intensity
  vec4 ccl_spotLitPosSize[MAX_LIGHTS]; // xyz: pos, w: size
  vec4 ccl_spotLitDirRange[MAX_LIGHTS]; // xyz: dir, w: range
  vec4 ccl_spotLitColor[MAX_LIGHTS]; // xyz: color, w: intensity
};
