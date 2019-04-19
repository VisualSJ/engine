'use strict';
const {join} = require('path');
const {readFileSync} = require('fs-extra');
export const template = readFileSync(join(__dirname, './../../../static/template/components/preview-row.html'), 'utf-8');

export const props = [
    'keyFrames',
    'selectInfo',
    'path',
    'name',
    'offset',
];

export function data() {
    return {
        display: true,
        virtualkeys: [],
        hoverKey: null,
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
        return [that.path, comp, prop, that.hoverKey && that.hoverKey.frame];
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
        let label;
        let operate = '';
        const params = JSON.parse(JSON.stringify(that.params));
        if (!that.hoverKey) {
            operate = 'createKey';
            label = that.t('create_key', 'property.');
            params[3] = event.x;
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
