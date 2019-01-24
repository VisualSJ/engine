'use strict';

let pkg: any = null;
let gradientEditorOpened = false;
let gradientData: any = null;

export const messages = {
    /**
     * 打开属性检查器面板
     */
    open() {
        Editor.Panel.open('inspector');
    },

    /**
     * 打开 curve-editor
     * @param {any} keyFrames
     */
    'open-curve-editor'(data: any) {
        Editor.Panel.open('inspector.curve-editor');
        Editor.Ipc.sendToPanel(
            'inspector.curve-editor',
            'current-keys',
            data
        );
    },

    /**
     * 绘制缩略图
     * @param ctx 绘图上下文
     * @param data 绘图数据
     */
    'draw-curve'(ctx: any, data: any) {
        Editor.Ipc.sendToPanel(
            'inspector.curve-editor',
            'draw-curve',
            ctx,
            data
        );
    },

    async 'open-gradient-editor'(data: any) {
        clearTimeout(pkg._closeGradientEditorTimer);
        if (!gradientEditorOpened) {
            await Editor.Panel.open('inspector.gradient-editor');
            gradientEditorOpened = true;
        }
        gradientData = data;
        Editor.Ipc.sendToPanel('inspector.gradient-editor', 'data', data);
    },

    'close-gradient-editor'(immediate: boolean) {
        if (immediate) {
            gradientEditorOpened = false;
        } else if (gradientEditorOpened) {
            clearTimeout(pkg._closeGradientEditorTimer);
            pkg._closeGradientEditorTimer = setTimeout(() => {
                Editor.Panel.close('inspector.gradient-editor');
                gradientEditorOpened = false;
            }, 500);
        }
    },

    'get-gradient-data'() {
        return gradientData;
    },

};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() { }
