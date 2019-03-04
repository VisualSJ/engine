// Copyright (c) 2017-2019 Xiamen Yaji Software Co., Ltd.

float ComputeEV100(float aperture , float shutterTime , float iso) {
	return log2((aperture * aperture) / shutterTime * 100.0 / iso);
}

float ComputeExposure(float ev100) {
	return 0.833333 * pow(2.0, ev100);
}
