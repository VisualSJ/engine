import { Asset, Importer } from '@editor/asset-db';
import { readFile, readFileSync } from 'fs-extra';
import * as Path from 'path';
// @ts-ignore
import * as uuidUtils from '../../../static/utils/uuid-utils';
import { compile } from './utils/script-compiler';

export default class JavascriptImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.32';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'javascript';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.Asset';
    }

    /**
     * 是否强制刷新
     * @param asset 
     */
    async force(asset: Asset) {
        if (this.assetDB) {
            return !!this.assetDB.uuid2asset[asset.uuid];
        }
        return false;
    }

    /**
     * 实际导入流程
     * 需要自己控制是否生成、拷贝文件
     *
     * 返回是否更新的 boolean
     * 如果返回 true，则会更新依赖这个资源的所有资源
     * @param asset
     */
    public async import(asset: Asset) {
        let updated = false;
        const isPlugin = asset.meta.userData.isPlugin;
        try {
            let code;
            if (isPlugin) {
                code = readFileSync(asset.source, 'utf-8');
                const header = '(function(){var require = undefined;var module = undefined; ';
                const footer = '\n})();\n';
                code = header + code + footer;
            } else {
                const target = await this.compile(asset);
                if (!target) {
                    return false;
                }
                code = target.code;
                asset.saveToLibrary('.js.map', JSON.stringify(target.map));
            }
            if (code) {
                asset.saveToLibrary('.js', code);
            }

            updated = true;
            isPlugin && (asset.meta.userData.importAsPlugin = true);
            !isPlugin && (asset.meta.userData.importAsPlugin = false);
        } catch (err) {
            console.error(err);
        }
        return updated;
    }

    private async compile(asset: Asset) {
        // const convert = require('convert-source-map');
        const file = await readFile(asset.source, 'utf8');
        const isPlugin = asset.meta.userData.isPlugin;
        let baseModuleId = Path.relative(this.assetDB!.options.target, asset.source);
        baseModuleId = baseModuleId.split(/\/|\\/).join('/');
        const moduleId = `project:///${this.assetDB!.options.name}/${baseModuleId}`;
        // const sourceMap = !!convert.fromSource(file);
        const result = compile(file, {
            moduleId,
            filename: asset.source,
            basename: asset.basename,
            compressedUUID: uuidUtils.compressUuid(asset.uuid),
        });
        asset.userData.moduleId = moduleId;
        if (!result) {
            console.error(`Failed to compile ${asset.source}.`);
        }
        return result;
    }
}
