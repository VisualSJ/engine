'use strict';

const fse = require('fs-extra');
const path = require('path');

import { compileEngine, rebuild, registerI18n } from './utils';

const profile = {
    default:Editor.Profile.load('profile://default/packages/engine.json'), 
    global: Editor.Profile.load('profile://global/packages/engine.json'),
    local: Editor.Profile.load('profile://local/packages/engine.json'),
};

function getConfig(key: string) {
    if (profile.local.get(`${key.split('.')[0]}.use_local`)) {
        return profile.local.get(key);
    }
    return profile.global.get(key);
}

export const messages = {
    /**
     * 查询引擎配置
     * @param key 
     */
    'get-config'(position: string, key: string) {
        if (position !== 'local' && position !== 'global') {
            return;
        }
        return profile[position].get(key);
    },

    /**
     * 设置引擎配置
     * @param position 
     * @param key 
     * @param value 
     */
    'set-config'(position: string, key: string, value: any) {
        if (position !== 'local' && position !== 'global') {
            return;
        }
        profile[position].set(key, value);
        profile[position].save();
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
        if (getConfig(`${type}.javascript.builtin`)) {
            version = `builtin`;
            directory = path.join(__dirname, '../../../../../resources', type, `engine`);
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

    // 设置默认的 profile
    profile.default.set('2d', {
        use_global: true,
        javascript: {
            builtin: true,
            custom: '',
        },
        native: {
            builtin: true,
            custom: '',
        },
    });
    profile.default.set('3d', {
        use_global: true,
        javascript: {
            builtin: true,
            custom: '',
        },
        native: {
            builtin: true,
            custom: '',
        },
    });

    // 如果查询出来的路径不存在，则提示，并使用 builtin 版本的引擎
    let info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
    if (!fse.existsSync(info.path)) {
        // 弹窗告知引擎路径不存在
        Editor.Dialog.show({
            type: 'error',
            title: 'Engine',
            message: Editor.I18n.t('engine.engine_directory_illegal'),
            buttons: [Editor.I18n.t('engine.confirm')],
        });

        // 强制使用内置引擎，需要区分当前使用的是全局还是本地设置
        // 不保存信息，是因为想要用户自己去重新设置，也有可能是用户自己移动了引擎位置之类的
        if (getConfig(`${Editor.Project.type}.use_global`)) {
            profile.global.set(`${Editor.Project.type}.javascript.builtin`, true);
        } else {
            profile.local.set(`${Editor.Project.type}.javascript.builtin`, true);
        }

        // 重新查询新数据
        info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
    }

    // 尝试编译引擎
    try {
        await compileEngine(info.path);
    } catch (error) {
        // 如果编译失败，弹出警告信息
        console.error(error);
        Editor.Dialog.show({
            type: 'error',
            title: 'Engine',
            message: Editor.I18n.t('engine.engine_compile_failed'),
            buttons: [Editor.I18n.t('engine.confirm')],
        });

        // 将引擎改为内置引擎
        if (getConfig(`${Editor.Project.type}.use_global`)) {
            profile.global.set(`${Editor.Project.type}.javascript.builtin`, true);
        } else {
            profile.local.set(`${Editor.Project.type}.javascript.builtin`, true);
        }

        // 重新查询数据
        info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);

        // 内置引擎继续编译失败，这时候无法启动编辑器
        try {
            await compileEngine(info.path);
        } catch (error) {
            console.error(error);

            // 弹出警告信息，告知已经无法启动引擎
            Editor.Dialog.show({
                type: 'error',
                title: 'Engine',
                message: Editor.I18n.t('engine.engine_compile_crash'),
                buttons: [Editor.I18n.t('engine.confirm')],
            });
        }
    }

    // 注册引擎内的各种 i18n 数据
    registerI18n(info.path);
}

export function unload() {}
