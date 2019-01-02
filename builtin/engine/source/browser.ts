'use strict';

const i18n = require('@base/electron-i18n');
const { join } = require('path');
const { existsSync, statSync, readdirSync } = require('fs-extra');
const fse = require('fs-extra');
const path = require('path');

const profile = {
    global: Editor.Profile.load('profile://global/packages/engine.json'),
    local: Editor.Profile.load('profile://local/packages/engine.json'),
};
let pkg: any = null;
let compiler: any = null;

let busy: boolean = false;

export const messages = {
    /**
     * 打开面板
     */
    open() {
        Editor.Panel.open('engine');
    },

    /**
     * 重新编译引擎
     */
    rebuild() {
        return new Promise((resolve, reject) => {
            if (busy) {
                return reject('Compile engine fails: The compilation is in progress...');
            }
            busy = true;
            if (!compiler) {
                busy = false;
                return reject('Compile engine fails: The compiler does not exist.');
            }
            compiler.rebuild((error: Error) => {
                busy = false;
                if (error) {
                    return reject(error);
                }
                resolve();
            });
        });
    },

    /**
     * 查询引擎信息
     */
    'query-info'(type: string) {
        const current = profile.local.get('current');
        const version = current[type];

        let file: string = '';
        if (version === 'custom') {
            file = profile.local.get('custom')[type];
        } else if (version === 'builtin') {
            file = path.join(__dirname, '../../../resources', type, `engine`);
        } else {
            if (!fse.existsSync(file)) {
                file = path.join(Editor.App.home, './engine', type, `${version}`);
            }

            if (!fse.existsSync(file)) {
                file = path.join(__dirname, '../../../resources', type, `${version}`);
            }
        }

        return {
            version,
            path: file,
            utils: path.join(__dirname, '../static/utils', type),
        };
    },
};

function registerI18n(enginePath: string) {
    try {
        // todo
        const dir = join(enginePath, 'editor', 'i18n');
        if (!existsSync(dir)) {
            return;
        }
        const stat = statSync(dir);
        if (!stat.isDirectory()) {
            return;
        }
        const languages = readdirSync(dir);

        languages.map((item: string) => {
            const path = join(dir, item);
            const json = readdirSync(path).reduce((acc: any, cur: string) => {
                const filePath = join(path, cur);
                const data = require(filePath);

                if (acc.ENGINE) {
                    acc.ENGINE = Object.assign(acc.ENGINE, data);
                } else {
                    acc.ENGINE = data;
                }

                return acc;
            }, {});

            i18n.register(json, item);
        });
    } catch (err) {
        console.log(`Load I18n files failed: ${err.message}`);
    }
}

export async function load() {
    // @ts-ignore
    pkg = this;

    // 检查 current 内数据是否正常
    const current = profile.local.get('current') || {};

    // 2d 引擎数据不是 custom 以及 builtin 的情况下，需要检查引擎文件夹是否存在
    if (
        current['2d'] !== 'custom' &&
        current['2d'] !== 'builtin' &&
        (!current['2d'] ||
            !(
                fse.existsSync(path.join(Editor.App.home, './engine', '2d', `${current['2d']}`)) ||
                fse.existsSync(path.join(__dirname, '../../../resources', '2d', `${current['2d']}`))
            ))
    ) {
        current['2d'] = 'builtin';
    }

    // 3d 引擎数据不是 custom 以及 builtin 的情况下，需要检查引擎文件夹是否存在
    if (
        current['3d'] !== 'custom' &&
        current['3d'] !== 'builtin' &&
        (!current['3d'] ||
            !(
                fse.existsSync(path.join(Editor.App.home, './engine', '3d', `${current['3d']}`)) ||
                fse.existsSync(path.join(__dirname, '../../../resources', '3d', `${current['3d']}`))
            ))
    ) {
        current['3d'] = 'builtin';
    }

    profile.local.set('current', current);
    profile.local.save();

    // 检查当前的版本是否需要 quick-compile
    const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);

    if (!fse.existsSync(info.path)) {
        Editor.Dialog.show({
            type: 'error',
            title: 'Engine',
            message: 'Engine failed to load, please check engine directory is correct.',
        });
        return console.warn('engine is not exists.');
    }

    registerI18n(info.path);

    const buildEngine = require('../static/utils/quick-compile/build-engine');
    compiler = await new Promise((resolve) => {
        const engineCompiler = buildEngine(
            {
                enableWatch: false,
                enginePath: info.path,
            },
            () => {
                resolve(engineCompiler);
            }
        );
    });
}

export function unload() {
    compiler = null;
    pkg = null;
}
