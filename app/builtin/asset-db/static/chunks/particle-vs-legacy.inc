
precision mediump float;
#include <particle-common>
in vec3 a_position; // center position
in vec3 a_texCoord;  // xy:vertex index,z:frame index
in vec2 a_texCoord1; // size, angle
in vec4 a_color;
#if CC_USE_STRETCHED_BILLBOARD
in vec3 a_color1; // velocity.x, velocity.y, velocity.z, scale
#endif

#include <cc-local>

vec4 lpvs_main() {
  vec4 pos = vec4(a_position, 1);
#if CC_USE_STRETCHED_BILLBOARD
  vec4 velocity = vec4(a_color1.xyz, 0);
#endif

#if !CC_USE_WORLD_SPACE
//   // simulate in world space. apply cc_matWorld matrix on CPU side.
// #else
  pos = cc_matWorld * pos;
  #if CC_USE_STRETCHED_BILLBOARD
  velocity = cc_matWorld * velocity;
  #endif
#endif

  vec2 cornerOffset = vec2((a_texCoord.xy - 0.5) * a_texCoord1.x);
#if !CC_USE_STRETCHED_BILLBOARD
//   // rotation will not be applied in stretchedBillboard mode(Unity).
// #else
  // rotation
  rotateCorner(cornerOffset, a_texCoord1.y);
#endif

  computeVertPos(pos, cornerOffset
  #if CC_USE_BILLBOARD || CC_USE_VERTICAL_BILLBOARD
    , cc_matView
  #endif
  #if CC_USE_STRETCHED_BILLBOARD
    , cc_cameraPos.xyz
    , velocity
    , frameTile_velLenScale.z
    , frameTile_velLenScale.w
    , a_texCoord1.x
    , a_texCoord.x
  #endif
  );

  pos = cc_matViewProj * pos;

  uv = computeUV(a_texCoord.z, a_texCoord.xy, frameTile_velLenScale.xy) * mainTiling_Offset.xy + mainTiling_Offset.zw;

  color = a_color;

  return pos;
}
