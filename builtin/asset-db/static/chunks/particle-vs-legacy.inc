#include <particle-common>
attribute vec3 a_position; // center position
attribute vec3 a_uv;  // xy:vertex index,z:frame index
attribute vec2 a_uv0; // size, angle
attribute vec4 a_color;
#if USE_STRETCHED_BILLBOARD
attribute vec3 a_color0; // velocity.x, velocity.y, velocity.z, scale
#endif

#include <cc-local>

vec4 lpvs_main() {
  vec4 pos = vec4(a_position, 1);
#if USE_STRETCHED_BILLBOARD
  vec4 velocity = vec4(a_color0.xyz, 0);
#endif

#if !USE_WORLD_SPACE
//   // simulate in world space. apply cc_matWorld matrix on CPU side.
// #else
  pos = cc_matWorld * pos;
  #if USE_STRETCHED_BILLBOARD
  velocity = cc_matWorld * velocity;
  #endif
#endif

  vec2 cornerOffset = vec2((a_uv.xy - 0.5) * a_uv0.x);
#if !USE_STRETCHED_BILLBOARD
//   // rotation will not be applied in stretchedBillboard mode(Unity).
// #else
  // rotation
  rotateCorner(cornerOffset, a_uv0.y);
#endif

  computeVertPos(pos, cornerOffset
  #if USE_BILLBOARD || USE_VERTICAL_BILLBOARD
    , cc_matView
  #endif
  #if USE_STRETCHED_BILLBOARD
    , cc_cameraPos
    , velocity
    , velocityScale
    , lengthScale
    , a_uv0.x
    , a_uv.x
  #endif
  );

  pos = cc_matViewProj * pos;

  uv = computeUV(a_uv.z, a_uv.xy, frameTile) * mainTiling + mainOffset;

  color = a_color;

  return pos;
}
