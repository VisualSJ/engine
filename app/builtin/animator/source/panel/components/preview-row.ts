'use strict';
export const template = `
<div class="content-item preview-row"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @click.right="onPopMenu"
>
        <template
            v-if="display"
        >
            <div class="line"
            v-for="(item, i) in keyFrames"
            v-if="keyFrames[i + 1]"

            :style="queryLineStyle(item.x, keyFrames[i + 1].x)"
            ></div>
        </template>

        <template
            v-if="display"
        >
            <div class="key" draggable="true"
                v-for="(item, index) in keyFrames"

                :style="queryKeyStyle(item.x)"
                :index="index"
                @dragstart="onDragStart"
                @mouseover="hoverKey = item"
                @mouseleave="hoverKey = null"
            >
                <div class="dot"></div>
            </div>
        </template>

        <template
            v-if="display"
        >
            <div class="v-key" preview
                v-for="item in virtualkeys"

                :style="queryKeyStyle(item.x)"
            >
                <div class="dot"></div>
            </div>
        </template>

    </div>
`;

export const props = [
    'keyFrames',
    'selectKey',
    'path',
    'name',
];

export function data() {
    return {
        display: true,
        virtualkeys: [],
        hoverKey: null,
        dragIndex: null,
    };
}

export const watch = {
};

export const computed = {
    params() {
        const that: any = this;
        if (that.keyFrames.length < 1) {
            return [];
        }
        const {name, type} = that.keyFrames[0];
        if (type === 'props') {
            return [null, name, that.hoverKey && that.hoverKey.frame];
        }
        // todo 组件参数解析
        return [name, name, that.hoverKey && that.hoverKey.frame];
    },
};

export const components = {};

export const methods = {
    t(key: string, type = '') {
        return Editor.I18n.t(`animator.${type}${key}`);
    },
    /**
     * 刷新组件
     */
    async refresh() {

    },

    queryKeyStyle(x: number) {
        return `transform: translateX(${x - 5 | 0}px);`;
    },

    /**
     * 拼接 line 需要的 style 数据
     * @param {*} frame
     * @param {*} length
     * @param {*} scale
     * @param {*} offset
     */
    queryLineStyle(x1: number, x2: number) {
        return `transform: translateX(${x1 | 0}px); width: ${x2 - x1}px`;
    },

    onDragOver(event: any) {
        event.preventDefault(); // NOTE: Must have, otherwise we can not drop
        event.stopPropagation();

        const that: any = this;
        if (that.dragInfo && that.dragInfo.index) {
            const params = JSON.parse(JSON.stringify(that.params));
            params[2] = [that.keyFrames[that.dragInfo.index].frame];
            requestAnimationFrame(() => {
                that.dragInfo && that.$emit('datachange', 'moveKeys', [that.path, ... params, event.x - that.dragInfo.x]);
            });
        }
    },

    onDragLeave(event: any) {
        // @ts-ignore
        this.dragInfo = null;
    },

    onDragStart(event: any) {
        event.dataTransfer.setDragImage(document.createElement('div'), 10, 10);
        event.dataTransfer.dropEffect = 'move';
        const index = event.target.getAttribute('index');
        if (index === 'undefined') {
            return;
        }
        // @ts-ignore
        this.dragInfo = {
            index,
            x: event.x,
        };
    },

    onPopMenu(event: any) {
        const that: any = this;
        let label;
        let operate = '';
        const params = JSON.parse(JSON.stringify(that.params));
        if (!that.hoverKey) {
            operate = 'createKey';
            label = that.t('create_key', 'property.');
            params[2] = event.x;
        } else {
            operate = 'removeKey';
            label = that.t('remove_key', 'property.');
        }
        if (!that.name && operate === 'createKey') {
            return;
        }
        Editor.Menu.popup({
            x: event.pageX,
            y: event.pageY,
            menu: that.createMenu(label, operate, params),
        });
    },

    /**
     *
     * @param label
     * @param operate
     * @param params
     */
    createMenu(label: string, operate: string, params: any) {
        const that: any = this;
        params.unshift(that.path);
        const result: any[] = [{
            label,
            click() {
                that.$emit('datachange', operate, params);
            },
        }];
        if (that.hoverKey) {
            result.push({
                label: that.hoverKey.name,
                enabled: false,
            });
        }
        return result;
    },
};

export function mounted() {

}
