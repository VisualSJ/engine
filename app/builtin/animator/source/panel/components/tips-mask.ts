
const {join} = require('path');
const {existsSync, readJSONSync, readFileSync } = require('fs-extra');
export const template = `
<section class="mask tips-mask"
    @confirm="onConfirm"
>
    <div v-if="!root" class="tips clip">
        <div class="message">
            {{t('need_select_node')}}
        </div>
    </div>
    <div v-if="root && !animationMode && hasClip" class="tips animationMode">
        <ui-button name="enter_animation_mode">{{t('enter_animation_mode')}}</ui-button>
    </div>
    <div v-if="root && !hasComp" class="tips comp">
        <div class="message">
            {{t('need_animation_component')}}
        </div>
        <ui-button name="add_animation_component">{{t('add_animation_component')}}</ui-button>
    </div>
    <div v-if="root && !hasClip && hasComp" class="tips clip">
        <div class="message">
            {{t('need_animation_clip')}}
        </div>
        <ui-button name="add_animation_clip">{{t('add_animation_clip')}}</ui-button>
    </div>
</section>
`;

export const props = [
    'root',
    'hasComp',
    'hasClip',
    'animationMode',
    'compIndex',
];

export function data() {
return {

};
}

export const watch = {

};

export const computed = {

};

export const components = {};

export const methods = {
    t(key: string) {
        return Editor.I18n.t(`animator.mask.${key}`);
    },
    async onConfirm(event: any) {
        const that: any = this;
        const name = event.target.getAttribute('name');
        switch (name) {
            case 'enter_animation_mode':
                Editor.Ipc.sendToPanel('scene', 'record', that.root, true);
                break;
            case 'add_animation_component':
                Editor.Ipc.sendToPanel('scene', 'create-component', {
                    uuid: that.root,
                    component: 'cc.AnimationComponent',
                });
                break;
            case 'add_animation_clip':
                const path = await Editor.Dialog.saveFile({
                    root: join(Editor.Project.path, 'assets'),
                    filters: [{name: 'AniamtionClip', extensions: ['anim']}],
                });
                if (!path) {
                    return;
                }
                // 新建 clip 文件
                const fileUrl = `db://internal/default_file_content/anim`;
                const url = await Editor.Ipc.requestToPackage('asset-db', 'query-url-by-path', path);
                const target = await Editor.Ipc.requestToPackage('asset-db', 'generate-available-url', url);
                const isSuccess = await Editor.Ipc.requestToPackage('asset-db', 'copy-asset', fileUrl, target);
                if (!isSuccess) {
                    return;
                }
                const uuid = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-uuid', target);
                if (!uuid || typeof(uuid) !== 'string') {
                    return;
                }
                Editor.Ipc.sendToPanel('scene', 'set-property', {
                    uuid: that.root,
                    path: `__comps__.${that.compIndex}.defaultClip`,
                    dump: {
                        type: 'cc.AnimationClip',
                        value: {
                            uuid,
                        },
                    },
                });
                break;
        }
    },
};

export function mounted() {

}
