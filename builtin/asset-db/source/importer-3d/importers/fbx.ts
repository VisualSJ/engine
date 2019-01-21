import { Asset } from '@editor/asset-db';
import convert from 'fbx2gltf';
import * as fs from 'fs';
import { ensureDirSync } from 'fs-extra';
import { basename, join, relative } from 'path';
import GltfImporter from './gltf';

export default class FbxImporter extends GltfImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return `${super.version}8`;
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'fbx';
    }

    // 我们必须把fbx先复制到临时目录里，因为fbx转gltf的过程中（可能）会产生.fbm文件夹
    // 如果不复制，会在assets下面产生.fbm并被asset-db导入产生.fbm.meta信息，
    // 但是`@robertlong/fbx2gltf`会将产生的.fbm删除掉，这就会造成asset-db报错，提示找不到源文件。
    // 为了避免这样的数据竞争发生，我们直接隔离转换环境。
    protected async getGltfFilePath(asset: Asset) {
        const tmpDirDir = this.assetDB!.options.temp;

        const tmpDir = join(tmpDirDir, `fbx2gltf-${asset.uuid}`);

        ensureDirSync(tmpDir);

        const resultGltfPath = join(tmpDir, `destination_out`, `destination.gltf`);

        const statusFilePath = join(tmpDir, `__conversion_status.json`);

        const expectedStatus: ConversionStatus = {
            mtimeMs: fs.statSync(asset.source).mtimeMs,
            version: this.version,
        };

        if (fs.existsSync(statusFilePath)) {
            const conversionStatus =  JSON.parse(
                fs.readFileSync(statusFilePath).toString()) as ConversionStatus;
            if (isSameConversionStatus(conversionStatus, expectedStatus) && fs.existsSync(resultGltfPath)) {
                return resultGltfPath;
            }
        }

        const tmpFbxPath = join(tmpDir, basename(asset.source));
        fs.copyFileSync(asset.source, tmpFbxPath);

        const destPath = join(tmpDir, `destination.gltf`);
        await convert(tmpFbxPath, destPath);

        if (fs.existsSync(resultGltfPath)) {
            console.log(`${tmpFbxPath}(from ${asset.source}) is converted to: ${resultGltfPath}`);
            fs.writeFileSync(statusFilePath, JSON.stringify(expectedStatus, undefined, 2));
            return resultGltfPath;
        }

        throw new Error(`Failed to process fbx file ${asset.source}.`);
    }
}

interface ConversionStatus {
    mtimeMs: number;
    version: string;
}

function isSameConversionStatus(lhs: ConversionStatus, rhs: ConversionStatus) {
    return lhs.mtimeMs === rhs.mtimeMs &&
        lhs.version === rhs.version;
}
