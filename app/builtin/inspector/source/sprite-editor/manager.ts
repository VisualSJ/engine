'use stirct';

let isOpend: boolean = false;
let vm: any = null; // 对应在 inspector 上的数据对象

/**
 * 改变原始数据
 * @param dump
 */
export function changeSpriteData(dump: any) {
    vm && vm.saveSpriteEditor(dump);
}

/**
 * 修改编辑窗口的打开状态
 * @param bool
 */
export function changeSpriteState(bool: boolean) {
    isOpend = bool;
    if (bool && vm) {
        Editor.Ipc.sendToPanel('inspector.sprite-editor', 'current-keys', {
            userData: vm.meta.userData,
        });
    }
}

/**
 * 打开窗口
 * @param data
 */
export function open(vue: any) {
    vm = vue;
    Editor.Panel.open('inspector.sprite-editor');
    update();
}

export function update() {
    if (isOpend) {
        setTimeout(() => {
            Editor.Ipc.sendToPanel('inspector.sprite-editor', 'current-keys', {
                userData: vm.meta.userData,
            });
        }, 200);
    }
}

export function close(vue: any) {
    if (vue !== vm) {
        return;
    }
    Editor.Panel.close('inspector.sprite-editor');
    vm = null;
    isOpend = false;
}
