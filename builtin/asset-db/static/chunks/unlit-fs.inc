// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

precision mediump float;
#if USE_TEXTURE
  uniform sampler2D mainTexture;
  in vec2 uv0;
#endif

#if USE_COLOR
  uniform Constant {
    vec4 color;
  };
#endif

vec4 frag () {
  vec4 o = vec4(1, 1, 1, 1);

  #if USE_TEXTURE
    o *= texture(mainTexture, uv0);
  #endif

  #if USE_COLOR
    o *= color;
  #endif

  return o;
}
