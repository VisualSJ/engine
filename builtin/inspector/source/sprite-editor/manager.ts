'use stirct';

let isOpend: boolean = false;
let vm: any = null;
let cache: any;

/**
 * 修改渐变编辑窗口的打开状态
 * @param bool
 */
export function changeSpriteData(bool: boolean) {
    isOpend = bool;
    if (bool) {
        Editor.Ipc.sendToPanel('inspector.sprite-editor', 'data', cache);
    }
}

/**
 * 改变渐变的数据
 * @param dump
 */
export function changeSpriteState(dump: any) {
    vm && vm.apply(dump);
}

/**
 * 打开窗口
 * @param data
 */
export function open(data: any, vue: any) {
    vm = vue;
    Editor.Panel.open('inspector.sprite-editor');
    update(data);
}

export function update(data: any) {
    cache = data;
    if (isOpend) {
        setTimeout(() => {
            Editor.Ipc.sendToPanel('inspector.sprite-editor', 'data', cache);
        }, 200);
    }
}

export function close(vue: any) {
    if (vue !== vm) {
        return;
    }
    Editor.Panel.close('inspector.sprite-editor');
    cache = null;
    vm = null;
    isOpend = false;
}
