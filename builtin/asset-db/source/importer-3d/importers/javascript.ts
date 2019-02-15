'use stirct';

import * as Babel from '@babel/core';
import { Asset, Importer } from '@editor/asset-db';
import { File, Program } from 'babel-types';
import { readFile } from 'fs-extra';
// @ts-ignore
import * as uuidUtils from '../../../static/utils/uuid-utils';

export default class JavascriptImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.4';
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
        // const convert = require('convert-source-map');
        const file = await readFile(asset.source, 'utf8');
        // const sourceMap = !!convert.fromSource(file);
        const { code, map = '' } = Babel.transformSync(file, {
            ast: false,
            highlightCode: false,
            sourceMaps: 'inline',
            sourceFileName: `custom-scripts:///${asset.basename}.${asset.extname}`,
            filename: asset.source,
            compact: false,
            presets: [
                require('@babel/preset-env'),
            ],
            plugins: [
                [
                    require('@babel/plugin-proposal-decorators'),
                    { legacy: true },
                ],
                [
                    require('@babel/plugin-proposal-class-properties'),
                    { loose: true },
                ],
                require('babel-plugin-add-module-exports'),
                scriptAssetPlugin(asset),
            ],
        });
        return { code, map };
    }
}

function scriptAssetPlugin(asset: Asset) {
    return (babel: typeof Babel): Babel.Plugin => {
        return {
            visitor: {
                // CallExpression(nodePath, state) {
                //     if (nodePath.node.callee.type === 'Identifier' && nodePath.node.callee.name === 'require') {
                //         nodePath.node.arguments.push(identifier('__filename'));
                //     }
                // },
                Program: {
                    exit: (nodePath, parent) => {
                        // injectRF(babel, nodePath.node as Program, asset);
                    },
                },
            },
            post(state) {
                const { ast } = state as { ast: File };
                injectRF(babel, ast.program, asset);
            },
        };
    };
}

function injectRF(babel: typeof Babel, program: Program, asset: Asset) {
    const header = `
    'use strict';
    cc._RF.push(module, '${uuidUtils.compressUuid(asset.uuid)}', '${asset.basename}');
    // ${asset.basename}\n
    `;
    insertHeader(babel, program, header);

    const footer = `\ncc._RF.pop();\n`;
    insertFooter(babel, program, footer);
}

function insertHeader(babel: typeof Babel, node: Program, content: string) {
    const headerProgram = (babel.parse(content) as File).program;
    node.body.unshift(...headerProgram.body);
}

function insertFooter(babel: typeof Babel, node: Program, content: string) {
    const footerProgram = (babel.parse(content) as File).program;
    node.body.push(...footerProgram.body);
}
