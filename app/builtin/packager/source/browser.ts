'use strict';

let pkg: any = null;
import { existsSync } from 'fs';
import { copy, ensureDirSync, outputFile, readJsonSync, remove } from 'fs-extra';
import { basename, join } from 'path';

export const messages = {
    open() {
        Editor.Panel.open('packager');
    },

    // 启用和禁用
    async enable(path: string, enable: boolean) {
        if (enable === true) {
            // @ts-ignore
            return await Editor.Package.enable(path);
        }

        if (enable === false) {
            // @ts-ignore
            return await Editor.Package.disable(path);
        }
    },

    // 移除
    async remove(path: string) {
        try {
            // @ts-ignore
            await Editor.Package.unregister(path);
            // @ts-ignore
            await remove(path);
        } catch (error) {
            console.error(error);
            return false;
        }
        return true;
    },

    async 'add-package'(type: string) {
        const path = await addPackage(type);
        if (!path) {
            return false;
        }
        // @ts-ignore
        await Editor.Package.register(path);
        return true;
    },

    async 'import-package'(type: string) {
        const path =  await importPackage(type);
        if (!path) {
            return false;
        }
        // @ts-ignore
        Editor.Package.register(path);
        return true;
    },

};

export function load() {
    // @ts-ignore
    pkg = this;

}

export function unload() { }

/**
 * 创建新插件
 * @param {string} path
 * @param {string} type
 */
async function addPackage(type: string = 'project') {
    const rootPath = type === 'project' ? Editor.App.project : Editor.App.home;
    const pkgPath = join(rootPath, './packages');
    if (!existsSync(pkgPath)) {
        ensureDirSync(pkgPath);
    }

    const [filePath] = await Editor.Dialog.saveFile({
        title: Editor.I18n.t('packager.menu.add'),
        label: Editor.I18n.t('packager.menu.addLabel'),
        root: pkgPath,
    });

    if (!filePath || filePath === pkgPath) {
        return '';
    }

    const packageTemplate = join(__dirname, './../static/package');

    // 拷贝所有文件
    try {
        await copy(packageTemplate, filePath);

        // 重命名
        const packageFile = join(filePath, './package.json');
        const packageContent = readJsonSync(packageFile);
        packageContent.name = basename(filePath);
        await outputFile(packageFile, JSON.stringify(packageContent, null, 2));
    } catch (error) {
        console.warn(`${Editor.I18n.t('packager.menu.addError')} \n${filePath}`);
        return '';
    }

    return filePath;
}

async function importPackage(type: string = 'project') {
    const rootPath = type === 'project' ? Editor.App.project : Editor.App.home;
    let pkgPath = join(rootPath, './packages');
    if (!existsSync(pkgPath)) {
        ensureDirSync(pkgPath);
    }

    const [filePath] = await Editor.Dialog.openDirectory({
        title: Editor.I18n.t('packager.menu.selectDirectory'),
        root: pkgPath,
    });

    if (!filePath || filePath === pkgPath) {
        return '';
    }

    pkgPath = join(pkgPath, basename(filePath));
    try {
        await copy(filePath, pkgPath);
    } catch (error) {
        console.warn(`${Editor.I18n.t('packager.menu.importError')} \n${filePath}`);
        return '';
    }

    return pkgPath;
}
