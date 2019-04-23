'use strict';
const {join} = require('path');
const {readFileSync} = require('fs-extra');
export const template = readFileSync(join(__dirname, './../../../static/template/components/preview-row.html'), 'utf-8');

export const props = [
    'keyFrames',
    'selectInfo',
    'copyInfo',
    'path',
    'name',
    'offset',
];

export function data() {
    return {
        display: true,
        virtualkeys: [],
        keyData: [],
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
        return [that.path, comp, prop];
    },
    selectKey() {
        const that: any = this;
        if (!that.selectInfo) {
            return null;
        }

        const {data, params} = that.selectInfo;
        if (params[0] !== that.path) {
            return;
        }

        if (that.name && that.name !== data.prop) {
            return null;
        }
        return [data];
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
        return `transform: translateX(${x - 6 | 0}px);`;
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

    onMouseDown(event: any, index: number) {
        const that: any = this;        // @ts-ignore

        const params = JSON.parse(JSON.stringify(that.params));
        params[3] = [that.keyFrames[index].frame];
        that.dragInfo = {
            startX: event.x,
            offset: 0,
            params,
            data: that.keyData[index],
        };

        that.$emit('startdrag', 'moveKey', [that.dragInfo]);
        // @ts-ignore
        // this.virtualkeys.push(JSON.parse(JSON.stringify(this.keyData[index])));
    },

    onPopMenu(event: any) {
        const that: any = this;
        const params = JSON.parse(JSON.stringify(that.params));
        const index = event.target.getAttribute('index');
        // 节点轨道只能移除关键帧
        if (!that.name && !index) {
            return;
        }
        const label: string[] = [];
        const operate: string[] = [];
        if (index !== undefined && index !== null) {
            // 在关键帧位置上

            // 复制、粘贴关键帧
            if (that.name) {
                operate.push('copyKey');
                label.push(that.t('copy_key', 'property.'));
                if (that.canPaste()) {
                    operate.push('pasteKey');
                    label.push(that.t('paste_key', 'property.'));
                }
            }
            // 移除关键帧
            operate.push('removeKey');
            label.push(that.t('remove_key', 'property.'));
            params[3] = that.keyFrames[index].frame;
            params.frame = true;
        } else {
            operate.push('createKey');
            label.push(that.t('create_key', 'property.'));
            const style = event.target.style.transform;
            let offset = 0;
            if (style) {
                offset = style.match(/translateX\((.*)px\)/)[1];
            }
            params[3] = event.offsetX + Number(offset);
            if (that.canPaste()) {
                operate.push('pasteKey');
                label.push(that.t('paste_key', 'property.'));
            }
        }
        Editor.Menu.popup({
            x: event.pageX,
            y: event.pageY,
            menu: that.createMenu(label, operate, params),
        });
    },

    /**
     * 检查当前轨道是否可以复制
     */
    canPaste() {
        const that: any = this;

        if (!that.name || !that.copyInfo) {
            return;
        }

        const index = that.copyInfo.findIndex((item: any, index: number) => {
            return item !== that.params[index];
        });

        // 最多只有帧数不同的才可以粘贴
        if (index === -1 || index === 3) {
            return true;
        }
    },

    /**
     *
     * @param label
     * @param operate
     * @param params
     */
    createMenu(label: string[], operate: string[], params: any) {
        const that: any = this;
        const result: any[] = operate.map((name: string, index: number) => {
            return {
                label: label[index],
                click() {
                    that.$emit('datachange', name, params);
                },
            };
        });
        if (params.frame) {
            result.push({
                label: `frame: ${params[3]}`,
                enabled: false,
            });
        }
        return result;
    },
};

export function mounted() {
    // @ts-ignore
    this.refresh();
}
