
import { PNG } from 'pngjs';
import TGA from 'tga-js';

export function convertTGA(data: Buffer): Promise<{extName: string, data: Buffer}> {
    return new Promise((resolve, reject) => {
        const tga = new TGA();
        tga.load(data);
        const imageData: any = tga.getImageData();
        const png = new PNG({width: imageData.width, height: imageData.height });
        png.data = Buffer.from(imageData.data);
        const buffer: Buffer[] = [];
        png.on('data', (data: Buffer) => {
            buffer.push(data);
        });
        png.on('end', () => {
            resolve({
                extName: '.png',
                data: Buffer.concat(buffer),
            });
        });
        png.on('error', (err) => {
            reject(err);
        });
        png.pack();
    });
}
