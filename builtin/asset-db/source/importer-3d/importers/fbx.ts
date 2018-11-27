import convert from '@robertlong/fbx2gltf';
import { Asset } from 'asset-db';
import * as fs from 'fs';
import { mkdirpSync } from 'fs-extra';
import { join, normalize } from 'path';
import * as tmp from 'tmp';
import GltfImporter from './gltf';

export default class FbxImporter extends GltfImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'fbx';
    }

    protected async getGltfFilePath(asset: Asset) {
        const tmpDirDir = this.assetDB!.options.temp;
        const tmpDir = tmp.dirSync({dir: tmpDirDir, prefix: 'fbx2gltf-'});
        const destPath = join(tmpDir.name, `hello.gltf`);
        const gltfPath = await convert(asset.source, destPath);
        console.log(`${asset.source} is converted to: ${gltfPath}`);
        return gltfPath;
    }
}
