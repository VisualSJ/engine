'use strict';
import { close as closeCurve, drawCurve ,
    open as openCurve, update as updateCurve } from '../../../../curve-editor/manager';

export const template = `
<div class="ui-curve-range">
    <template
    v-if="value.mode.value == 0"
    >
        <ui-prop auto="true"
            :value="value.constant"
        ></ui-prop>
    </template>

    <div class="ui-prop"
        v-else-if="value.mode.value == 2"
        >
        <div class="ui-curve" @click.right="reset('curveMin', 2)">
            <canvas @click="showEditor('curveMin')" ref="thumbMin" ></canvas>
        </div>
        <div class="ui-curve" @click.right="reset('curveMax', 2)">
            <canvas @click="showEditor('curveMax')" ref="thumbMax" ></canvas>
        </div>
    </div>

    <div class="ui-prop"
    v-else-if="value.mode.value == 3"
    >
        <ui-prop auto="true"
            :value="value.constantMin"
        ></ui-prop>
        <ui-prop auto="true"
            :value="value.constantMax"
        ></ui-prop>
    </div>

    <template
    v-else
    >
        <div class="ui-curve" @click.right="reset('curve', 1)">
            <canvas @click="showEditor('curve')" ref="thumb" ></canvas>
        </div>
    </template>

    <div class="button">
        <i class="iconfont fold icon-un-fold foldable"
            @click="_onChangeMode($event)"
        ></i>
    </div>
</div>
`;

export const props = [
    'readonly',
    'name',
    'value',
];

export const components = {
    'ui-prop': require('./ui-prop'),
};

export const methods = {
    apply(dump: any) {
        // @ts-ignore
        const vm: any = this;
        vm.value[dump.key].value.keyFrames = dump.keyFrames;
        vm.value.multiplier.value = dump.multiplier;

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
        if (vm.value.mode.value === 1) {
            const ctx = this.getThumbCtx('thumb');
            drawCurve(vm.value.curve.value.keyFrames, ctx);
        } else if (vm.value.mode.value === 2) {
            const ctxMin = this.getThumbCtx('thumbMin');
            drawCurve(vm.value.curveMin.value.keyFrames, ctxMin);
            const ctxMax = this.getThumbCtx('thumbMax');
            drawCurve(vm.value.curveMax.value.keyFrames, ctxMax);
        }
    },

    /**
     * 根据名称获取绘图上下文
     * @param name
     */
    getThumbCtx(name: string): any {
        // @ts-ignore
        const ctx = this.$refs[name].getContext('2d');
        ctx.canvas.width = ctx.canvas.offsetWidth;
        ctx.canvas.height = ctx.canvas.offsetHeight;
        ctx.strokeStyle = 'red';
        return ctx;
    },

    /**
     * 打开曲线编辑器
     */
    showEditor(this: any, key: string) {
        openCurve({
            value: this.value[key].value,
            key,
            multiplier: this.value.multiplier.value,
        }, this);
    },

    /**
     * 数据重置
     */
    reset(key: string, mode: number) {
        // @ts-ignore
        const vm: any = this;
        vm.value[key].default && (this.apply({
            ...vm.value[key].default,
            key,
            multiplier: vm.value.multiplier.default,
        }));
        // @ts-ignore
        updateCurve({
            ...vm.value[key].default,
            key,
            multiplier: vm.value.multiplier.default,
        });
    },

    /**
     * 修改 mode
     * @param event
     */
    _onChangeMode(event: any) {
        // @ts-ignore
        const vm: any = this;

        const { left, top } = event.target.getBoundingClientRect();
        const x = Math.round(left + 5);
        const y = Math.round(top + 25);

        Editor.Menu.popup({
            x, y,
            menu: vm.value.mode.enumList.map((item: any) => {
                return {
                    label: item.name,
                    type: 'radio',
                    checked: item.value === vm.value.mode.value,
                    click() {
                        vm.value.mode.value = item.value;
                        vm.$root.$emit('set-property', vm.value.mode);
                    },
                };
            }),
        });
    },
};

export const watch = {};

export function data() {
    return {
        style: {
            background: 'linear-gradient(to right, #fff 0%,#fff 100%)',
        },
    };
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;
    vm.refresh();
}

export function destroyed() {

}
