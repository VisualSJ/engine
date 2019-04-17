
export const template = `
<div class="events"
    @mousedown="onMouseDown"
    name="time-pointer"
>
    <i class="iconfont icon-event" draggable="true"
        v-for="(info, index) in events"
        v-if="display(info.x)"
        :style="queryKeyStyle(info.x)"
        :index="index"
        @dragstart="onDragStart"
        @dblclick="openEventEditor(info.frame)"
        @click.right="onPopMenu($event, info.frame)"
        drag
    ></i>
</div>
`;

export const props = [
    'events',
    'offset',
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
    t(key: string, type = 'events.') {
        return Editor.I18n.t(`animator.${type}${key}`);
    },

    display(x: number): boolean {
        // @ts-ignore
        return x + this.offset >= 0;
    },

    onDragStart() {

    },

    onPopMenu(event: any, frame: number) {
        const that: any = this;
        Editor.Menu.popup({
            x: event.pageX,
            y: event.pageY,
            menu: [{
                label: that.t('edit', ''),
                click() {
                    that.openEventEditor(frame);
                },
            }, {
                label: that.t('delete', ''),
                click() {
                    that.$emit('datachange', 'deleteEvent', [frame]);
                },
            }],
        });
    },

    onMouseDown(event: any) {
        const index = event.target.getAttribute('index');

    },

    openEventEditor(frame: string) {
        // @ts-ignore
        this.$emit('datachange', 'openEventEditor', [frame]);
    },

    queryKeyStyle(x: number) {
        return `transform: translateX(${x | 0}px);`;
    },
};
export function mounted() {
}
