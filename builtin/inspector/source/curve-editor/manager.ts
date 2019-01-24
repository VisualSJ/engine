'use stirct';

let vm: any = null;
let cache: any;
let isOpend = false;
const {drawHermite} = require('./utils');

/**
 * 改变原始数据
 * @param dump
 */
export function changeCurveData(dump: any) {
    vm && vm.apply(dump);
}

/**
 * 修改渐变编辑窗口的打开状态
 * @param bool
 */
export function changeCurveState(bool: boolean) {
    isOpend = bool;
    if (bool) {
        Editor.Ipc.sendToPanel('inspector.curve-editor', 'current-keys', cache);
    }
}

export function drawCurve(keyframes: any, ctx: any) {
    drawHermite(keyframes, ctx);
}

/**
 * 打开窗口
 * @param data 需要展示的数据
 * @param vue 展示数据对应的 vue 对象，用于更新数据
 */
export function open(data: any, vue: any) {
    vm = vue;
    Editor.Panel.open('inspector.curve-editor');
    cache = data;
    if (isOpend) {
        // hack ipc 消息延迟
        process.nextTick(() => {
            Editor.Ipc.sendToPanel('inspector.curve-editor', 'current-keys', data);
        });
    }
}

/**
 * 关闭编辑器
 * @param vue
 */
export function close(vue: any) {
    if (vue !== vm) {
        return;
    }
    isOpend = false;
    Editor.Panel.close('inspector.curve-editor');
    vm = null;
}
