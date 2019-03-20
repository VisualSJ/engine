// Copyright (c) 2017-2019 Xiamen Yaji Software Co., Ltd.

#include <cc-global>

vec4 PostProcess(vec4 color)
{
#if CC_USE_HDR
	color.rgb = mix(color.rgb, pow(color.rgb, vec3(2.2)) * cc_exposure.w, vec3(cc_exposure.z));
#endif
	return color;
}
