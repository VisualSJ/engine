'use strict';

let pkg: any = null;
import { existsSync } from 'fs';
import { copySync, ensureDirSync, outputJsonSync, readJsonSync } from 'fs-extra';
import { basename, join } from 'path';

/**
 * 打开 package-manager 面板
 */
export const messages = {
    open() {
        Editor.Panel.open('package-manager');
    },
    // 获取插件管理器内存储的插件信息
    'get-packgaes'() {
        const packages: any[] = [];
        const tempPkgs = Editor.Package.packages;
        Object.keys(tempPkgs).forEach((name: any) => {
            // @ts-ignore
            packages.push(tempPkgs[name]);
        });
        return packages;
    },
    // 处理插件(reload disabled enable)
    'handle-packages'(cmd: string, path: string, type: string, flag: boolean) {
        // @ts-ignore
        if (!Editor.Package[cmd]) {
            return;
        }
        flag = !!flag;
        // @ts-ignore
        Editor.Package[cmd](path, type, flag);
    },
    'add-packages'(type: string = 'project') {
        addPackages(type);
    },
    'add-packages:global'() {
        addPackages('home');
    },
    'add-packages:project'() {
        addPackages('project');
    },
    'import-packages'(type: string = 'project') {
        importPackages(type);
    },
    'import-packages:global'() {
        importPackages('home');
    },
    'import-packages:project'() {
        importPackages('project');
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
    Editor.Package.on('updatePlugin', () => {
        Editor.Ipc.sendToAllPanels('package-manager:update-packages');
    });
}

export function unload() {

}

/**
 * 创建新插件
 * @param {string} path
 * @param {string} type
 */
function addPackages(type: string = 'project') {
    // @ts-ignore
    const pkgPath = join(Editor.App[type], './packages');
    if (!existsSync(pkgPath)) {
        ensureDirSync(pkgPath);
    }
    const path = join(pkgPath, './package');
    const templatePath = join(__dirname, './../static/package');
    Editor.Dialog.saveFile({
        title: '请输入插件名称',
        root: path,
        label: '创建插件包',
    }).then((filePath: string) => {
        if (!filePath || filePath.length < 1) {
            return;
        }
        const json = readJsonSync(join(templatePath, './package.json'));
        json.name = basename(filePath);
        outputJsonSync(join(templatePath, './package.json'), json);
        // @ts-ignore
        copySync(templatePath, filePath);
    });
}

function importPackages(type: string = 'project') {
    // @ts-ignore
    const pkgPath = join(Editor.App[type], './packages');
    if (!existsSync(pkgPath)) {
        ensureDirSync(pkgPath);
    }
    const path = join(pkgPath, './package');
    Editor.Dialog.openDirectory({
        title: '请选择插件包文件夹',
        label: '导入插件包',
        root: path,
    }).then((filePath: string) => {
        if (!filePath || filePath.length < 1) {
            return;
        }
        // @ts-ignore
        copySync(filePath, path);
    });
}
