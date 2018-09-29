'use strict';

export async function thumbnail(asset: ItreeAsset) {
    // @ts-ignore
    const base64: string = await toDataURL(asset.files[0], 20, 20);
    // @ts-ignore
    if (asset.importer !== 'texture' || asset.files[0] === '') {
        console.error(`asset ${asset.source} load thumbnail fail.`);
        return '';
    }
    return base64;
}

async function toDataURL(src: string, width: number, height: number) {
    const img = document.createElement('img');
    img.src = src;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context: any = canvas.getContext('2d');

    await new Promise((resolve, reject) => {
        img.addEventListener('load', () => {
            resolve(img);
        });
        img.addEventListener('error', () => {
            reject('thumbnail load fail');
        });
    });

    const imgWidth = img.width;
    const imgHeight = img.height;
    const rate = imgWidth / imgHeight;
    let dx;
    let dy;
    let sx;
    let sy;
    let canvasw = width;
    let canvash = height;
    let canvasx = 0;
    let canvasy = 0;

    // 放大或者居中裁切
    if (imgWidth <= width && imgHeight <= height) { // 宽高都小于canvas尺寸
        dx = imgWidth;
        dy = imgHeight;
        sx = 0;
        sy = 0;
        if (rate > 1) {
            canvasw = width;
            canvash = canvasw / rate;
            canvasx = 0;
            canvasy = (height - canvash) / 2;
        } else {
            canvash = height;
            canvasw = canvash * rate;
            canvasy = 0;
            canvasx = (width - canvasw) / 2;
        }
    } else if (rate < 1) { // 宽度小于高度时
        dx = imgWidth;
        dy = dx;
        sx = 0;
        sy = (imgHeight - dy) / 2;
    } else { // 高度小于宽度时
        dx = imgHeight;
        dy = dx;
        sx = (imgWidth - dx) / 2;
        sy = 0;
    }
    context.drawImage(img, sx, sy, dx, dy, canvasx, canvasy, canvasw, canvash);
    return canvas.toDataURL('image/png');

}
