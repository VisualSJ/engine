// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

attribute vec3 a_position;

#include <cc-global>
#include <cc-local>

#if USE_TEXTURE
  attribute vec2 a_texCoord;
  uniform TexCoords {
    vec2 mainTiling;
    vec2 mainOffset;
  };
  varying vec2 uv0;
#endif

#if CC_USE_SKINNING
  #include <skinning>
#endif

vec4 vert () {
  vec4 pos = vec4(a_position, 1);

  #if CC_USE_SKINNING
    skinVertex(pos);
  #endif

  pos = cc_matViewProj * cc_matWorld * pos;

  #if USE_TEXTURE
    uv0 = a_texCoord * mainTiling + mainOffset;
  #endif

  return pos;
}
