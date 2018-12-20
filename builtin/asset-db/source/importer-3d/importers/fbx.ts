import convert from '@robertlong/fbx2gltf';
import { Asset } from 'asset-db';
import * as fs from 'fs';
import { mkdirpSync } from 'fs-extra';
import { basename, join } from 'path';
import * as tmp from 'tmp';
import GltfImporter from './gltf';

export default class FbxImporter extends GltfImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return `${super.version}1`;
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'fbx';
    }

    protected async getGltfFilePath(asset: Asset) {
        const tmpDirDir = this.assetDB!.options.temp;
        const tmpDir = tmp.dirSync({dir: tmpDirDir, prefix: 'fbx2gltf-'});

        // 我们必须把fbx先复制到临时目录里，因为fbx转gltf的过程中（可能）会产生.fbm文件夹
        // 如果不复制，会在assets下面产生.fbm并被asset-db导入产生.fbm.meta信息，
        // 但是`@robertlong/fbx2gltf`会将产生的.fbm删除掉，这就会造成asset-db报错，提示找不到源文件。
        // 为了避免这样的数据竞争发生，我们直接隔离转换环境。
        const tmpFbxPath = join(tmpDir.name, basename(asset.source));
        fs.copyFileSync(asset.source, tmpFbxPath);

        const destPath = join(tmpDir.name, `destination.gltf`);
        const gltfPath = await convert(tmpFbxPath, destPath);

        console.log(`${tmpFbxPath}(from ${asset.source}) is converted to: ${gltfPath}`);
        return gltfPath;
    }
}
