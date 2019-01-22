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
