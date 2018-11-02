'use strict';

let pkg: any = null;

/**
 * 打开 package-manager 面板
 */
export const messages = {
    open() {
        Editor.Panel.open('pkg-manager');
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
    }
};

export function load() {
    // @ts-ignore
    pkg = this;
    Editor.Package.on('updatePlugin', () => {
        Editor.Ipc.sendToAllPanels('pkg-manager:update-packages');
    });
}

export function unload() {

}
