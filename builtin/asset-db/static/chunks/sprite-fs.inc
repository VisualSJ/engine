// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

precision mediump float;
uniform sampler2D mainTexture;
in vec2 uv0;
in vec4 color;

vec4 frag () {
  vec4 o = vec4(1, 1, 1, 1);

  o *= texture(mainTexture, uv0);
  o *= color;

  return o;
}
