'use strict';

export const template = `
<div class="ui-array">
    <div class="name">
        <span
            :title="name"
        >{{name}}</span>
        <i class="iconfont icon-lock"
            v-if="readonly"
        ></i>
    </div>
    <div class="content">
        <ui-num-input path="length" min="0" step="1"
            :readonly="readonly"
            :disabled="readonly"
            :value="value.length"
        ></ui-num-input>
        <span
            :unfold="unfold"
            @click="unfold = !unfold"
        >
            <i :class="['iconfont', 'fold', 'foldable', unfold ? 'icon-collapse' : 'icon-expand']"></i>
        </span>
    </div>
    <div class="array"
        v-if="unfold && value.length !== 0"
        @click="onDelete"
    >
        <template
            v-for="(item, index) in value"
        >
            <div class="array-item"
                draggable = true
                @dragstart="onDragStart"
                @dragleave="onDragLeave"
                @dragover="onDragOver"
                @drop="onDrop"
                :index = 'index'
            >
                <ui-prop auto="true"
                    :readonly="readonly"
                    :value="item"
                    :label="index"
                ></ui-prop>
                <i class="iconfont icon-del" :index = 'index'></i>
            </div>
        </template>
    </div>
</div>
`;

export const props = [
    'readonly',
    'name',
    'dataDefault',
    'value',
];

export const components = {
    'ui-prop': require('./ui-prop'),
};

export const methods = {
    onDragStart(event: any) {
        event.dataTransfer.setData('index', event.target.getAttribute('index'));
    },
    onDragOver(event: any) {
        event.preventDefault();
        if (event.dataTransfer.types.indexOf('index') === -1) {
            return;
        }
        // @ts-ignore
        const target: any = event.currentTarget;
        const offset = target.getBoundingClientRect();
        let position = 'after'; // 中间位置
        // @ts-ignore
        if (event.clientY - offset.top <= 5) {
            position = 'before'; // 偏上位置
            // @ts-ignore
        } else if (offset.bottom - event.clientY <= 5) {
            position = 'after'; // 偏下位置
        }
        target.setAttribute('insert', position);
    },
    onDragLeave(event: any) {
        event.currentTarget.removeAttribute('insert'); // 还原节点状态
    },
    onDrop(event: any) {
        // @ts-ignore
        const vm: any = this;
        const target = event.currentTarget;
        const insert = target.getAttribute('insert');
        if (!insert) {
            return;
        }
        const indexFrom = Number(event.dataTransfer.getData('index'));
        let indexInsert = Number(target.getAttribute('index'));
        if (insert === 'after') {
            indexInsert = indexInsert + 1;
        }
        vm.value.splice(indexInsert, 0, vm.value[indexFrom]);
        if (indexFrom > indexInsert) {
            vm.value.splice(indexFrom + 1, 1);
        } else {
            vm.value.splice(indexFrom, 1);
        }
        vm.emitConfirm();
        event.currentTarget.removeAttribute('insert'); // 还原节点状态
    },
    onDelete(event: any) {
        if (!event.target.classList.contains('icon-del')) {
            return;
        }
        // @ts-ignore
        const vm: any = this;
        const index = event.target.getAttribute('index');
        vm.value.splice(index, 1);
        vm.emitConfirm();
    },
    emitConfirm() {
        // 主动通知数据更新
        const conformEvent = document.createEvent('HTMLEvents');
        conformEvent.initEvent('confirm', true, true);
         // @ts-ignore
        this.$el.dispatchEvent(conformEvent);
    },
};

export const watch = {
    value(value: any[]) {},
};

export function data() {
    return {
        unfold: true,
        data: [],
    };
}

export function mounted() {
}
