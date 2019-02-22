// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

precision mediump float;
in vec3 a_position;

#include <cc-global>
#include <cc-local>

#if USE_TEXTURE
  in vec2 a_texCoord;
  uniform TexCoords {
    vec4 tilingAndOffset;
  };
  out vec2 uv0;
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
    uv0 = a_texCoord * tilingAndOffset.xy + tilingAndOffset.zw;
  #endif

  return pos;
}
