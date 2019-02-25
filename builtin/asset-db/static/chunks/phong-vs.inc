// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

precision mediump float;
in vec3 a_position;
in vec3 a_normal;

#include <cc-global>
#include <cc-local>

out vec3 normal_w;
out vec3 pos_w;

uniform TexCoords {
  vec4 tilingOffset;
};

#if USE_DIFFUSE_TEXTURE || USE_NORMAL_TEXTURE || USE_EMISSIVE_TEXTURE
  in vec2 a_texCoord;
  out vec2 uv0;
#endif

#if CC_USE_SKINNING
  #include <skinning>
#endif

#if CC_USE_SHADOW_MAP
  #include <shadow-prepare>
#endif

vec4 vert () {
  vec4 pos = vec4(a_position, 1);
  vec4 normal = vec4(a_normal, 0);

  #if CC_USE_SKINNING
    skinVertex(pos, normal);
  #endif

  pos_w = (cc_matWorld * pos).xyz;
  normal_w = (cc_matWorldIT * normal).xyz;

  #if CC_USE_SHADOW_MAP
    prepareShadowData(pos_w);
  #endif

  #if USE_DIFFUSE_TEXTURE || USE_NORMAL_TEXTURE || USE_EMISSIVE_TEXTURE
    uv0 = a_texCoord * tilingOffset.xy + tilingOffset.zw;
  #endif

  return cc_matViewProj * cc_matWorld * pos;
}
