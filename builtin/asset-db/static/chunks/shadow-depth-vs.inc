// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

attribute vec3 a_position;

uniform mat4 model;
uniform mat4 _lightViewProjMatrix_;
uniform float _minDepth_;
uniform float _maxDepth_;
uniform float _bias_;
varying float vDepth;

#if USE_SKINNING
  #include <skinning>
#endif

vec4 vert() {
  vec4 pos = vec4(a_position, 1);

  #if USE_SKINNING
    mat4 skinMat = skinMatrix();
    pos = skinMat * pos;
  #endif

  // compute vDepth according to active camera's _minDepth_ and _maxDepth_.
  vDepth = ((gl_Position.z + _minDepth_) / (_minDepth_ + _maxDepth_)) + _bias_;
  return _lightViewProjMatrix_ * model * pos;
}
