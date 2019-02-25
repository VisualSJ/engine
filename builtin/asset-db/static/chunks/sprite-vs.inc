// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.
#include <cc-global>

precision mediump float;
in vec3 a_position;
in vec2 a_texCoord;
in vec4 a_color;

out vec2 uv0;
out vec4 color;

vec4 vert () {
  vec4 pos = vec4(a_position, 1);

  pos = cc_matViewProj * pos;

  uv0 = a_texCoord;

  color = a_color;

  return pos;
}
