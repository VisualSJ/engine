// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

out vec4 posLightspace;
out float vDepth;

void prepareShadowData(vec3 pos_w) {
  posLightspace = cc_matViewProjLight * vec4(pos_w, 1.0);
  vDepth = (posLightspace.z + cc_shadowParam1.x) / (cc_shadowParam1.x + cc_shadowParam1.y);
}
