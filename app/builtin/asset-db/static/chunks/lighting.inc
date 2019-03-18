// Copyright (c) 2017-2019 Xiamen Yaji Software Co., Ltd.
// reference: 'moving frostbite to pbr' & UE4 BRDF.usf

float SmoothDistAtt2(float distSqr, float invSqrAttRadius)
{
	float factor = distSqr * invSqrAttRadius;	// ^2
	float factor2 = factor * factor;			// ^4
	float factor3 = factor2 * factor2;			// ^8
	float smoothFactor = clamp(1.0 - factor3 * factor3, 0.0, 1.0);
	return smoothFactor * smoothFactor;
}

float SmoothDistAtt(float distSqr, float invSqrAttRadius)
{
	float factor = distSqr * invSqrAttRadius;
	float smoothFactor = clamp(1.0 - factor * factor, 0.0, 1.0);
	return smoothFactor * smoothFactor;
}

float GetDistAtt(float distSqr, float invSqrAttRadius)
{
	float attenuation = 1.0 / max(distSqr, 0.01*0.01);
	attenuation *= SmoothDistAtt(distSqr , invSqrAttRadius);
	return attenuation;
}

float GetAngleAtt(vec3 L, vec3 litDir, float litAngleScale, float litAngleOffset)
{
	float cd = dot(litDir, L);
	float attenuation = clamp(cd * litAngleScale + litAngleOffset, 0.0, 1.0);
	return (attenuation * attenuation);
}

float GGXMobile(float roughness, float NoH, vec3 H, vec3 N)
{
	vec3 NxH = cross(N, H);
	float OneMinusNoHSqr = dot(NxH, NxH);
	float a = roughness * roughness;
	float n = NoH * a;
	float p = a / (OneMinusNoHSqr + n * n);
	return p * p;
}

float CalcSpecular(float roughness, float NoH, vec3 H, vec3 N)
{
	return (roughness*0.25 + 0.25) * GGXMobile(roughness, NoH, H, N);
}

vec3 BRDFApprox(vec3 specular, float roughness, float NoV)
{
	const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
	const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( -9.28 * NoV ) ) * r.x + r.y;
	vec2 AB = vec2( -1.04, 1.04 ) * a004 + r.zw;
	AB.y *= clamp(50.0 * specular.g, 0.0, 1.0);
	return specular * AB.x + AB.y;
}
