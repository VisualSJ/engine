// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

#define MAX_DIR_LIGHTS 4
#define MAX_POINT_LIGHTS 4
#define MAX_SPOT_LIGHTS 4

uniform CCForwardLights {
  // directional lights
  vec4 cc_dirLightDirection[MAX_DIR_LIGHTS]; // xyz
  vec4 cc_dirLightColor[MAX_DIR_LIGHTS]; // xyz
  // point lights
  vec4 cc_pointLightPositionAndRange[MAX_POINT_LIGHTS]; // xyz w
  vec4 cc_pointLightColor[MAX_POINT_LIGHTS]; // xyz
  // spot lights
  vec4 cc_spotLightPositionAndRange[MAX_SPOT_LIGHTS]; // xyz w
  vec4 cc_spotLightDirection[MAX_SPOT_LIGHTS]; // xyz
  vec4 cc_spotLightColor[MAX_SPOT_LIGHTS]; // xyz
  // shadows
  // mat4 cc_matViewProjLight;
  // vec4 cc_shadowParam1; // vec4(minDepth, maxDepth, bias, depthScale)
  // vec4 cc_shadowParam2; // vec4(darkness, edgeFalloff, texelSize.x, texelSize.y)
};

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
  vec4 lightColor
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
  ret.lightDir = normalize(lightDir);
  float cosConeAngle = max(0., dot(lightDirection.xyz, -ret.lightDir));
  if (cosConeAngle < lightDirection.w) cosConeAngle = 0.0;
  ret.radiance = lightColor.rgb * attenuation * cosConeAngle;
  return ret;
}
