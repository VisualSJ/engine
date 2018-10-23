'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

const profile = {
    global: Editor.Profile.load('profile://global/packages/engine.json'),
    local: Editor.Profile.load('profile://local/packages/engine.json'),
};
let pkg: any = null;
let compiler: any = null; // quick-compile 生成的编译器

export const messages = {

    /**
     * 打开面板
     */
    open() {
        Editor.Panel.open('engine');
    },

    /**
     * 查询引擎信息
     */
    'query-info'(type: string) {
        const current = profile.local.get('current');
        const version = current[type];
        let compile = false;

        let file: string = '';
        if (version === 'custom') {
            file = profile.local.get('custom')[type];
            compile = true;
        } else {
            file = path.join(Editor.App.home, './engine', type, `${version}.js`);

            if (!fs.existsSync(file)) {
                file = path.join(__dirname, '../resources', type, `${version}.js`);
            }

            if (!fs.existsSync(file)) {
                file = path.join(Editor.App.home, './engine', type, `${version}`);
                compile = true;
            }

            if (!fs.existsSync(file)) {
                file = path.join(__dirname, '../resources', type, `${version}`);
                compile = true;
            }
        }

        return {
            version,
            compile,
            path: file,
            utils: path.join(__dirname, '../static/utils', type),
        };
    },
};

export async function load() {
    // @ts-ignore
    pkg = this;

    // 检查 current 内数据是否正常
    const current = profile.local.get('current') || {};

    if (
        current['2d'] !== 'custom' &&
        (!current['2d'] ||
        !(
            fs.existsSync(path.join(Editor.App.home, './engine', '2d', `${current['2d']}.js`)) ||
            fs.existsSync(path.join(__dirname, '../resources', '2d', `${current['2d']}.js`)) ||
            fs.existsSync(path.join(Editor.App.home, './engine', '2d', `${current['2d']}`)) ||
            fs.existsSync(path.join(__dirname, '../resources', '2d', `${current['2d']}`))
        ))
    ) {
        current['2d'] = '2.0.0-alpha';
    }

    if (
        current['3d'] !== 'custom' &&
        (!current['3d'] ||
        !(
            fs.existsSync(path.join(Editor.App.home, './engine', '3d', `${current['3d']}.js`)) ||
            fs.existsSync(path.join(__dirname, '../resources', '3d', `${current['3d']}.js`)) ||
            fs.existsSync(path.join(Editor.App.home, './engine', '3d', `${current['3d']}`)) ||
            fs.existsSync(path.join(__dirname, '../resources', '3d', `${current['3d']}`))
        ))
    ) {
        current['3d'] = '0.15.0';
    }

    profile.local.set('current', current);
    profile.local.save();

    // 检查当前的版本是否需要 quick-compile
    const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);

    if (info.compile) {

        if (fs.existsSync(info.path)) {
            return console.warn('engine is not exists.');
        }

        const buildEngine = require('../static/utils/quick-compile/build-engine');
        compiler = await new Promise((resolve) => {
            const engineCompiler = buildEngine({
                enableWatch: false,
                enginePath: info.path,
            }, () => {
                resolve(engineCompiler);
            });
        });

    }
}

export function unload() {}
