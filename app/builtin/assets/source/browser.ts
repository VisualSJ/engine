'use strict';
import { spawn } from 'child_process';
import { shell } from 'electron';
import { existsSync, outputFileSync, readFileSync } from 'fs-extra';
import { join } from 'path';
import { parse } from 'plist';

const profile = {
    default: Editor.Profile.load('profile://default/packages/assets.json'),
    global: Editor.Profile.load('profile://global/packages/assets.json'),
    local: Editor.Profile.load('profile://local/packages/assets.json'),
};

const fileExts: any = { // 记录各类型文件的默认打开方式
    picture_editor: [
        '.png',
        '.jpg',
        '.apng',
        '.gif',
        '.jpge',
    ],
    script_editor: [
        '.js',
        '.ts',
        '.mtl',
        '.pmtl',
        '.effect',
        '.fbx',
        '.prefab',
        '.mesh',
    ],
};

export const messages = {
    'get-config'(position: string, key: string) {
        if (position !== 'local' && position !== 'global') {
            return;
        }
        return profile[position].get(key);
    },
    'set-config'(position: string, key: string, value: any) {
        if (position !== 'local' && position !== 'global') {
            return;
        }

        profile[position].set(key, value);
        profile[position].save();
    },
    open() {
        Editor.Panel.open('assets');
    },
    /**
     * 暂存数据：
     * 折叠状态，字段 expand
     * 排序方式，字段 sort
     */
    staging(json: any) {
        profile.local.set('state', json);
        profile.local.save();
    },

    /**
     * 查询暂存的折叠数据
     * 编辑器配置默认节点折叠状态：
     * 排序方式：sort 为 'name' 或 'ext'
     */
    async 'query-staging'() {
        return profile.local.get('state');
    },

    /**
     * 打开资源的方式
     * @param asset
     */
    async 'open-asset'(asset: IOpenAsset) {
        const { ext, file, uuid } = asset;

        if (ext === '.scene') {
            Editor.Ipc.sendToPackage('scene', 'open-scene', asset.uuid);
            return;
        }

        if (ext === '.fire') {
            await Editor.Dialog.show({
                type: 'warning',
                buttons: [], // 只留一个 确定 按钮
                title: Editor.I18n.t('assets.operate.dialogWaining'),
                message: Editor.I18n.t('assets.deprecate.fire'),
            });

            Editor.Ipc.sendToPackage('scene', 'open-scene', asset.uuid);
            return;
        }

        // 查询是否有自定义的打开方式
        const rule: IOpenAssetRule = profile.global.get(ext);

        if (!rule.execPath) {
            // 再去 prefereces 获取默认打开方式
            const editJson = await Editor.Ipc.requestToPackage('preferences', 'get-config', 'edit');
            rule.execPath = editJson[rule.defaultExec];

            if (!rule.execPath) {
                // 没有配置的走系统默认
                shell.openItem(file);
                return false;
            }
        }

        let { execPath } = rule;

        let args = [];
        let cmd = '';
        if (process.platform === 'darwin') {
            if (execPath.endsWith('.app')) {
                execPath = join(execPath, '/Contents/MacOS/');
                const plistObj = parse(readFileSync(join(execPath, '../Info.plist'), 'utf8'));
                // @ts-ignore
                const fileName = join(execPath, plistObj.CFBundleExecutable);
                execPath = fileName;
            }

            cmd = 'open';
            args = ['-a', execPath, file];
        } else {
            cmd = execPath;
            args = [file];
        }

        const child = spawn(cmd, args, {
            detached: true,
            stdio: 'ignore',
        });
        child.unref();

        return true;
    },
};

export function load() {
    // 设置默认的 profile
    profile.default.set('state', {
        use_global: true,
        expand: false,
        sort: 'name',
    });

    const wizards = Object.keys(fileExts);
    for (const wizard of wizards) {
        const exts = fileExts[wizard];
        exts.forEach((ext: string) => {
            // 设置默认的 profile 一个文件后缀一条
            profile.default.set(ext, {
                use_global: true,
                defaultExec: wizard, // 没有配置的，再去 preference 找这个 wizard 的配置
                execPath: '', // 程序路径
                args: '', // 备用的 cmd 命令行使用的参数
            });
        });
    }
}

export function unload() { }
