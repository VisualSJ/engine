import { extname } from 'path';

'use strict';
const {join} = require('path');
const {readFileSync} = require('fs-extra');
const _ = require('lodash');
export const template = readFileSync(join(__dirname, './../../../static/template/components/preview-row.html'), 'utf-8');
const LINEHEIGHT = 24;
export const props = [
    'keyFrames',
    'selectInfo',
    'copyInfo',
    'param',
    'name',
    'index',
    'scroll',
    'box',
];

export function data() {
    return {
        virtualkeys: [],
        keyData: [],
        imageSrc: [],
        refreshTask: null,
    };
}

export const watch = {
    // todo 监听 keyFrames 的变化会触发多次更新
    keyFrames() {
        const that: any = this;
        // 不显示的时候不去更新和计算
        if (!that.display) {
            return;
        }
        cancelAnimationFrame(that.refreshTask);
        that.refreshTask = requestAnimationFrame (async () => {
            await that.refresh();
        });
    },
    // offset() {
    //     const that: any = this;
    //     cancelAnimationFrame(that.refreshTask);
    //     that.refreshTask = requestAnimationFrame(async () => {
    //         console.log('keyFrames');
    //         await that.refresh();
    //     });
    // },
    async display() {
        const that: any = this;
        if (!that.display) {
            return;
        }
        if (that.keyData && that.keyData.length > 1) {
            return;
        }
        await that.refresh();
    },

    box() {
        const that: any = this;
        if (!that.display || !that.box || !that.keyData) {
            return;
        }
        const {origin, w, h, type} = that.box;
        // 选择框在属性轨道， node 处不参与收集
        if (type === 'property' && !that.name) {
            return;
        }
        // 属性轨道
        let path = '';
        if (that.name) {
            if (that.param[1]) {
                path = `comp_${that.param[1]}${that.param[2]}`;
            } else {
                path = `prop_${that.param[2]}`;
            }
        } else {
            path = `path_${that.param[0]}`;
        }
        // 先判断 y 坐标是否符合条件
        if (that.offsetHeight + LINEHEIGHT / 2 < origin.y || that.offsetHeight + LINEHEIGHT / 2 > origin.y + h) {
            that.$emit('datachange', 'updateSelect', [null, path, null]);
            return;
        }
        let result = [];
        const param = [];
        for (const item of that.keyData) {
            if (item.x > origin.x && item.x < origin.x + w) {
                result.push(item);
                param.push([that.param[0], item.comp, item.prop, item.frame]);
            }
        }
        if (result.length < 1) {
            that.$emit('datachange', 'updateSelect', [null, path, null]);
            return;
        }
        result = JSON.parse(JSON.stringify(result));
        that.$emit('datachange', 'updateSelect', [result, path, param]);
    },
};

