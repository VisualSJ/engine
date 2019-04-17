'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;
export const style = readFileSync(join(__dirname, '../index.css'));

export const template = readFileSync(join(__dirname, '../../static', '/template/index.html'));
const Grid = require('./grid');
const {smoothScale, formatNodeDump, queryClipUuid, transPropertyDump, formatClipDump} = require('./../../static/script/utils.js');
export const $ = {
    animator: '.animator',
    grid: '.grid',
};

/**
 * 配置 animator 的 iconfont 图标
 */
export const fonts = [
    {
        name: 'animator',
        file: 'packages://animator/static/iconfont.woff',
    },
];

export const methods = {};
export const listeners = {
    resize() {
        vm && vm.resize();
    },
};
export const messages = {
    /**
     * 场景准备就绪
     */
    async 'scene:ready'() {
        await vm.refresh();
    },

    /**
     * 关闭场景
     * 打开 loading 状态
     */
    'scene:close'() {
        vm.loading = true;
        // vm.clear();
    },

    /**
     * 选中某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    async 'selection:select'(type: string, uuid: string) {
        if (!vm || type !== 'node') {
            return;
        }
        await vm.update(uuid);
    },

    /**
     * 节点修改后需要更新动画编辑器的显示状态
     * @param {string} uuid
     */
    async 'scene:change-node'(uuid: string) {
        if (!vm || uuid !== vm.root) {
            return;
        }
        await vm.update(uuid);
    },

    // 打开动画编辑模式消息
    async 'scene:animation-start'(uuid: string) {
        if (!vm || uuid !== vm.root || vm.animationMode) {
            return;
        }
        // vm.animationMode = true;
        const mode = await Editor.Ipc.requestToPackage('scene', 'query-scene-mode');
        mode === 'animation' ? vm.animationMode = true : vm.animationMode = false;
    },

    // 关闭动画编辑模式消息
    async 'scene:animation-end'() {
        if (!vm || !vm.animationMode) {
            return;
        }
        // vm.animationMode = false;
        const mode = await Editor.Ipc.requestToPackage('scene', 'query-scene-mode');
        mode === 'animation' ? vm.animationMode = true : vm.animationMode = false;
    },

    // 动画更改通知
    async 'scene:animation-change'(uuid: string) {
        if (!vm || vm.currentClip === uuid) {
            return;
        }
        const clipDump = await Editor.Ipc.requestToPanel('scene', 'query-animation-clip', vm.root, vm.currentClip);
        clipDump && (vm.clipDump = formatClipDump(clipDump));
    },

    // 动画播放状态更改通知
    'scene:animation-state-change'() {
        if (!vm || !vm.animationMode) {
            return;
        }
        vm.animationMode = false;
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;
    vm = new Vue({
        el: panel.$.animator,
        data: {
            loading: true,
            grid: null,
            scale: 100, // 初始缩放大小
            offset: 240, // 存储时间轴在当前面板中的偏移数量
            startOffset: 10, // 预留给第一个坐标文字以及关键帧线的间隙

            flags: { // 事件标识符
                mouseDownName: '',
            },

            currentFrame: 0, // （当前关键帧）移动的 pointer 所处在的关键帧

            root: '', // 根节点 uuid
            selectedId: '', // 选中节点 uuid
            nodeDump: null,
            dirty: false, // 数据是否发生修改

            clipDump: null,
            currentClip: '', // 当前动画 clip uuid
            clipsMenu: [],
            selectKey: null,
            compIndex: 0, // 存储当前动画组件在根节点组件的 index 值，方便做数据修改
            hasAnimationComp: false,
            hasAniamtionClip: false,
            animationMode: false,
            animationState: '', // 当前动画的编辑模式
            showEventEditor: false, // 是否显示事件函数编辑器
        },
        computed: {
            // 计算关键帧与实际坐标偏移
            pointerPosition(): number {
                // @ts-ignore
                return this.frameToPixel(this.currentFrame);
            },
            // 当前关键帧显示时间
            currentTime(): string {
                let result = '0:00';
                // @ts-ignore
                if (this.grid) {
                    // @ts-ignore
                    result = this.grid.hformat(this.currentFrame);
                }
                return result;
            },
            properties() {
                const that: any = this;
                if (!that.clipDump || !that.clipDump.pathsDump) {
                    return {};
                }
                return that.clipDump.pathsDump[that.selectPath];
            },

            // 计算显示的 event 位置
            eventsDump() {
                const that: any = this;
                let result: any[] = [];
                if (that.clipDump) {
                    result = that.clipDump.events.map((item: any) => {
                        item.x = that.frameToPixel(item.frame);
                        return item;
                    });
                }
                return result;
            },

            // 计算当前选中节点 path
            selectPath() {
                const that: any = this;
                let result = '/';
                if (that.nodeDump && that.selectedId) {
                    result = that.nodeDump.uuid2path[that.selectedId];
                }
                return result;
            },

            // 计算当前 sample
            sample() {
                let sample = 60;
                // @ts-ignore
                this.clipDump && (sample = this.clipDump.sample);
                return sample;
            },
        },
        methods: {
            init(this: any) {
                // @ts-ignore
                this.$refs.gridCanvas.width = this.$refs.right.offsetWidth;
                // @ts-ignore
                this.$refs.gridCanvas.height = this.$refs.right.offsetHeight;
                this.offset = this.$refs.left.offsetWidth;
                const context = this.$refs.gridCanvas.getContext('2d');
                this.grid = new Grid({
                    context,
                    lineWidth: 0.5,
                    axis: {
                        startOffset: this.startOffset, // 初始时间轴偏移位置
                        lods: [5, 2, 3, 2], // 网格划分等级范围
                        minScale: 20, // 最小缩放范围
                        maxScale: 100, // 最大缩放范围
                        sample: this.sample, // 不设置默认 60
                    },
                });
                // 初始化
                this.grid.xAxisScaleAt(this.offset, 20);

                requestAnimationFrame(() => {
                    this.grid.render();
                    this.offset = this.grid.xAxisOffset;
                });
                this.updateFrame('rewind');
                document.addEventListener('mouseup', () => {
                    this.flags.mouseDownName = '';
                });
            },

            async refresh() {
                const that: any = this;
                // 初始化
                const uuid = Editor.Selection.getLastSelected('node');
                if (uuid) {
                    await that.update(uuid);
                }
                // 预览初始化时获取不到文档流宽高，对 canvas 的初始化造成影响
                requestAnimationFrame(() => {
                    that.init();
                    that.loading = false;
                });
            },

            async update(uuid: string) {
                const that: any = this;
                that.selectedId = uuid;
                if (that.animationMode) {
                    return;
                }
                that.animationMode = false;
                const root = await Editor.Ipc.requestToPanel('scene', 'query-animation-root', uuid);
                if (root) {
                    that.hasAnimationComp = true;
                    await that.updateRoot(uuid);
                    if (that.nodeDump.clipInfo) {
                        const {compIndex, defaultClip} = that.nodeDump.clipInfo;
                        if (!defaultClip) {
                            return;
                        }
                        that.hasAniamtionClip = true;
                        that.compIndex = compIndex;
                        if (that.defaultClip === defaultClip) {
                            return;
                        }
                        that.currentClip = defaultClip;
                        const clipDump = await Editor.Ipc.requestToPanel('scene', 'query-animation-clip', root, defaultClip);
                        clipDump && (vm.clipDump = formatClipDump(clipDump));
                        const mode = await Editor.Ipc.requestToPackage('scene', 'query-scene-mode');
                        mode === 'animation' ? that.animationMode = true : that.animationMode = false;
                        // vm.animationState = await Editor.Ipc.requestToPanel('scene', 'query-animation-state', clipDump.name);
                    } else {
                        that.hasAniamtionClip = false;
                    }
                } else {
                    that.hasAnimationComp = false;
                    await that.updateRoot(uuid);
                }
            },

            ////////////////////////// 数据处理 //////////////////////////////////

            async updateRoot(uuid: string) {
                const that: any = this;
                if (that.root !== uuid) {
                    // 当前节点未添加动画组件
                    const dump = await Editor.Ipc.requestToPanel('scene', 'query-node', uuid);
                    if (!dump) {
                        return;
                    }
                    that.nodeDump = await formatNodeDump(dump);
                    that.root = uuid;
                    that.clipsMenu = await Editor.Ipc.requestToPanel('scene', 'query-animation-clips-info', that.root);
                }
            },

            frameToPixel(frame: number) {
                const that: any = this;
                let result = 0;
                if (that.grid) {
                    result = Math.floor(that.grid.valueToPixelH(frame) - that.startOffset);
                }
                return result;
            },

            pixelToFrame(x: number) {
                const that: any = this;
                x = x - that.$refs.left.offsetWidth;
                return Math.round(that.grid.pixelToValueH(x));
            },

            isDisPlay(x: number): boolean {
                // @ts-ignore
                return x > this.$refs.right.offsetWidth;
            },

            /**
             * 计算对应节点处的关键帧位置
             * @param path
             */
            calcNodeFrames(path: string) {
                const that: any = this;
                const data = that.clipDump.pathsDump[path];
                if (!data) {
                    return [];
                }
                let result: any = [];
                for (const name of Object.keys(data)) {
                    result = result.concat(that.calcFrames(data[name]));
                }
                return result;
            },

            // 计算关键帧数据的实际显示位置
            calcFrames(keyFrames: any[]) {
                const that: any = this;
                const result = keyFrames.map((item) => {
                    item.x = that.grid.valueToPixelH(item.frame);
                    return item;
                });
                return result;
            },

            /**
             * 更新控制杆关键帧
             * @param operate
             */
            updateFrame(operate: string) {
                const that: any = this;
                let newFrame = that.currentFrame;
                switch (operate) {
                    case 'last':
                        newFrame --;
                        break;
                    case 'rewind':
                        newFrame = 0;
                        break;
                    case 'next':
                        newFrame ++;
                        break;
                }
                if (newFrame < 0) {
                    newFrame = 0;
                }
                if (newFrame === 0 && that.grid.xAxisOffset !== that.startOffset) {
                    that.moveTimeLine(that.startOffset - that.grid.xAxisOffset);
                }
                if (that.currentFrame === 0 && newFrame === 0) {
                    return;
                }
                that.currentFrame = newFrame;
            },

            /**
             * 更新关键帧信息
             */
            onKeyMove(path: string, x: number) {

            },

            resize() {
                // @ts-ignore
                const {offsetWidth, offsetHeight} = this.$refs.right;
                // @ts-ignore
                this.grid && this.grid.resize(offsetWidth, offsetHeight);
            },

            ///////////////////////// 对时间轴的处理方法 ///////////////////////////////////////
            /**
             * 对整个时间轴进行缩放
             * @param delta
             */
            moveTimeLine(delta: number) {
                const that: any = this;
                that.grid.transferX(delta);
                requestAnimationFrame(() => {
                    that.grid.render();
                });
            },

            /**
             * 对整个时间轴进行缩放
             * @param delta
             * @param x
             */
            scaleTimeLine(delta: number, x: number) {
                const that: any = this;
                const scale = smoothScale(delta, that.scale);
                that.scale = that.grid.xAxisScaleAt(x, scale); // 坐标画布更改
                that.grid.render();
            },

            ////////////////////////// 事件处理 /////////////////////////////////////////////////
            onMouseWheel(event: any) {
                const that: any = this;
                if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                    that.moveTimeLine(event.deltaY);
                } else {
                    that.scaleTimeLine(-event.deltaY, Math.round(event.offsetX));
                }
            },

            /**
             * 点击
             * @param event
             */
            onMouseDown(event: any) {
                const that: any = this;
                const name = event.target.getAttribute('name');
                if (name === 'time-pointer') {
                    that.currentFrame = that.pixelToFrame(event.x);
                } else {
                    if (event.button === 1 || event.button === 2) {
                        // 鼠标中键或右键按下，标识可以开始拖拽时间轴
                        that.flags.mouseDownName = 'grid';
                        that.flags.mouseDownX = event.x;
                        return;
                    }
                    if (!name) {
                        return;
                    }
                }

                that.flags.mouseDownName = name;
            },

            onMouseMove(event: any) {
                const that: any = this;
                if (!that.flags.mouseDownName) {
                    return;
                }
                const {x} = event;
                if (that.flags.mouseDownName === 'grid') {
                    const moveX = x - that.flags.mouseDownX;
                    if (moveX === 0) {
                        return;
                    }
                    that.flags.mouseDownX = x;
                    that.moveTimeLine(moveX);
                }
            },

            onDragStart(event: any) {
                const that: any = this;

                const { name } = event;
                if (!name) {
                    return;
                }
                that.flags.mouseDownName = name;
            },

            onDragOver(event: any) {
                const that: any = this;

                event.preventDefault(); // NOTE: Must have, otherwise we can not drop
                event.stopPropagation();
                switch (that.flags.mouseDownName) {
                    case 'control-pointer':
                        const x = event.x - that.$refs.left.offsetWidth + that.offset;
                        const frame = Math.round(that.grid.pixelToValueH(x));
                        that.currentFrame = frame;
                        break;
                }

            },

            onScroll(event: any, type: string) {
                const that: any = this;
                const scrollTop = event.target.scrollTop;
                if (!that.scrolling) {
                    requestAnimationFrame(() => {
                        that.$refs[`${type}-content`].scrollTop = scrollTop;
                        that.scrolling = false;
                    });
                }
                that.scrolling = true;
            },

            onConfirm(event: any) {
                const name = event.target.getAttribute('name');
                const value = event.target.value;
                const that: any = this;
                switch (name) {
                    case 'speed':
                        Editor.Ipc.sendToPanel('scene', 'change-clip-speed', that.currentClip, value);
                        break;
                    case 'sample':
                        Editor.Ipc.sendToPanel('scene', 'change-clip-sample', that.currentClip,  value);
                        break;
                    case 'wrapMode':
                        Editor.Ipc.sendToPanel('scene', 'change-clip-wrap-mode', that.currentClip,  value);
                        break;
                }
            },

            //////////////// 组件事件监听 /////////////////////////////////////////////////
            // 工具栏事件监听
            onToolBar(name: string) {
                const that: any = this;
                switch (name) {
                    case 'event':
                        const item = { frame: that.currentFrame };
                        that.clipDump.events.push(item);
                        // this.clipDump.events.slice(this.clipDump.events.length - 1, 0, item);
                        break;
                    case 'save':

                        break;
                    default:
                        that.updateFrame(name);
                        break;
                }
            },

            // 属性操作
            onProperty(operate: string, params: any[]) {
                const that: any = this;
                const {currentClip, selectPath} = that;
                switch (operate) {
                    case 'createKey':
                        Editor.Ipc.requestToPanel('scene', 'create-clip-key', currentClip, selectPath, ...params);
                        break;
                    case 'removeKey':
                        Editor.Ipc.requestToPanel('scene', 'remove-clip-key', currentClip, selectPath, ...params);
                        break;
                    case 'createProp':
                    case 'removeProp':
                        Editor.Ipc.requestToPanel('scene', 'change-clip-prop', operate, currentClip, selectPath, ...params);
                        break;
                        break;
                }
            },

            // 预览关键帧列表部分
            onPreviewRow(operate: string, params: any[]) {
                const that: any = this;
                const {currentClip} = that;
                switch (operate) {
                    case 'createKey':
                        params[3] = that.pixelToFrame(params[3]);
                        Editor.Ipc.requestToPanel('scene', 'create-clip-key', currentClip, ...params);
                        break;
                    case 'removeKey':
                        Editor.Ipc.requestToPanel('scene', 'remove-clip-key', currentClip, ...params);
                        break;
                    case 'moveKeys':
                        const offset = Math.round(that.grid.pixelToValueH(params[params.length - 1]));
                        if (offset === 0) {
                            return;
                        }
                        params[params.length - 1] = offset;
                        Editor.Ipc.requestToPanel('scene', 'move-clip-keys', currentClip, ...params);
                        break;
                }
            },

            onEvents(operate: string) {
                const that: any = this;
                if (operate === 'openEventEditor') {
                    that.showEventEditor = true;
                }
            },
        },
        components: {
            'control-preview': require('./components/control-pointer'),
            'preview-row': require('./components/preview-row'),
            'tool-bar': require('./components/toolbar'),
            'node-tree': require('./components/node-tree'),
            'property-tree': require('./components/property-tree'),
            'tips-mask': require('./components/tips-mask'),
            events: require('./components/events'),
            'property-tools': require('./components/property-tools'),
            'event-editor': require('./components/event-editor'),
        },
        async mounted() {
            const isReady = await Editor.Ipc.requestToPanel('scene', 'query-is-ready');
            if (isReady) {
                // @ts-ignore
                await this.refresh();
            }
        },
    });
}

export async function beforeClose() {}
export async function close() {}
