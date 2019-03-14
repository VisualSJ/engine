// Copyright (c) 2017-2019 Xiamen Yaji Software Co., Ltd.
// reference: 'moving frostbite to pbr' & UE4 BRDF.usf

vec4 PostProcess(vec4 color, float scale, float isHDR)
{
#if USE_HDR
	color.rgb = mix(color.rgb, pow(color.rgb, vec3(2.2)) * scale, vec3(isHDR));
#endif
	return color;
}

