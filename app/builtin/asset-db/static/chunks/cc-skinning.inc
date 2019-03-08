// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

in vec4 a_weights;
in vec4 a_joints;

uniform CCSkinning {
  mat4 cc_matJoint[128];
  vec4 cc_jointsTextureSize;
};

#if CC_USE_JOINTS_TEXTURE
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
  return cc_matJoint[int(i)];
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
