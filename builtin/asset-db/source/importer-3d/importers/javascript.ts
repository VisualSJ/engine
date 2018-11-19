'use stirct';

import { Asset, Importer } from 'asset-db';
import { readFile } from 'fs-extra';

const babel = require('@babel/core');
const uuidUtils = require('../../../static/utils/uuid-utils');

export default class JavascriptImporter extends Importer {
    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.2';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'javascript';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        return true;
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
        try {
            // 如果当前资源没有导入，则开始导入当前资源
            if (!(await asset.existsInLibrary('.js'))) {
                const target = await this.compile(asset);

                const header = `
                    'use strict';
                    cc._RF.push(module, '${uuidUtils.compressUuid(asset.uuid)}', '${asset.basename}');
// ${asset.basename}\n
                `;
                const footer = `\ncc._RF.pop();\n`;

                target.code = header + target.code + footer;

                // @ts-ignore
                asset.saveToLibrary('.js', target.code);
                asset.saveToLibrary('.js.map', JSON.stringify(target.map));

                updated = true;
            }
        } catch (err) {
            console.error(err);
        }

        return updated;
    }

    private async compile(asset: Asset) {
        const convert = require('convert-source-map');
        const file = await readFile(asset.source, 'utf8');
        const sourceMap = !!convert.fromSource(file);
        const { code, map = '', } = babel.transformSync(file, {
            ast: false,
            compact: false,
            filename: asset.source,
            highlightCode: false,
            inputSourceMap: sourceMap,
            presets: ['@babel/preset-env', ],
            plugins: [
                ['@babel/plugin-proposal-decorators', { legacy: true, }, ],
                ['@babel/plugin-proposal-class-properties', { loose: true, }, ],
                'add-module-exports',
            ],
            sourceMaps: true,
        });
        return { code, map, };
    }
}
