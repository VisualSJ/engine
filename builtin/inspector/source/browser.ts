'use strict';

let pkg: any = null;
let spriteEditorUuid = '';
let spriteEditorOpened = false;

export const messages = {
    open() {
        Editor.Panel.open('inspector');
    },

    /**
     * 打开 sprite editor
     * @param {string} uuid
     */
    'open-sprite-editor'(uuid: string) {
        if (!spriteEditorOpened) {
            // 未开启 panel
            Editor.Panel.open('inspector.sprite-editor');
            spriteEditorOpened = true;
            spriteEditorUuid = uuid;
        } else if (uuid) {
            // 已开启 panel 且 uuid 不为空
            spriteEditorUuid = uuid;
            Editor.Ipc.sendToPanel(
                'inspector.sprite-editor',
                'current-uuid',
                spriteEditorUuid
            );
        }
    },

    /**
     * panel 打开关闭时更新状态
     * @param {boolean} isOpen
     */
    'sprite-editor-state'(isOpen: boolean) {
        spriteEditorOpened = isOpen;
    },

    /**
     * 返回当前编辑的 sprite uuid
     * @returns
     */
    'get-sprite-editor-uuid'() {
        return spriteEditorUuid;
    }
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() {}
