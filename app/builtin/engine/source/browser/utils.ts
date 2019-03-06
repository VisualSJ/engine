'use strict';

import { existsSync, readdirSync, statSync  } from 'fs-extra';
import { join } from 'path';

const i18n = require('@base/electron-i18n');

const profile = {
    global: Editor.Profile.load('profile://global/packages/engine.json'),
    local: Editor.Profile.load('profile://local/packages/engine.json'),
};

export function completionProfile() {
    // 兼容旧版本数据
    (() => {
        const local2D = profile.local.get('current.2d');
        const local3D = profile.local.get('current.3d');
        if (local2D) {
            profile.local.remove('current.2d');
            local2D !== 'builtin' && profile.local.set('2d.javascript.builtin', true);
            local2D !== 'builtin' && profile.local.set('2d.javascript.custom', local2D);
        }
        if (local3D) {
            profile.local.remove('current.3d');
            local2D !== 'builtin' && profile.local.set('3d.javascript.builtin', true);
            local3D !== 'builtin' && profile.local.set('3d.javascript.custom', local3D);
        }
    })();

    // 2d
    if (profile.global.get('2d.javascript.builtin') === undefined) {
        profile.global.set('2d.javascript.builtin', true);
        profile.global.set('2d.javascript.custom', '');
    }
    if (profile.global.get('2d.native.builtin') === undefined) {
        profile.global.set('2d.native.builtin', true);
        profile.global.set('2d.native.custom', '');
    }

    if (profile.local.get('2d.javascript.builtin') === undefined) {
        profile.local.set('2d.javascript.builtin', profile.global.get('2d.javascript.builtin'));
        profile.local.set('2d.javascript.custom', profile.global.get('2d.javascript.custom'));
    }
    if (profile.local.get('2d.native.builtin') === undefined) {
        profile.local.set('2d.native.builtin', profile.global.get('2d.native.builtin'));
        profile.local.set('2d.native.custom', profile.global.get('2d.native.custom'));
    }

    // 3d
    if (profile.global.get('3d.javascript.builtin') === undefined) {
        profile.global.set('3d.javascript.builtin', true);
        profile.global.set('3d.javascript.custom', '');
    }
    if (profile.global.get('3d.native.builtin') === undefined) {
        profile.global.set('3d.native.builtin', true);
        profile.global.set('3d.native.custom', '');
    }

    if (profile.local.get('3d.javascript.builtin') === undefined) {
        profile.local.set('3d.javascript.builtin', profile.global.get('3d.javascript.builtin'));
        profile.local.set('3d.javascript.custom', profile.global.get('3d.javascript.custom'));
    }
    if (profile.local.get('3d.native.builtin') === undefined) {
        profile.local.set('3d.native.builtin', profile.global.get('3d.native.builtin'));
        profile.local.set('3d.native.custom', profile.global.get('3d.native.custom'));
    }
}

let compiler: any = null;

export async function compileEngine(directiroy: string) {
    // 开始第一次编译引擎
    const buildEngine = require('../../static/utils/quick-compile/build-engine');
    compiler = await new Promise((resolve) => {
        const engineCompiler = buildEngine(
            {
                enableWatch: false,
                enginePath: directiroy,
            },
            () => {
                resolve(engineCompiler);
            }
        );
    });
}

export function registerI18n(enginePath: string) {
    try {
        // 检查路径是否存在
        const dir = join(enginePath, 'editor', 'i18n');
        if (!existsSync(dir)) {
            return;
        }

        // 检查路径是否合法
        const stat = statSync(dir);
        if (!stat.isDirectory()) {
            return;
        }

        // 遍历所有的语言种类
        const languages = readdirSync(dir);

        languages.map((item: string) => {
            const path = join(dir, item);

            // 合并语言目录下所有的 js 文件
            const json = readdirSync(path).reduce((acc: any, cur: string) => {
                const filePath = join(path, cur);
                try {
                    const data = require(filePath);
                    if (acc.ENGINE) {
                        acc.ENGINE = Object.assign(acc.ENGINE, data);
                    } else {
                        acc.ENGINE = data;
                    }
                } catch (error) { }
                return acc;
            }, {});

            // 注册语言数据
            i18n.register(json, item);
        });
    } catch (err) {
        console.log(`Load I18n files failed: ${err.message}`);
    }
}

let busy: boolean = false;

export async function rebuild() {
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
}
