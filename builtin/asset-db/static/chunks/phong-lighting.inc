// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.
#include <lights>

struct Lighting {
  vec3 diffuse;
  vec3 specular;
};

Lighting brdf(LightInfo info, vec3 N, vec3 V, float glossiness) {
  Lighting res;
  res.diffuse = info.radiance * max(0.0, dot(N, info.lightDir));
  vec3 H = normalize(V + info.lightDir);
  float NdotH = max(0.0, dot(N, H));
  NdotH = pow(NdotH, max(1.0, glossiness * 128.0));
  res.specular = info.radiance * NdotH;
  return res;
}

Lighting getPhongLighting(vec3 pos_w, vec3 N, vec3 V, float glossiness) {
  Lighting result;
  result.diffuse = vec3(0, 0, 0);
  result.specular = vec3(0, 0, 0);
  for (int i = 0; i < MAX_DIR_LIGHTS; i++) {
    if (dot(cc_dirLightColor[i].rgb, cc_dirLightColor[i].rgb) <= 0.0) break;
    Lighting info = brdf(computeDirectionalLighting(cc_dirLightDirection[i], cc_dirLightColor[i]), N, V, glossiness);
    result.diffuse += info.diffuse;
    result.specular += info.specular;
  }
  for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
    if (dot(cc_pointLightColor[i].rgb, cc_pointLightColor[i].rgb) <= 0.0) break;
    Lighting info = brdf(computePointLighting(pos_w, cc_pointLightPositionAndRange[i], cc_pointLightColor[i]), N, V, glossiness);
    result.diffuse += info.diffuse;
    result.specular += info.specular;
  }
  for (int i = 0; i < MAX_SPOT_LIGHTS; i++) {
    if (dot(cc_spotLightColor[i].rgb, cc_spotLightColor[i].rgb) <= 0.0) break;
    Lighting info = brdf(computeSpotLighting(pos_w, cc_spotLightPositionAndRange[i], cc_spotLightDirection[i], cc_spotLightColor[i]), N, V, glossiness);
    result.diffuse += info.diffuse;
    result.specular += info.specular;
  }
  return result;
}
