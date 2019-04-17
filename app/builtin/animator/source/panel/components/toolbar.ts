
export const template = `
<div class="flex-1 content-device toolbar"
    @mousedown="onMouseDown"
>
    <i :title="t('jump_first_frame')" class="iconfont icon-rewind"  name="rewind"></i>
    <i :title="t('jump_prev_frame')" class="iconfont icon-last"  name="last"></i>
    <i v-if="state !== 'play'" :title="t('play_animation')" class="iconfont icon-arrow-right" name="play"></i>
    <i v-if="state === 'play'" :title="t('stop_animation')" class="iconfont icon-arrow-right" name="stop"></i>
    <i v-if="state === 'play'" :title="t('pause_animation')" class="iconfont icon-arrow-right" name="pause"></i>
    <i :title="t('jump_next_frame')" class="iconfont icon-next"  name="next"></i>
    <i :title="t('insert_event')" class="iconfont icon-event"  name="add-event"></i>
    <i class="iconfont icon-save-b"  name="save"></i>
    <i :title="t('exit')" class="iconfont icon-exit" name="exit"></i>
    <div class="time"  name="edit"><span>{{time}}</span></div>
</div>
`;

export const props = [
    'time',
    'root',
    'state',
    'dirty',
    'uuid',
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
    t(key: string, type = 'toolbar.') {
        return Editor.I18n.t(`animator.${type}${key}`);
    },
    async onMouseDown(event: any) {
        const that: any = this;
        const name = event.target.getAttribute('name');
        switch (name) {
            case 'exit':
                if (that.dirty) {
                    const t = (key: string) => {
                        return that.t(key, '');
                    };
                    const result = await Editor.Dialog.show({
                        type: 'info',
                        title: t('is_save'),
                        message: t('is_save_message'),
                        buttons: [t('cancel'), t('save'), t('abort')],
                        default: 0,
                        cancel: 0,
                    });
                    if (result === 0) {
                        return;
                    }
                    if (result === 1) {
                        const saveSuccess = await that.saveData();
                        saveSuccess && (that.exit());
                        return;
                    }
                }
                that.exit();
                break;
            case 'rewind':
            case 'last':
            case 'next':
                that.$emit('datachange', 'update-frame', [name]);
            case'play':
            case'pause':
            case'stop':
                const result = Editor.Ipc.sendToPanel('scene', 'change-clip-state', name, that.uuid);
                if (result) {
                    that.$emit('datachange', 'update-state', [name]);
                }
            default:
                that.$emit('datachange', name);
                break;
        }
    },
    exit() {
        // @ts-ignore
        Editor.Ipc.sendToPanel('scene', 'record', this.root, false);
    },
};
export function mounted() {

}
