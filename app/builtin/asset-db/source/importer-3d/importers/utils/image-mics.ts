
import { PNG } from 'pngjs';
import TGA from 'tga';

export function convertTGA(data: Buffer) {
    try {
        const tga = new TGA(data);
        const png = new PNG({width: tga.width, height: tga.height });
        png.data = tga.pixels;
        const result = png.pack();
        return {data: result.data, extName: '.png'};
    } catch (error) {
        return null;
    }
}
