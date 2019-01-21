// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

attribute vec3 a_position;

#include <cc-global>
#include <cc-local>

varying float vDepth;

#if CC_USE_SKINNING
  #include <skinning>
#endif

vec4 vert() {
  vec4 pos = vec4(a_position, 1);

  #if CC_USE_SKINNING
    mat4 skinMat = skinMatrix();
    pos = skinMat * pos;
  #endif

  // compute vDepth according to active camera's minDepth and maxDepth.
  vDepth = ((gl_Position.z + cc_shadowParam1.x) / (cc_shadowParam1.x + cc_shadowParam1.y)) + cc_shadowParam1.z;
  return cc_matViewProjLight * cc_matWorld * pos;
}
