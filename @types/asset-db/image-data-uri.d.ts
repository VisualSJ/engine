
declare module 'image-data-uri' {
    export function decode(url: string): null | {
        imageType: string,
        dataBase64: string,
        dataBuffer: Buffer,
    };
}