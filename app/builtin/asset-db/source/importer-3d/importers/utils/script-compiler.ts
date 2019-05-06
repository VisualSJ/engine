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
            cocosImportPlugin(),
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

/*
// Debug
import * as babel from "@babel/core";
const source = `
import { Component, Vec3, vmath, Vec4 as v4 } from "Cocos3D";
import * as ccc from "Cocos3D";
`;
const result = babel.transformSync(source, {plugins: [cocosImportPlugin()]});
if (!result || !result.code) {
    console.error(`Failed.`);
} else {
    console.log(result.code);
}
*/
function cocosImportPlugin() {
    return (): babel.PluginObj => {
        return {
            visitor: {
                ImportDeclaration: {
                    exit: (path) => {
                        const node = path.node;
                        if (node.source.value !== 'Cocos3D') {
                            return;
                        }
                        const decls: babel.types.VariableDeclarator[] = [];
                        const objectProperties: babel.types.ObjectProperty[] = [];
                        const initValue = babel.types.identifier('cc');
                        for (const specifier of node.specifiers) {
                            if (babel.types.isImportSpecifier(specifier)) {
                                const left = babel.types.identifier(specifier.imported.name);
                                if (specifier.imported.name === specifier.local.name) {
                                    objectProperties.push(babel.types.objectProperty(left, left, undefined, true));
                                } else {
                                    const right = babel.types.identifier(specifier.local.name);
                                    objectProperties.push(babel.types.objectProperty(left, right));
                                }
                            } else if (babel.types.isImportDefaultSpecifier(specifier)) {
                                //
                            } else {
                                const asName = specifier.local.name;
                                decls.push(babel.types.variableDeclarator(babel.types.identifier(asName), initValue));
                            }
                        }
                        if (objectProperties.length !== 0) {
                            decls.push(babel.types.variableDeclarator(
                                babel.types.objectPattern(objectProperties), initValue));
                        }
                        const varDecl = babel.types.variableDeclaration('const', decls);
                        path.replaceWith(varDecl);
                    },
                },
            },
        };
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
