// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

attribute vec3 a_position;
attribute vec2 a_texCoord;
attribute vec4 a_color;

varying vec2 uv0;
varying vec4 color;

uniform ui {
  mat4 cc_matViewProj;
};

vec4 vert () {
  vec4 pos = vec4(a_position, 1);

  pos = cc_matViewProj * pos;

  uv0 = a_texCoord;

  color = a_color;

  return pos;
}
