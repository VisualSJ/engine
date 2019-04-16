
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
        @dblclick="onDbClick"
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
    display(x: number): boolean {
        // @ts-ignore
        return x + this.offset >= 0;
    },

    onDragStart() {

    },
    onMouseDown(event: any) {
        const index = event.target.getAttribute('index');

    },

    onDbClick() {
        // @ts-ignore
        this.$emit('datachange', 'openEventEditor');
    },

    queryKeyStyle(x: number) {
        return `transform: translateX(${x | 0}px);`;
    },
};
export function mounted() {
}
