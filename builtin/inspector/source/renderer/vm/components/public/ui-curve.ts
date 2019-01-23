'use strict';

export const template = `
<div class="ui-curve">
    <div class="graphics" ref="graphics">
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
