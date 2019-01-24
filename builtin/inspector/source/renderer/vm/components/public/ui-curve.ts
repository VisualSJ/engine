'use strict';
import { close as closeCurve, open as openCurve } from '../../../../curve-editor/manager';

export const template = `
<div class="ui-curve">
    <div @click="showEditor" class="graphics" ref="graphics" >
        <svg
            :width="svgw"
            :height="svgh"
        >
            <path
                :d="bezier"
                stroke-width="1"
                stroke="#279DFF"
                fill="none"
            ></path>
        </svg>
    </div>
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
    },

    /**
     * 刷新显示数据
     */
    refresh() {
        // @ts-ignore
        const vm: any = this;

        const rect = vm.$refs.graphics.getBoundingClientRect();
        vm.svgw = rect.width;
        vm.svgh = 18;

        vm.bezier = `M 0 ${vm.svgh} L ${vm.svgw} 0`;
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
