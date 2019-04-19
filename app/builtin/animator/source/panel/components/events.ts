
export const template = `
<div class="events"
    name="time-pointer"
>
    <div class="duration"
        v-if="lastFrame && display(lastFrame.x)"
        :style="queryDurationStyle(lastFrame.x)"
    ></div>
    <template
        v-if="selectEvent"
        v-for="(info, index) in selectEvent"
    >
        <i class="iconfont icon-event preview"
            v-if="display(info.x)"
            :style="queryKeyStyle(info.x)"
        ></i>
    </template>
    <template
        v-if="events"
        v-for="(info, index) in events"
    >
        <i class="iconfont icon-event"
            v-if="display(info.x)"
            :style="queryKeyStyle(info.x)"
            :index="index"
            name="event"
            @mousedown="onMouseDown($event, info)"
            @dblclick="openEventEditor(info.frame)"
            @click.right="onPopMenu($event, info.frame)"
        ></i>
    </template>
</div>
`;

export const props = [
    'events',
    'offset',
    'selectInfo',
    'lastFrame',
];

export function data() {
return {

};
}

export const watch = {

};

export const computed = {
    selectEvent() {
        const that: any = this;
        if (!that.selectInfo) {
            return null;
        }
        return [that.selectInfo.data];
    },
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

    onMouseDown(event: any, info: any) {
        const that: any = this;
        const dragInfo = {
            startX: event.x,
            data: JSON.parse(JSON.stringify(info)),
            offset: 0,
            frames: [info.frame],
        };
        that.$emit('startdrag', 'moveEvent', [dragInfo]);
    },

    openEventEditor(frame: string) {
        // @ts-ignore
        this.$emit('datachange', 'openEventEditor', [frame]);
    },

    queryKeyStyle(x: number) {
        return `transform: translateX(${x + 4 | 0}px);`;
    },

    queryDurationStyle(x: number): string {
        // @ts-ignore
        return `transform: translateX(${this.offset | 0}px); width: ${x}px`;
    },
};
export function mounted() {
}
