'use strict';

const fs = require('fs');
const path = require('path');

const profile = {
    global: Editor.Profile.load('profile://global/packages/engine.json'),
    local: Editor.Profile.load('profile://local/packages/engine.json'),
};
let pkg: any = null;

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

        let file = path.join(Editor.App.home, './engine', type, `${version}.js`);

        if (!fs.existsSync(file)) {
            file = path.join(__dirname, '../resources', type, `${version}.js`);
        }
        return {
            version,
            path: file,
        };
    },
};

export function load() {
    // @ts-ignore
    pkg = this;

    // 检查 current 内数据是否正常
    const current = profile.local.get('current') || {};

    if (
        !current['2d'] ||
        !(
            fs.existsSync(path.join(Editor.App.home, './engine', '2d', `${current['2d']}.js`)) ||
            fs.existsSync(path.join(__dirname, '../resources', '2d', `${current['2d']}.js`))
        )
    ) {
        current['2d'] = '2.0.0-alpha';
    }

    if (
        !current['3d'] ||
        !(
            fs.existsSync(path.join(Editor.App.home, './engine', '3d', `${current['3d']}.js`)) ||
            fs.existsSync(path.join(__dirname, '../resources', '3d', `${current['3d']}.js`))
        )
    ) {
        current['3d'] = '0.15.0';
    }

    profile.local.set('current', current);
    profile.local.save();
}

export function unload() {}
