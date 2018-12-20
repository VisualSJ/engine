
declare module 'fbx2gltf' {
    export default function convert(srcFile: string, destFile: string, opts?: Array<any>): Promise<string>;
}