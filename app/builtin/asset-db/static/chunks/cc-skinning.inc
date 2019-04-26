// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

in vec4 a_weights;
in vec4 a_joints;

#if CC_USE_JOINTS_TEXTURE
  #pragma builtin(local)
  uniform CCSkinningTextureCase {
    vec4 cc_jointsTextureSize;
  };
#else
  #pragma builtin(local)
  uniform CCSkinning {
    vec4 cc_matJoint[65 * 3];
  };
#endif

#if CC_USE_JOINTS_TEXTURE
#pragma builtin(local)
uniform sampler2D cc_jointsTexture;
#if CC_USE_JOINTS_TEXTURE_RGBA8888
float decode32(vec4 rgba) {
    float Sign = 1.0 - step(128.0,rgba[0])*2.0;
    float Exponent = 2.0 * mod(rgba[0],128.0) + step(128.0,rgba[1]) - 127.0;

    // From Arjan's answer.
    if (Exponent == -127.0) {
        return 0.0;
    }

    float Mantissa = mod(rgba[1],128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + float(0x800000);

    // Original
    // float Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 )); 
    // return Result;

    // From Arjan's answer.
    return Sign * exp2(Exponent - 23.0) * Mantissa;
}
vec4 decodevec4 (vec4 x, vec4 y, vec4 z, vec4 w) {
    return vec4(
        decode32(x * 255.0),
        decode32(y * 255.0),
        decode32(z * 255.0),
        decode32(w * 255.0)
    );
}
mat4 getBoneMatrix(const in float i) {
  float size = cc_jointsTextureSize.x;
  float j = i * 16.0;
  float x = mod(j, size);
  float y = floor(j / size);

  float dx = 1.0 / size;
  float dy = 1.0 / size;

  y = dy * (y + 0.5);

  vec4 v1 = decodevec4(
      texture(cc_jointsTexture, vec2(dx * (x + 0.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 1.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 2.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 3.5), y))
  );
  vec4 v2 = decodevec4(
      texture(cc_jointsTexture, vec2(dx * (x + 4.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 5.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 6.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 7.5), y))
  );
  vec4 v3 = decodevec4(
      texture(cc_jointsTexture, vec2(dx * (x + 8.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 9.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 10.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 11.5), y))
  );
  vec4 v4 = decodevec4(
      texture(cc_jointsTexture, vec2(dx * (x + 12.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 13.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 14.5), y)),
      texture(cc_jointsTexture, vec2(dx * (x + 15.5), y))
  );

  return mat4(v1, v2, v3, v4);
}
#else
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
#endif
#if CC_BINDPOSE_COMPUTATION_DEFERED
  mat4 skinMatrix() {
    return
      getBoneMatrix(a_joints.x * 2.0 + 1.0) * getBoneMatrix(a_joints.x * 2.0 + 0.0) * a_weights.x +
      getBoneMatrix(a_joints.y * 2.0 + 1.0) * getBoneMatrix(a_joints.y * 2.0 + 0.0) * a_weights.y +
      getBoneMatrix(a_joints.z * 2.0 + 1.0) * getBoneMatrix(a_joints.z * 2.0 + 0.0) * a_weights.z +
      getBoneMatrix(a_joints.w * 2.0 + 1.0) * getBoneMatrix(a_joints.w * 2.0 + 0.0) * a_weights.w;
  }
#else
  mat4 skinMatrix() {
    return
      getBoneMatrix(a_joints.x) * a_weights.x +
      getBoneMatrix(a_joints.y) * a_weights.y +
      getBoneMatrix(a_joints.z) * a_weights.z +
      getBoneMatrix(a_joints.w) * a_weights.w;
  }
#endif
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
mat4 skinMatrix() {
  return
    getBoneMatrix(a_joints.x) * a_weights.x +
    getBoneMatrix(a_joints.y) * a_weights.y +
    getBoneMatrix(a_joints.z) * a_weights.z +
    getBoneMatrix(a_joints.w) * a_weights.w;
}
#endif

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
