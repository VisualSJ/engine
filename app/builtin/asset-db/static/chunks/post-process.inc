// Copyright (c) 2017-2019 Xiamen Yaji Software Co., Ltd.
// reference: 'moving frostbite to pbr' & UE4 BRDF.usf

vec4 PostProcess(vec4 color, float scale)
{
#if USE_HDR
	color.rgb = SRGBToLinear(color.rgb) * scale;
#endif
	return color;
}

