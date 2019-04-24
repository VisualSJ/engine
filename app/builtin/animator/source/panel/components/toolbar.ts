
export const template = `
<div class="flex-1 content-device toolbar"
    @mousedown="onMouseDown"
>
    <i :title="t('jump_first_frame')" class="iconfont icon-rewind"  name="jump_first_frame"></i>
    <i :title="t('jump_prev_frame')" class="iconfont icon-last"  name="jump_prev_frame"></i>
    <i v-if="state !== 'playing'" :title="t('play_animation')" class="iconfont icon-arrow-right" name="play"></i>
    <i v-if="state === 'playing'" :title="t('pause_animation')" class="iconfont icon-pause" name="pause"></i>
    <i :title="t('jump_next_frame')" class="iconfont icon-next"  name="jump_next_frame"></i>
    <i :title="t('jump_last_frame')" class="iconfont icon-forward"  name="jump_last_frame"></i>
    <i :disable="state !== 'playing'" :title="t('stop_animation')" class="iconfont icon-stop" name="stop"></i>
    <i :title="t('insert_event')" class="iconfont icon-event"  name="addEvent"></i>
    <div class="time"  name="edit"><span>{{time}}</span></div>
</div>
`;

export const props = [
    'time',
    'root',
    'state',
    'dirty',
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
            case 'jump_prev_frame':
            case 'jump_first_frame':
            case 'jump_next_frame':
            case 'jump_last_frame':
                that.$emit('datachange', 'update-frame', [name]);
                break;
            case'play':
            case'pause':
            case'stop':
                that.$emit('datachange', 'update-state', [name]);
                break;
            default:
                that.$emit('datachange', name);
                break;
        }
    },
};
export function mounted() {

}
