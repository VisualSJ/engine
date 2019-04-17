'use strict';
export const template = `
<div class="content-item preview-row"
    @dragend="onDragEnd"
    @dragover="onDragOver"
    @drop="onDrop"
    @click.right="onPopMenu"
>
        <template
            v-if="display"
        >
            <div class="line"
            v-for="(item, i) in keyData"
            v-if="keyFrames[i + 1]"

            :style="queryLineStyle(item.x, keyData[i + 1].x)"
            :title="t('line_tips')"
            @dblclick="openBezierEditor(item)"
            ></div>
        </template>

        <template
            v-if="display"
        >
            <div class="key" draggable="true"
                v-for="(item, index) in keyData"

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
    'offset',
];

export function data() {
    return {
        display: true,
        virtualkeys: [],
        hoverKey: null,
        dragIndex: null,
        keyData: [],
        draging: false,
    };
}

export const watch = {
    keyFrames() {
        // @ts-ignore
        this.refresh();
    },
};

export const computed = {
    params() {
        const that: any = this;
        if (that.keyFrames.length < 1) {
            return [];
        }
        const {comp, prop} = that.keyFrames[0];
        return [comp, prop, that.hoverKey && that.hoverKey.frame];
    },
};

export const components = {};

export const methods = {
    t(key: string, type = 'preview_row.') {
        return Editor.I18n.t(`animator.${type}${key}`);
    },

    /**
     * 刷新组件
     */
    async refresh() {
        // @ts-ignore
        this.keyData = JSON.parse(JSON.stringify(this.keyFrames));
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

    openBezierEditor(data: any) {
        // @ts-ignore
        data.path = this.path;
        // @ts-ignore
        this.$emit('datachange', 'openBezierEditor', [data]);
    },

    onDragOver(event: any) {
        event.preventDefault(); // NOTE: Must have, otherwise we can not drop
        event.stopPropagation();

        const that: any = this;
        const index = that.dragInfo && that.dragInfo.index;
        if (index) {
            if (!that.draging) {
                requestAnimationFrame(() => {
                    if (!that.dragInfo) {
                        that.draging = false;
                        return;
                    }
                    const offset = event.x - that.dragInfo.x;
                    that.dragInfo.x = event.x;
                    const data = that.keyData[index];

                    data.x += offset;
                    that.dragInfo.offset += offset;
                    that.keyData.splice(index, 1, data);
                    that.draging = false;
                });
            }
            that.draging = true;
        }
    },

    onDragEnd(event: any) {
        // @ts-ignore
        this.dragInfo = null;
        // @ts-ignore
        this.virtualkeys = [];
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
            offset: 0,
        };

        // @ts-ignore
        this.virtualkeys.push(JSON.parse(JSON.stringify(this.keyData[index])));
    },

    onDrop(event: any) {
        const that: any = this;
        if (that.dragInfo && that.dragInfo.offset) {
            const params = JSON.parse(JSON.stringify(that.params));
            params[2] = [that.keyFrames[that.dragInfo.index].frame];
            that.dragInfo && that.$emit('datachange', 'moveKeys', [that.path, ... params, that.dragInfo.offset]);
        }
        that.dragInfo = null;
        that.virtualkeys = [];
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
        // 节点轨道不允许新建关键帧
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
        return result;
    },
};

export function mounted() {
    // @ts-ignore
    this.refresh();
}
