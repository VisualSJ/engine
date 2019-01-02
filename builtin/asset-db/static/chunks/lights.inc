// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

#include <cc-global>

struct LightInfo {
  vec3 lightDir;
  vec3 radiance;
};

// directional light
LightInfo computeDirectionalLighting(
  vec4 lightDirection,
  vec4 lightColor
) {
  LightInfo ret;
  ret.lightDir = -normalize(lightDirection.xyz);
  ret.radiance = lightColor.rgb;
  return ret;
}

// point light
LightInfo computePointLighting(
  vec3 worldPosition,
  vec4 lightPositionAndRange,
  vec4 lightColor,
) {
  LightInfo ret;
  vec3 lightDir = lightPositionAndRange.xyz - worldPosition;
  float attenuation = max(0.0, 1.0 - length(lightDir) / lightPositionAndRange.w);
  ret.lightDir = normalize(lightDir);
  ret.radiance = lightColor.rgb * attenuation;
  return ret;
}

// spot light
LightInfo computeSpotLighting(
  vec3 worldPosition,
  vec4 lightPositionAndRange,
  vec4 lightDirection,
  vec4 lightColor
) {
  LightInfo ret;
  vec3 lightDir = lightPositionAndRange.xyz - worldPosition;
  float attenuation = max(0., 1.0 - length(lightDir) / lightPositionAndRange.w);
  float cosConeAngle = max(0., dot(lightDirection.xyz, -lightDir));
  cosConeAngle = cosConeAngle < lightDirection.w ? 0.0 : cosConeAngle;
  cosConeAngle = pow(cosConeAngle, lightColor.w);
  ret.lightDir = normalize(lightDir);
  ret.radiance = lightColor.rgb * attenuation * cosConeAngle;
  return ret;
}
