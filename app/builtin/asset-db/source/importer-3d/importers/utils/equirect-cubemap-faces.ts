// refer to https://github.com/thomcc/equirect-to-cubemap-faces
function clamp(value: number, low: number, high: number) {
    return Math.min(high, Math.max(low, value));
}

function srgbToLinear(value: number) {
    return Math.pow(value, 2.2);
}

const i255 = 1.0 / 255.0;
function betweenZeroAndOne(value: number) {
    return i255 * value;
}

function linearToSRGB(value: number) {
    return Math.pow(value, 0.454545);
}

const ilog2 = 1 / Math.log(2);
function nearestPowerOfTwo(value: number) {
    return 1 << Math.round(Math.log(value) * ilog2);
}

export type ImageSource = HTMLImageElement | HTMLCanvasElement | ImageData;
export enum InterpolationType {
    BILINEAR = 'bilinear',
    NEAREST = 'nearest',
}
export interface TransformOptions {interpolation?: InterpolationType; isRGBE?: boolean; flipTheta?: boolean; }

const DEFAULT_OPTIONS = {
    flipTheta: false,
    interpolation: InterpolationType.BILINEAR,
    isRGBE: false,
};

function transformSingleFace(inPixels: ImageData, faceIdx: number, facePixels: ImageData, opts: TransformOptions) {
    const thetaFlip = opts.flipTheta ? -1 : 1;
    const edge = facePixels.width | 0;

    const inWidth = inPixels.width | 0;
    const inHeight = inPixels.height | 0;
    const inData = inPixels.data;

    const smoothNearest = (opts.interpolation === InterpolationType.NEAREST);
    const rgbe = opts.isRGBE;

    const faceData = facePixels.data;
    const faceWidth = facePixels.width | 0;
    const faceHeight = facePixels.height | 0;
    const face = faceIdx | 0;

    const iFaceWidth2 = 2.0 / faceWidth;
    const iFaceHeight2 = 2.0 / faceHeight;

    for (let j = 0; j < faceHeight; ++j) {
        for (let i = 0; i < faceWidth; ++i) {
            const a = iFaceWidth2 * i;
            const b = iFaceHeight2 * j;
            const outPos = (i + j * edge) << 2;
            let x = 0.0;
            let y = 0.0;
            let z = 0.0;
            // @@NOTE: Tried using explicit matrices for this and didn't see any
            // speedup over the (IMO more understandable) switch. (Probably because these
            // branches should be correctly predicted almost every time).
            switch (face) {
                case 0: x = 1.0 - a; y = 1.0;     z = 1.0 - b; break; // right  (+x)
                case 1: x = a - 1.0; y = -1.0;    z = 1.0 - b; break; // left   (-x)
                case 2: x = b - 1.0; y = a - 1.0; z = 1.0;     break; // top    (+y)
                case 3: x = 1.0 - b; y = a - 1.0; z = -1.0;    break; // bottom (-y)
                case 4: x = 1.0;     y = a - 1.0; z = 1.0 - b; break; // front  (+z)
                case 5: x = -1.0;    y = 1.0 - a; z = 1.0 - b; break; // back   (-z)
            }

            const theta = thetaFlip * Math.atan2(y, x);
            const rad = Math.sqrt(x * x + y * y);
            const phi = Math.atan2(z, rad);

            const uf = 2.0 * (inWidth / 4) * (theta + Math.PI) / Math.PI;
            const vf = 2.0 * (inWidth / 4) * (Math.PI / 2 - phi) / Math.PI;
            const ui = Math.floor(uf) | 0;
            const vi = Math.floor(vf) | 0;

            if (smoothNearest) {
                const inPos = ((ui % inWidth) + inWidth * clamp(vi, 0, inHeight - 1)) << 2;
                faceData[outPos + 0] = inData[inPos + 0] | 0;
                faceData[outPos + 1] = inData[inPos + 1] | 0;
                faceData[outPos + 2] = inData[inPos + 2] | 0;
                faceData[outPos + 3] = inData[inPos + 3] | 0;
            } else {
                // bilinear blend
                const u2 = ui + 1;
                const v2 = vi + 1;
                const mu = uf - ui;
                const nu = vf - vi;

                const pA = ((ui % inWidth) + inWidth * clamp(vi, 0, inHeight - 1)) << 2;
                const pB = ((u2 % inWidth) + inWidth * clamp(vi, 0, inHeight - 1)) << 2;
                const pC = ((ui % inWidth) + inWidth * clamp(v2, 0, inHeight - 1)) << 2;
                const pD = ((u2 % inWidth) + inWidth * clamp(v2, 0, inHeight - 1)) << 2;
                const aFactor = (1.0 - mu) * (1.0 - nu);
                const bFactor = mu * (1.0 - nu);
                const cFactor = (1.0 - mu) * nu;
                const dFactor = mu * nu;
                if (!rgbe) {
                    const aA = betweenZeroAndOne(inData[pA + 3] | 0);
                    const aB = betweenZeroAndOne(inData[pB + 3] | 0);
                    const aC = betweenZeroAndOne(inData[pC + 3] | 0);
                    const aD = betweenZeroAndOne(inData[pD + 3] | 0);
                    const rA = srgbToLinear(betweenZeroAndOne(inData[pA + 0] | 0)) * aA;
                    const gA = srgbToLinear(betweenZeroAndOne(inData[pA + 1] | 0)) * aA;
                    const bA = srgbToLinear(betweenZeroAndOne(inData[pA + 2] | 0)) * aA;
                    const rB = srgbToLinear(betweenZeroAndOne(inData[pB + 0] | 0)) * aB;
                    const gB = srgbToLinear(betweenZeroAndOne(inData[pB + 1] | 0)) * aB;
                    const bB = srgbToLinear(betweenZeroAndOne(inData[pB + 2] | 0)) * aB;
                    const rC = srgbToLinear(betweenZeroAndOne(inData[pC + 0] | 0)) * aC;
                    const gC = srgbToLinear(betweenZeroAndOne(inData[pC + 1] | 0)) * aC;
                    const bC = srgbToLinear(betweenZeroAndOne(inData[pC + 2] | 0)) * aC;
                    const rD = srgbToLinear(betweenZeroAndOne(inData[pD + 0] | 0)) * aD;
                    const gD = srgbToLinear(betweenZeroAndOne(inData[pD + 1] | 0)) * aD;
                    const bD = srgbToLinear(betweenZeroAndOne(inData[pD + 2] | 0)) * aD;
                    const r = (rA * aFactor + rB * bFactor + rC * cFactor + rD * dFactor);
                    const g = (gA * aFactor + gB * bFactor + gC * cFactor + gD * dFactor);
                    const b = (bA * aFactor + bB * bFactor + bC * cFactor + bD * dFactor);
                    const a = (aA * aFactor + aB * bFactor + aC * cFactor + aD * dFactor);
                    const ia = 1.0 / a;
                    faceData[outPos + 3] = (a * 255.0) | 0;
                    faceData[outPos + 0] = (linearToSRGB(r * ia) * 255.0) | 0;
                    faceData[outPos + 1] = (linearToSRGB(g * ia) * 255.0) | 0;
                    faceData[outPos + 2] = (linearToSRGB(b * ia) * 255.0) | 0;
                } else {
                    const aA = Math.pow(2.0, (inData[pA + 3] | 0) - 128.0);
                    const aB = Math.pow(2.0, (inData[pB + 3] | 0) - 128.0);
                    const aC = Math.pow(2.0, (inData[pC + 3] | 0) - 128.0);
                    const aD = Math.pow(2.0, (inData[pD + 3] | 0) - 128.0);
                    const rA = (inData[pA + 0] | 0) * aA;
                    const gA = (inData[pA + 1] | 0) * aA;
                    const bA = (inData[pA + 2] | 0) * aA;
                    const rB = (inData[pB + 0] | 0) * aB;
                    const gB = (inData[pB + 1] | 0) * aB;
                    const bB = (inData[pB + 2] | 0) * aB;
                    const rC = (inData[pC + 0] | 0) * aC;
                    const gC = (inData[pC + 1] | 0) * aC;
                    const bC = (inData[pC + 2] | 0) * aC;
                    const rD = (inData[pD + 0] | 0) * aD;
                    const gD = (inData[pD + 1] | 0) * aD;
                    const bD = (inData[pD + 2] | 0) * aD;
                    const r = (rA / (rA + 255.0) * aFactor + rB / (rB + 255.0) * bFactor + rC / (rC + 255.0) * cFactor + rD / (rD + 255.0) * dFactor);
                    const g = (gA / (gA + 255.0) * aFactor + gB / (gB + 255.0) * bFactor + gC / (gC + 255.0) * cFactor + gD / (gD + 255.0) * dFactor);
                    const b = (bA / (bA + 255.0) * aFactor + bB / (bB + 255.0) * bFactor + bC / (bC + 255.0) * cFactor + bD / (bD + 255.0) * dFactor);
                    const a = aA;
                    const ia = 255.0 / a;
                    faceData[outPos + 3] = inData[pA + 3] | 0 ;
                    faceData[outPos + 0] = clamp(r / (1.0 - r) * ia, 0, 255.0) | 0;
                    faceData[outPos + 1] = clamp(g / (1.0 - g) * ia, 0, 255.0) | 0;
                    faceData[outPos + 2] = clamp(b / (1.0 - b) * ia, 0, 255.0) | 0;
                }
            }
        }
    }
    return facePixels;
}

