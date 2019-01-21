// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

attribute vec3 a_position;
attribute vec3 a_normal;

#include <cc-global>
#include <cc-local>

varying vec3 normal_w;
varying vec3 pos_w;

uniform TexCoords {
  vec2 mainTiling;
  vec2 mainOffset;
};

#if USE_DIFFUSE_TEXTURE || USE_NORMAL_TEXTURE || USE_EMISSIVE_TEXTURE
  attribute vec2 a_texCoord1;
  varying vec2 uv0;
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
    uv0 = a_texCoord1 * mainTiling + mainOffset;
  #endif

  return cc_matViewProj * cc_matWorld * pos;
}
