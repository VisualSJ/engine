import * as babel from '@babel/core';
import { TemplateBuilderOptions } from '@babel/template';

interface IOptions {
    moduleId: string;
    filename: string;
    compressedUUID: string;
    basename: string;
}

interface IResult {
    code: string;
    map?: string;
}

export function compile(source: string, options: IOptions): IResult | null {
    const result = babel.transformSync(source, {
        ast: false,
        highlightCode: false,
        sourceMaps: 'inline',
        sourceFileName: options.moduleId,
        moduleId: options.moduleId,
        filename: options.filename,
        compact: false,
        presets: [
            require('@babel/preset-env'),
            require('@babel/preset-typescript'),
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
            scriptAssetPlugin(options),
            require('@babel/plugin-transform-modules-systemjs'),
        ],
    });
    if (!result || !result.code) {
        return null;
    }
    return {
        code: result.code,
    };
}

function scriptAssetPlugin(options: IOptions) {
    return (): babel.PluginObj => {
        return {
            visitor: {
                Program: {
                    exit: (path) => {
                        const originalProgram = path.node;
                        const COMPRESSED_UUID = babel.types.stringLiteral(options.compressedUUID);
                        const _RF = babel.types.identifier('_RF');
                        const head = buildRFHead(options.basename)({ COMPRESSED_UUID, _RF });
                        const footer = buildRFFooter(options.basename)({ _RF });
                        const stmts = [head].concat(originalProgram.body, [footer]);
                        originalProgram.body = stmts;
                        // path.replaceWith(babel.types.program(
                        //     stmts,
                        //     originalProgram.directives
                        // ));
                    },
                },
            },
            post(state) {
            },
        };
    };
}

const buildRFxOptions: TemplateBuilderOptions = {
    preserveComments: true,
};

const buildRFHead = (basename: string) => babel.template.statement(`
    cc._RF.push(window.module || {}, COMPRESSED_UUID, "${basename}"); // begin ${basename}
`, buildRFxOptions);

const buildRFFooter = (basename: string) => babel.template.statement(`
    cc._RF.pop(); // end ${basename}
`, buildRFxOptions);