function transformToCubeFaces(inPixels: ImageData, facePixArray: ImageData[], options: TransformOptions) {
    if (facePixArray.length !== 6) {
        throw new Error('facePixArray length must be 6!');
    }
    for (let face = 0; face < 6; ++face) {
        transformSingleFace(inPixels, face, facePixArray[face], options);
    }
    return facePixArray;
}

function imageGetPixels(image: ImageSource): ImageData {
    if (image instanceof ImageData) {
        return image;
    }
    let canvas = image;
    let ctx: CanvasRenderingContext2D | null;
    if (canvas.tagName !== 'CANVAS') {
        canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx = canvas.getContext('2d');
        (ctx as CanvasRenderingContext2D).drawImage(image, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    } else {
        ctx = (canvas as HTMLCanvasElement).getContext('2d');
    }
    return (ctx as CanvasRenderingContext2D).getImageData(0, 0, canvas.width, canvas.height);
}

export function equirectToCubemapFaces(image: ImageSource, faceSize?: number | null, options?: TransformOptions): HTMLCanvasElement[] {
    const inPixels = imageGetPixels(image);

    if (!faceSize) {
        faceSize = nearestPowerOfTwo(image.width / 4) | 0;
    }

    const faces: HTMLCanvasElement[] = [];
    for (let i = 0; i < 6; ++i) {
        const c = document.createElement('canvas');
        c.width = faceSize;
        c.height = faceSize;
        faces.push(c);
    }

    if (!options) {
        options = DEFAULT_OPTIONS;
    }

    transformToCubeFaces(inPixels, faces.map((canv) => {
        return (canv.getContext('2d') as CanvasRenderingContext2D).createImageData(canv.width, canv.height);
    }), options)
    .forEach((imageData, i) => {
        (faces[i].getContext('2d') as CanvasRenderingContext2D).putImageData(imageData, 0, 0);
    });
    return faces;
}
