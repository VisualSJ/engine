declare module 'parse-data-url' {
    export default function parseDataUrl(url: string): null | {
        mediaType: string,
        contentType: string,
        charset: string,
        base64: boolean,
        data: string,
        toBuffer: () => Uint8Array
    };
}

declare module 'image-data-uri' {
    export function decode(url: string): null | {
        imageType: string,
        dataBase64: string,
        dataBuffer: Buffer,
    };
}

declare module 'equirect-cubemap-faces-js' {
    export default function equirectToCubemapFaces(image: HTMLImageElement): Array<HTMLCanvasElement>;
}

declare module 'tga-js' {
    export default class TGA {
        width: number;
        height: number;
        getImageData(imageData?: ImageData): ImageData | {width: number, height: number, data: Uint8ClampedArray};
        constructor();
        load(data: Buffer): null;
    }
}

