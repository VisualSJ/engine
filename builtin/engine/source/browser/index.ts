'use strict';

const fse = require('fs-extra');
const path = require('path');

import { compileEngine, completionProfile, rebuild, registerI18n } from './utils';

const profile = {
    global: Editor.Profile.load('profile://global/packages/engine.json'),
    local: Editor.Profile.load('profile://local/packages/engine.json'),
};

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
        rebuild();
    },

    /**
     * 查询引擎信息
     */
    'query-info'(type: string): IEngineInfo {
        let directory;
        let version;

        // 是否使用内置引擎
        if (profile.local.get(`${type}.javascript.builtin`)) {
            version = `builtin`;
            directory = path.join(__dirname, '../../../../resources', type, `engine`);
        } else {
            version = `custom`;
            directory = profile.local.get(`${type}.javascript.custom`);
        }

        return {
            version,
            path: directory,
            utils: path.join(__dirname, '../../static/utils', type),
        };
    },
};

export async function load() {
    // 补全 profile 数据
    completionProfile();

    // 检查当前的版本是否需要 quick-compile
    let info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);

    // 如果查询出来的路径不存在，则提示，并使用 builtin 版本的引擎
    if (!fse.existsSync(info.path)) {
        Editor.Dialog.show({
            type: 'error',
            title: 'Engine',
            message: Editor.I18n.t('engine.engine_directory_illegal'),
            buttons: [Editor.I18n.t('engine.confirm')],
        });
        profile.local.set(`${Editor.Project.type}.javascript.builtin`, true);
        profile.local.save();
        info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
    }

    try {
        await compileEngine(info.path);
    } catch (error) {
        console.error(error);
        Editor.Dialog.show({
            type: 'error',
            title: 'Engine',
            message: Editor.I18n.t('engine.engine_compile_failed'),
            buttons: [Editor.I18n.t('engine.confirm')],
        });
        profile.local.set(`${Editor.Project.type}.javascript.builtin`, true);
        profile.local.save();
        info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
        await compileEngine(info.path);
    }

    // 注册引擎内的各种 i18n 数据
    registerI18n(info.path);
}

export function unload() {}
