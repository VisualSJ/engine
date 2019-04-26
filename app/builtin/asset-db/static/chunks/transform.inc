
vec4 quaternionFromAxisAngle(float angle, vec3 axis){
  angle /= 2.;
  float s = sin(angle);
  vec4 res;
  res.xyz = s * axis;
  res.w = cos(angle);
  return res;
}

mat4 matrixFromRT(vec4 q, vec3 p){
  float x2 = q.x + q.x;
  float y2 = q.y + q.y;
  float z2 = q.z + q.z;
  float xx = q.x * x2;
  float xy = q.x * y2;
  float xz = q.x * z2;
  float yy = q.y * y2;
  float yz = q.y * z2;
  float zz = q.z * z2;
  float wx = q.w * x2;
  float wy = q.w * y2;
  float wz = q.w * z2;

  return mat4(
    1. - (yy + zz), xy + wz, xz - wy, 0,
    xy - wz, 1. - (xx + zz), yz + wx, 0,
    xz + wy, yz - wx, 1. - (xx + yy), 0,
    p.x, p.y, p.z, 1
  );
}

void scaleMatrix(inout mat4 m, float s){
  m[0].xyz *= s;
  m[1].xyz *= s;
  m[2].xyz *= s;
}