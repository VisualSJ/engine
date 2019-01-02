// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

#if USE_NORMAL_TEXTURE
#extension GL_OES_standard_derivatives : enable
#endif

#include <common>
#include <gamma-correction>

#include <cc-global>
#include <lights>

struct Lighting {
  vec3 diffuse;
  vec3 specular;
};

vec3 brdf(LightInfo info, vec3 N, vec3 V, float glossiness) {
  Lighting res;
  res.diffuse = info.radiance * max(0.0, dot(N, info.lightDir));
  float ndh = 0.0;
  if (res.diffuse > 0.0) {
    vec3 H = normalize(V + info.lightDir);
    float NdotH = max(0.0, dot(N, H));
    NdotH = pow(NdotH, max(1.0, glossiness * 128.0));
  }
  res.specular = info.radiance * NdotH;
  return res;
};

Lighting getPhongLighting(vec3 pos_w, vec3 N, vec3 V, float glossiness) {
  Lighting result;
  result.diffuse = vec3(0, 0, 0);
  result.specular = vec3(0, 0, 0);
  for (int i = 0; i < CC_NUM_DIR_LIGHTS; i++) {
    Lighting info = brdf(computeDirectionalLighting(cc_dirLightDirection[i], cc_dirLightColor[i]), N, V, glossiness);
    result.diffuse += info.diffuse;
    result.specular += info.specular;
  }
  for (int i = 0; i < CC_NUM_POINT_LIGHTS; i++) {
    Lighting info = brdf(computePointLighting(pos_w, cc_pointLightPositionAndRange[i], cc_pointLightColor[i]), N, V, glossiness);
    result.diffuse += info.diffuse;
    result.specular += info.specular;
  }
  for (int i = 0; i < CC_NUM_SPOT_LIGHTS; i++) {
    Lighting info = brdf(computeSpotLighting(pos_w, cc_spotLightPositionAndRange[i], cc_spotLightDirection[i], cc_spotLightColor[i]), N, V, glossiness);
    result.diffuse += info.diffuse;
    result.specular += info.specular;
  }
  return result;
}

#if CC_USE_SHADOW_MAP
  #include <packing>
  #include <shadow-mapping>
#endif

varying vec3 normal_w;
varying vec3 pos_w;

#if USE_DIFFUSE_TEXTURE || USE_NORMAL_TEXTURE || USE_EMISSIVE_TEXTURE
  varying vec2 uv0;
#endif

struct phongMaterial
{
  vec3 diffuse;
  vec3 emissive;
  vec3 specular;
  float glossiness;
  float opacity;
};

uniform Constants {
  vec4 diffuseColor;
  vec3 emissiveColor;
  vec3 specularColor;
  float glossiness;
  float alphaTestThreshold;
};

#if USE_DIFFUSE_TEXTURE
  uniform sampler2D diffuse_texture;
#endif

#if USE_EMISSIVE && USE_EMISSIVE_TEXTURE
  uniform sampler2D emissive_texture;
#endif

#if USE_SPECULAR && USE_SPECULAR_TEXTURE
  uniform sampler2D specular_texture;
#endif

#if USE_NORMAL_TEXTURE
  uniform sampler2D normal_texture;
  vec3 getNormal(vec3 pos, vec3 normal) {
    vec3 q0 = vec3( dFdx( pos.x ), dFdx( pos.y ), dFdx( pos.z ) );
    vec3 q1 = vec3( dFdy( pos.x ), dFdy( pos.y ), dFdy( pos.z ) );
    vec2 st0 = dFdx( uv0.st );
    vec2 st1 = dFdy( uv0.st );
    vec3 S = normalize( q0 * st1.t - q1 * st0.t );
    vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
    vec3 N = normal;
    vec3 mapN = texture2D(normal_texture, uv0).rgb * 2.0 - 1.0;
    mapN.xy = 1.0 * mapN.xy;
    mat3 tsn = mat3( S, T, N );
    return normalize( tsn * mapN );
  }
#endif

phongMaterial getPhongMaterial() {
  phongMaterial result;

  #if USE_DIFFUSE_TEXTURE
    vec4 baseColor = diffuseColor * gammaToLinearSpaceRGBA(texture2D(diffuse_texture, uv0));
    result.diffuse = baseColor.rgb;
    result.opacity = baseColor.a;
  #else
    result.diffuse = diffuseColor.rgb;
    result.opacity = diffuseColor.a;
  #endif

  #if USE_EMISSIVE
    result.emissive = emissiveColor;
    #if USE_EMISSIVE_TEXTURE
      result.emissive *= gammaToLinearSpaceRGB(texture2D(emissive_texture, uv0).rgb);
    #endif
  #endif

  #if USE_SPECULAR
    result.specular = specularColor;
    #if USE_SPECULAR_TEXTURE
      result.specular = gammaToLinearSpaceRGB(texture2D(specular_texture, uv0).rgb);
    #endif

    result.glossiness = glossiness;
  #endif

  return result;
}

vec4 composePhongShading(Lighting lighting, phongMaterial mtl, float shadow) {
  vec4 o = vec4(0.0, 0.0, 0.0, 1.0);

  //diffuse is always calculated
  o.xyz = lighting.diffuse * mtl.diffuse;
  #if USE_EMISSIVE
    o.xyz += mtl.emissive;
  #endif
  #if USE_SPECULAR
    o.xyz += lighting.specular * mtl.specular;
  #endif
  o.xyz *= shadow;
  o.w = mtl.opacity;

  return o;
}

vec4 frag () {
  Lighting phongLighting;
  vec3 viewDirection = normalize(cc_cameraPos - pos_w);

  phongMaterial mtl = getPhongMaterial();
  #if USE_ALPHA_TEST
    if(mtl.opacity < alphaTestThreshold) discard;
  #endif
  vec3 normal = normalize(normal_w);
  #if USE_NORMAL_TEXTURE
    normal = getNormal(pos_w, normal);
  #endif
  phongLighting = getPhongLighting(pos_w, normal, viewDirection, mtl.glossiness);
  phongLighting.diffuse += vec3(0.5); // scene ambient

  #if CC_USE_SHADOW_MAP
    vec4 finalColor = composePhongShading(phongLighting, mtl, computeShadow());
  #else
    vec4 finalColor = composePhongShading(phongLighting, mtl, 1.0);
  #endif

  return linearToGammaSpaceRGBA(finalColor);
}
