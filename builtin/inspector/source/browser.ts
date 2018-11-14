'use strict';

let pkg: any = null;
let spriteEditorUuid = '';
let spriteEditorOpened = false;

export const messages = {
    open() {
        Editor.Panel.open('inspector');
    },
    'open-sprite-editor'(uuid: string) {
        spriteEditorUuid = uuid;
        if (!spriteEditorOpened) {
            Editor.Panel.open('inspector.sprite-editor');
            spriteEditorOpened = true;
        } else {
            Editor.Ipc.sendToPanel(
                'inspector.sprite-editor',
                'current-uuid',
                spriteEditorUuid
            );
        }
    },
    'sprite-editor-state'(isOpen: boolean) {
        spriteEditorOpened = isOpen;
    },
    'get-sprite-editor-uuid'() {
        return spriteEditorUuid;
    }
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() {}
