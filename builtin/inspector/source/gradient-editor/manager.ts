'use stirct';

let isOpend: boolean = false;
let vm: any = null;
let cache: any;

/**
 * 修改渐变编辑窗口的打开状态
 * @param bool
 */
export function changeGradintState(bool: boolean) {
    isOpend = bool;
    if (bool) {
        Editor.Ipc.sendToPanel('inspector.gradient-editor', 'data', cache);
    }
}

/**
 * 改变渐变的数据
 * @param dump
 */
export function changeGrandintData(dump: any) {
    vm && vm.apply(dump);
}

/**
 * 打开窗口
 * @param data
 */
export function open(data: any, vue: any) {
    cache = data;
    vm = vue;
    Editor.Panel.open('inspector.gradient-editor');
    if (isOpend) {
        setTimeout(() => {
            Editor.Ipc.sendToPanel('inspector.gradient-editor', 'data', cache);
        }, 200);
    }
}

export function close(vue: any) {
    if (vue !== vm) {
        return;
    }
    Editor.Panel.close('inspector.gradient-editor');
    cache = null;
    vm = null;
    isOpend = false;
}
