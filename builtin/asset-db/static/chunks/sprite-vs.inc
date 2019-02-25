// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

precision mediump float;
in vec3 a_position;
in vec2 a_texCoord;
in vec4 a_color;

out vec2 uv0;
out vec4 color;

uniform UI {
  mat4 u_matViewProj;
};

vec4 vert () {
  vec4 pos = vec4(a_position, 1);

  pos = u_matViewProj * pos;

  uv0 = a_texCoord;

  color = a_color;

  return pos;
}
