'use strict';
import { close as closeCurve, drawCurve , open as openCurve } from '../../../../curve-editor/manager';

export const template = `
<div class="ui-curve">
    <canvas @click="showEditor" ref="thumb"></canvas>
</div>
`;

export const props = [
    'readonly',
    'width',
    'height',

    'value',
];

export const components = {};

export const methods = {
    apply(dump: any) {
        // @ts-ignore
        const vm: any = this;
        vm.value.keyFrames = dump.keyFrames;
        vm.value.multiplier = dump.multiplier;

        const event = document.createEvent('HTMLEvents');
        event.initEvent('confirm', true, true);
        vm.$el.dispatchEvent(event);
        // 消息通知有延迟
        process.nextTick(() => {
            vm.refresh();
        });
    },

    /**
     * 刷新显示数据
     */
    refresh() {
        // @ts-ignore
        const vm: any = this;
        const ctx = vm.$refs.thumb.getContext('2d');
        ctx.canvas.width = ctx.canvas.offsetWidth;
        ctx.canvas.height = ctx.canvas.offsetHeight;
        ctx.strokeStyle = 'red';
        drawCurve(vm.value.keyFrames, ctx);
    },

    /**
     * 打开曲线编辑器
     */
    showEditor(this: any) {
        openCurve(this.value, this);
    },
};

export const watch = {
    width() {
        // @ts-ignore
        const vm: any = this;
        vm.refresh();
    },
    height() {
        // @ts-ignore
        const vm: any = this;
        vm.refresh();
    },
    value() {
        // @ts-ignore
        const vm: any = this;
        vm.refresh();
    },
};

export function data() {
    return {
        bezier: '',

        svgw: 0,
        svgh: 0,
    };
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;
    vm.refresh();
}

export function destroyed() {
    // @ts-ignore
    const vm: any = this;
    closeCurve(vm);
}
