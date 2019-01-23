'use strict';

export const template = `
<div class="ui-number"
    @change.stop="$emit('input', $event.target.value)"
>
    <span
        v-if="name"
        :disabled="readonly"
        @mousedown.stop="_onMouseDown($event)"
    >{{name}}</span>
    <template
        v-if="slide"
    >
        <ui-slider ref="num"
            :disabled="readonly"
            :min="min"
            :max="max"
            :step="step"
            :value="value"
            @change="_onChange($event)"
        ></ui-slider>
    </template>
    <template
        v-else
    >
        <ui-num-input ref="num"
            :disabled="readonly"
            :min="min"
            :max="max"
            :step="step"
            :value="value"
            @change="_onChange($event)"
        ></ui-num-input>
    </template>
</div>
`;

export const props = [
    'readonly',
    'name',
    'min',
    'max',
    'step',
    'slide',

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

    /**
     * 鼠标准备拖拽数值
     * @param event
     */
    _onMouseDown(event: MouseEvent) {
        // @ts-ignore
        const vm: any = this;
        if (vm.readonly) {
            return;
        }
        function mouseMove(event: MouseEvent) {
            if (event.movementX > 0) {
                vm.$refs.num.stepUp();
            } else {
                vm.$refs.num.stepDown();
            }
        }

        function mouseUp() {
            document.removeEventListener('mousemove', mouseMove);
            document.removeEventListener('mouseup', mouseUp);
        }

        document.addEventListener('mousemove', mouseMove);
        document.addEventListener('mouseup', mouseUp);
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
