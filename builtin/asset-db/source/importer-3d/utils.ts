'use strict';

/**
 * 判断 val 的值是否超出
 * @param val
 * @param min
 * @param max
 */
export function clamp(val: number, min: number, max: number) {
    return val < min ? min : val > max ? max : val;
}

/**
 * 获取一个像素的颜色值
 * @param data
 * @param x
 * @param y
 * @param imgWidth
 */
export function getPixiel(buffer: Buffer, x: number, y: number, imgWidth: number) {
     const idx = x * 4 + y * imgWidth * 4;
     return {
         r: buffer[idx],
         g: buffer[idx + 1],
         b: buffer[idx + 2],
         a: buffer[idx + 3],
     };
}

/**
 * 获取非透明像素的矩形大小
 * @param data
 * @param w
 * @param h
 * @param trimThreshold
 */
export function getTrimRect(buffer: Buffer, w: number, h: number, trimThreshold: number) {
    // A B C
    // D x F
    // G H I

    const threshold = trimThreshold;
    let tx = w;
    let ty = h;
    let tw = 0;
    let th = 0;
    let x;
    let y;

    // trim A B C
    for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
            if (getPixiel(buffer, x, y, w).a >= threshold) {
                ty = y;
                y = h;
                break;
            }
        }
    }
    // trim G H I
    for (y = h - 1; y >= ty; y--) {
        for (x = 0; x < w; x++) {
            if (getPixiel(buffer, x, y, w).a >= threshold) {
                th = y - ty + 1;
                y = 0;
                break;
            }
        }
    }
    // trim D
    for (x = 0; x < w; x++) {
        for (y = ty; y < ty + th; y++) {
            if (getPixiel(buffer, x, y, w).a >= threshold) {
                tx = x;
                x = w;
                break;
            }
        }
    }
    // trim F
    for (x = w - 1; x >= tx; x--) {
        for (y = ty; y < ty + th; y++) {
            if (getPixiel(buffer, x, y, w).a >= threshold) {
                tw = x - tx + 1;
                x = 0;
                break;
            }
        }
    }

    return [tx, ty, tw, th];
}
