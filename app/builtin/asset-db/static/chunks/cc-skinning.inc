// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

in vec4 a_weights;
in vec4 a_joints;

#pragma builtin(local)
uniform CCSkinning {
  vec4 cc_matJoint[65 * 3];
  vec4 cc_jointsTextureSize;
};

#if CC_USE_JOINTS_TEXTURE
#pragma builtin(local)
uniform sampler2D cc_jointsTexture;
mat4 getBoneMatrix(const in float i) {
  float size = cc_jointsTextureSize.x;
  float j = i * 4.0;
  float x = mod(j, size);
  float y = floor(j / size);

  float dx = 1.0 / size;
  float dy = 1.0 / size;

  y = dy * (y + 0.5);

  vec4 v1 = texture(cc_jointsTexture, vec2(dx * (x + 0.5), y));
  vec4 v2 = texture(cc_jointsTexture, vec2(dx * (x + 1.5), y));
  vec4 v3 = texture(cc_jointsTexture, vec2(dx * (x + 2.5), y));
  vec4 v4 = texture(cc_jointsTexture, vec2(dx * (x + 3.5), y));

  return mat4(v1, v2, v3, v4);
}
#else
mat4 getBoneMatrix(const in float i) {
  vec4 _0 = cc_matJoint[3 * int(i) + 0];
  vec4 _1 = cc_matJoint[3 * int(i) + 1];
  vec4 _2 = cc_matJoint[3 * int(i) + 2];
  return mat4(
      vec4(_0.x, _0.y, _0.z, 0),
      vec4(_0.w, _1.x, _1.y, 0),
      vec4(_1.z, _1.w, _2.x, 0),
      vec4(_2.y, _2.z, _2.w, 1)
  );
}
#endif

mat4 skinMatrix() {
  return
    getBoneMatrix(a_joints.x) * a_weights.x +
    getBoneMatrix(a_joints.y) * a_weights.y +
    getBoneMatrix(a_joints.z) * a_weights.z +
    getBoneMatrix(a_joints.w) * a_weights.w;
}

void skinVertex(inout vec4 a1) {
  mat4 m = skinMatrix();
  a1 = m * a1;
}

void skinVertex(inout vec4 a1, inout vec4 a2) {
  mat4 m = skinMatrix();
  a1 = m * a1;
  a2 = m * a2;
}

void skinVertex(inout vec4 a1, inout vec4 a2, inout vec4 a3) {
  mat4 m = skinMatrix();
  a1 = m * a1;
  a2 = m * a2;
  a3 = m * a3;
}
