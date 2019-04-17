import { Asset, Importer } from '@editor/asset-db';
import { rejects } from 'assert';
import { File, Program } from 'babel-types';
import { resolve } from 'dns';
import { readFileSync } from 'fs-extra';
import TypeScript from 'typescript';
import JavascriptImporter from './javascript';
const Csm = require('convert-source-map');
// @ts-ignore
import * as uuidUtils from '../../../static/utils/uuid-utils';

export default class ScriptImporter  extends JavascriptImporter {
    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.5';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'typescript';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.Asset';
    }

//     /**
//      * 实际导入流程
//      * 需要自己控制是否生成、拷贝文件
//      *
//      * 返回是否更新的 boolean
//      * 如果返回 true，则会更新依赖这个资源的所有资源
//      * @param asset
//      */
//     public async import(asset: Asset) {
//         let updated = false;
//         try {
//             const target: any = await this.compile(asset);
//             const header = `
// 'use strict';
// cc._RF.push(module, '${uuidUtils.compressUuid(asset.uuid)}', '${asset.basename}');
// // ${asset.basename}\n
//             `;
//             const footer = `\ncc._RF.pop();\n`;

//             target.code = header + target.code + footer;
//             // @ts-ignore
//             asset.saveToLibrary('.js', target.code);
//             asset.saveToLibrary('.js.map', JSON.stringify(target.map));

//             updated = true;
//         } catch (err) {
//             console.error(err);
//         }
//         return updated;
//     }

//     private async compile(asset: Asset) {
//         return new Promise((resolve, reject) => {
//             let data: any;
//             let scripStr: any;
//             try {
//                 scripStr = readFileSync(asset.source, 'utf-8');
//                 data = TypeScript.transpileModule(scripStr, {
//                     compilerOptions: {arget: 'ES5',
//                         sourceMap: true,
//                         allowJS: true,
//                         experimentalDecorators: true,
//                         allowSyntheticDefaultImports: true,
//                         pretty: true,
//                         noEmitHelpers: true,
//                         noImplicitUseStrict: true,
//                         module: TypeScript.ModuleKind.CommonJS,
//                     },
//                 });
//             } catch (error) {
//                 reject(error);
//             }
//             const map = JSON.parse(data.sourceMapText);
//             map.sourcesContent = [scripStr];
//             map.file = '';
//             data.sourceMapObject = map;
//             data.outputText = Csm.removeMapFileComments(data.outputText);
//             resolve({code: data.outputText, map});
//         });
//     }
}