export const computed = {
    display() {
        const that: any = this;
        if (!that.scroll) {
            return true;
        }
        if (that.offsetHeight >= 0 && that.offsetHeight < that.scroll.height) {
            return true;
        }
    },

    previewStyle() {
        const that: any = this;
        return {
            transform: `translateY(${that.offsetHeight}px)`,
        };
    },

    offsetHeight() {
        const that: any = this;
        return that.index * LINEHEIGHT - that.scroll.top;
    },

    // 筛选出能在当前组件内显示的选中关键帧数据
    selectKey() {
        const that: any = this;
        if (!that.selectInfo || that.selectInfo.data.length < 1) {
            return null;
        }
        const {data, params} = that.selectInfo;
        const result: any = [];
        data.forEach((item: any, index: number) => {
            if (!params[index]) {
                return;
            }
            if (params[index][0] !== that.param[0]) {
                return;
            }

            if (that.param[2] && that.param[2] !== item.prop) {
                return null;
            }

            // if (!that.idDisplay(item.x)) {
            //     return;
            // }

            result.push(item);
        });

        return result;
    },

    draggable(): boolean {
        // @ts-ignore
        return this.keyType !== 'key';
    },

    keyType() {
        // @ts-ignore
        if (this.param[2] === 'spriteFrame' && this.param[1] === 'cc.SpriteComponent') {
            return 'sprite';
        }
        return 'key';
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
        const that: any = this;
        if (that.keyFrames.length < 1) {
            that.keyData = null;
            return;
        }
        let indexFirst = -1;
        let keyData = that.keyFrames.filter((item: any, index: number) => {
            const result = that.idDisplay(item.x);
            if (!result && indexFirst === -1) {
                indexFirst = index;
            }
            return result;
        });
        if (indexFirst !== -1) {
            keyData.push(that.keyFrames[indexFirst]);
        }
        keyData = JSON.parse(JSON.stringify(keyData));
        if (that.param[2] === 'spriteFrame' && that.param[1] === 'cc.SpriteComponent') {
            for (const item of keyData) {
                item.imageSrc = await this.queryImageSrc(item.data);
            }
        }
        that.$emit('datachange', 'updateKey');
        that.keyData = keyData;
    },

    calcSelectClass(src: any) {
        const that: any = this;
        const result = ['active'];
        if (that.checkRightSrc(src) && that.name) {
            result.push('sprite');
        } else {
            result.push('key');
        }
        return result;
    },

    idDisplay(x: number) {
        const that: any = this;
        if (!that.scroll) {
            return;
        }
        if (x > that.scroll.size.w) {
            return;
        }
        if (x < that.offset) {
            return;
        }
        return true;
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
    queryLineStyle(item1: any, item2: any) {
        if (item1 && item2) {
            return `transform: translateX(${item1.x | 0}px); width: ${item2.x - item1.x}px`;
        }
    },

    /**
     * 查找图片资源信息
     */
    async queryImageSrc(dump: any) {
        if (!dump) {
            return false;
        }
        if (!dump.value) {
            return false;
        }
        const uuid = dump.value.uuid.match(/(\S*)@[^@]*$/)[1];
        const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        if (!asset) {
            return false;
        }
        const libraryPath = asset.library[extname(asset.name)];
        if (!libraryPath) {
            return false;
        }
        return libraryPath;
    },

    checkRightSrc(src: any) {
        if (typeof(src) === 'boolean') {
            return true;
        }

        if (typeof(src) === 'string') {
            return true;
        }
    },

    openBezierEditor(data: any) {
        // @ts-ignore
        data.path = this.param[0];
        // @ts-ignore
        this.$emit('datachange', 'openBezierEditor', [data]);
    },

    onDragOver(event: any) {
        const that: any = this;
        if (!that.draggable) {
            return;
        }
        const {type} = Editor.UI.DragArea.currentDragInfo;
        if (type !== 'cc.SpriteFrame') {
            return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    },

    onDrop(event: any) {
        const that: any = this;
        const {value} = Editor.UI.DragArea.currentDragInfo;
        that.$emit('datachange', 'createKey', {
            x: event.offsetX,
            param: [...that.param, 0, {uuid: value}],
        });
    },

    async onMouseDown(event: any, index: number) {
        event.stopPropagation();
        const that: any = this;        // @ts-ignore
        const data = JSON.parse(JSON.stringify(that.keyData[index]));
        const param = that.param;
        if (!that.name) {
            if (data.prop === 'spriteFrame' && data.comp === 'cc.SpriteComponent') {
                data.imageSrc = await this.queryImageSrc(data.data);
            }
            param[1] = data.comp;
            param[2] = data.prop;
        }
        param[3] = data.frame;
        let dragInfo = that.selectInfo || {};
        let paramIndex = -1;
        if (that.selectInfo && (event.ctrlKey || that.selectInfo.sortDump)) {
            // 当前点击的关键帧不在选择范围之内
            paramIndex = dragInfo.params.findIndex((item: any) => {
                return item.toString() === param.toString();
            });
            const hasSelect = that.selectInfo  && paramIndex !== -1 && (event.ctrlKey || that.selectInfo.sortDump) ;
            if (!hasSelect) {
                dragInfo.params.push(param);
                dragInfo.data.push(data);
            }
        } else {
            dragInfo = {
                startX: event.x,
                offset: 0,
                offsetFrame: 0,
                params: [param],
                data: [data],
            };
        }
        if (dragInfo.sortDump && paramIndex !== -1) {
            dragInfo.startX = event.x;
            dragInfo.offset = 0;
            dragInfo.offsetFrame = 0;
        }
        that.$emit('startdrag', 'moveKey', [dragInfo, that.param[0]]);
        // @ts-ignore
        // this.virtualkeys.push(JSON.parse(JSON.stringify(this.keyData[index])));
    },

    onPopMenu(event: any) {
        event.stopPropagation();
        const that: any = this;
        const params: any = {
            param : that.param,
        };
        const name = event.target.getAttribute('name');
        // 节点轨道只能移除关键帧
        if (!that.name && !name) {
            return;
        }
        const label: string[] = [];
        const operate: string[] = [];
        if (name === 'key') {
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
            const style = event.target.style.transform;
            let offset = 0;
            if (style) {
                offset = style.match(/translateX\((.*)px\)/)[1];
            }
            params.x = event.offsetX + Number(offset);
            // 移除关键帧
            operate.push('removeKey');
            label.push(that.t('remove_key', 'property.'));
        } else {
            operate.push('createKey');
            label.push(that.t('create_key', 'property.'));
            params.x = event.offsetX;
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
     * 检查当前轨道是否可以粘贴
     */
    canPaste() {
        const that: any = this;

        if (!that.name || !that.copyInfo) {
            return;
        }
        return true;
        // const index = that.copyInfo.params.findIndex((item: any, index: number) => {
        //     return item !== that.params[index];
        // });

        // // 最多只有帧数不同的才可以粘贴
        // if (index === -1 || index === 3) {
        //     return true;
        // }
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

export async function mounted() {
    // @ts-ignore
    await this.refresh();
}
