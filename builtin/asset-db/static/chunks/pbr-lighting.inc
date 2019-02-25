// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.
#include <common>
#include <lights>

// Cook-Torrance BRDF cc_matWorld
// D() Normal distribution function (Trowbridge-Reitz GGX)
// https://disney-animation.s3.amazonaws.com/library/s2012_pbs_disney_brdf_notes_v2.pdf
float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  float nom   = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;

  return nom / denom;
}
// G() Geometry function (Smith's Schlick GGX)
// https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
float geometrySchlickGGX(float NdotV, float roughness) {
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;
  float nom   = NdotV;
  float denom = NdotV * (1.0 - k) + k;

  return nom / denom;
}
float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx2 = geometrySchlickGGX(NdotV, roughness);
  float ggx1 = geometrySchlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}
// F() Fresnel equation (Fresnel-Schlick approximation)
// Optimized variant (presented by Epic at SIGGRAPH '13)
// https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  float fresnel = exp2((-5.55473 * cosTheta - 6.98316) * cosTheta);
  return F0 + (1.0 - F0) * fresnel;
}
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  float fresnel = exp2((-5.55473 * cosTheta - 6.98316) * cosTheta);
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * fresnel;
}

// BRDF equation
vec3 brdf(LightInfo lightInfo, vec3 N, vec3 V, vec3 F0, vec3 albedo, float metallic, float roughness) {
  vec3 H = normalize(V + lightInfo.lightDir);
  float NDF = distributionGGX(N, H, roughness);
  float G   = geometrySmith(N, V, lightInfo.lightDir, roughness);
  vec3 F    = fresnelSchlick(max(dot(H, V), 0.0), F0);
  vec3 nominator    = NDF * G * F;
  float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, lightInfo.lightDir), 0.0) + 0.001; // 0.001 to prevent divide by zero.
  vec3 specular = nominator / denominator;
  // kS is equal to Fresnel
  vec3 kS = F;
  // for energy conservation, the diffuse and specular light can't
  // be above 1.0 (unless the surface emits light); to preserve this
  // relationship the diffuse component (kD) should equal 1.0 - kS.
  vec3 kD = vec3(1.0) - kS;
  // multiply kD by the inverse metalness such that only non-metals
  // have diffuse lighting, or a linear blend if partly metal (pure metals
  // have no diffuse light).
  kD *= 1.0 - metallic;
  float NdotL = max(dot(N, lightInfo.lightDir), 0.0);

  return (kD * albedo / PI + specular) * lightInfo.radiance * NdotL;
}

vec3 getPBRLighting(vec3 pos_w, vec3 N, vec3 V, vec3 F0, vec3 albedo, float metallic, float roughness) {
  vec3 Lo = vec3(0.0);
  for (int i = 0; i < MAX_DIR_LIGHTS; i++) {
    if (dot(cc_dirLightColor[i].rgb, cc_dirLightColor[i].rgb) <= 0.0) break;
    LightInfo info = computeDirectionalLighting(cc_dirLightDirection[i], cc_dirLightColor[i]);
    Lo += brdf(info, N, V, F0, albedo, metallic, roughness);
  }
  for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
    if (dot(cc_pointLightColor[i].rgb, cc_pointLightColor[i].rgb) <= 0.0) break;
    LightInfo info = computePointLighting(pos_w, cc_pointLightPositionAndRange[i], cc_pointLightColor[i]);
    Lo += brdf(info, N, V, F0, albedo, metallic, roughness);
  }
  for (int i = 0; i < MAX_SPOT_LIGHTS; i++) {
    if (dot(cc_spotLightColor[i].rgb, cc_spotLightColor[i].rgb) <= 0.0) break;
    LightInfo info = computeSpotLighting(pos_w, cc_spotLightPositionAndRange[i], cc_spotLightDirection[i], cc_spotLightColor[i]);
    Lo += brdf(info, N, V, F0, albedo, metallic, roughness);
  }
  return Lo;
}
