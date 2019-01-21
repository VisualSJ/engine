'use strict';

export const template = `
<div class="ui-string"
    @change.stop="$emit('input', $event.target.value)"
>
    <ui-input
        :value="value"
        @change="_onChange($event)"
    ></ui-input>
</div>
`;

export const props = [
    'value',
];

export const components = {};

export const methods = {
    /**
     * 数据更改的时候，需要间隔发送上传数据
     * @param event
     */
    _onChange(event: CustomEvent) {
        // @ts-ignore
        const vm: any = this;

        if (vm.lock) {
            return;
        }
        vm.lock = true;
        setTimeout(() => {
            const event = document.createEvent('HTMLEvents');
            event.initEvent('confirm', true, true);
            vm.$el.dispatchEvent(event);
            vm.lock = false;
        }, 200);
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
