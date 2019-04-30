
export const template = `
<div class="events">
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
            @click.right="onPopMenu($event, info.frame)"
            @dblclick="openEventEditor(info.frame)"
        ></i>
    </template>
    <template
        v-if="selectEvent"
        v-for="(info, index) in selectEvent"
    >
        <i class="iconfont icon-event preview"
            v-if="display(info.x)"
            name="event"
            :style="queryKeyStyle(info.x)"
        ></i>
    </template>
</div>
`;

export const props = [
    'events',
    'offset',
    'selectInfo',
    'copyInfo',
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
        return that.selectInfo.data;
    },
};

export const components = {};

export const methods = {
    t(key: string, type = 'event.') {
        return Editor.I18n.t(`animator.${type}${key}`);
    },

    display(x: number): boolean {
        // @ts-ignore
        return x >= 0;
    },

    onPopMenu(event: any, frame: number) {
        const that: any = this;
        const menu = [{
            label: that.t('edit', ''),
            click() {
                that.openEventEditor(frame);
            },
        }, {
            label: that.t('delete', ''),
            click() {
                that.$emit('datachange', 'deleteEvent', [frame]);
            },
        }, {
            label: that.t('copy', ''),
            click() {
                that.$emit('datachange', 'copyEvent', [frame]);
            },
        }];
        if (that.copyInfo) {
            menu.push({
                label: that.t('paste', ''),
                click() {
                    that.$emit('datachange', 'pasteEvent', [frame]);
                },
            });
        }
        Editor.Menu.popup({
            x: event.pageX,
            y: event.pageY,
            menu,
        });
    },

    onMouseDown(event: any, info: any) {
        const that: any = this;
        let dragInfo: any = {};
        const data = JSON.parse(JSON.stringify(info));
        if (event.ctrlKey && that.selectInfo) {
            dragInfo = JSON.parse(JSON.stringify(that.selectInfo));
            dragInfo.data.push(data);
            dragInfo.frames.push(info.frame);
        } else {
            dragInfo = {
                startX: event.x,
                data: [data],
                offset: 0,
                offsetFrame: 0,
                frames: [info.frame],
            };
        }
        that.$emit('startdrag', 'moveEvent', [dragInfo]);
    },

    openEventEditor(frame: string) {
        // @ts-ignore
        this.$emit('datachange', 'openEventEditor', [frame]);
    },

    queryKeyStyle(x: number) {
        return `transform: translateX(${x - 6 | 0}px);`;
    },
};
export function mounted() {
}
