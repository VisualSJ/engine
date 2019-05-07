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
const {smoothScale, formatNodeDump, timeToFrame, frameToTime, formatClipDump, sortSelectParams} = require('./../../static/script/utils.js');
const LINEHEIGHT = 24;
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

export const methods = {
    /**
     * 删除选中的关键帧或关键帧事件
     */
    deleteSelected() {
        if (!vm) {
            return;
        }
        vm.onPreviewRow('removeKey');
        vm.onEvents('deleteEvent');
    },

    /**
     * 拷贝选中的关键帧或关键帧事件
     */
    copySelected() {
        vm.onPreviewRow('copyKey');
        vm.onEvents('copyEvent');
    },

    /**
     * 粘贴复制的内容
     */
    paste() {
        vm.onPreviewRow('pasteKey', {frame: vm.currentFrame});
        vm.onEvents('pasteEvent', {frame: vm.currentFrame});
    },

    /**
     * 跳转前一帧
     */
    jumpPrevFrame() {
        if (!vm) {
            return;
        }
        vm.updateFrameContinue = true;
        vm.stepUpdateFrame('jump_prev_frame');
    },

    /**
     * 跳转下一帧
     */
    jumpNextFrame() {
        if (!vm) {
            return;
        }
        vm.updateFrameContinue = true;
        vm.stepUpdateFrame('jump_next_frame');
    },

    /**
     * 跳转第一帧
     */
    jumpFirstFrame() {
        if (!vm) {
            return;
        }
        vm.updateFrame('jump_first_frame');
    },

    /**
     * 跳转最后一帧
     */
    jumpLastFrame() {
        if (!vm) {
            return;
        }
        vm.updateFrame('jump_last_frame');
    },

};
export const listeners = {
    resize() {
        vm && vm.resize();
    },

    /**
     * 窗口显示时调用更新
     */
    show() {
        vm && vm.refresh();
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
     * 取消选中某个节点
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    async 'selection:unselect'(type: string, uuid: string) {
        if (!vm || type !== 'node') {
            return;
        }
        vm.selectedId = '';
    },

    /**
     * 节点修改后需要更新动画编辑器内节点的显示状态
     * @param {string} uuid
     */
    async 'scene:change-node'(uuid: string) {
        if (!vm || uuid !== vm.root) {
            // 不在编辑器模式下的节点数据主动触发部分数据更新
            if (vm.selectedId === uuid && !vm.animationMode) {
                vm.selectDataChange++;
            }
            return;
        }
        await vm.update(uuid);
    },

    // 打开动画编辑模式消息
    async 'scene:animation-start'(uuid: string) {
        if (!vm || uuid !== vm.root || vm.animationMode) {
            return;
        }
        vm.animationMode = true;
    },

    // 关闭动画编辑模式消息
    async 'scene:animation-end'() {
        if (!vm || !vm.animationMode) {
            return;
        }
        vm.animationMode = false;
    },

    // 动画更改通知
    async 'scene:animation-change'(uuid: string) {
        if (!vm) {
            return;
        }
        const clipDump = await Editor.Ipc.requestToPanel('scene', 'query-animation-clip', vm.root, vm.currentClip);
        requestAnimationFrame(() => {
            clipDump && (vm.clipDump = formatClipDump(clipDump));
            if (clipDump.sample !== vm.grid.sample) {
                vm.grid.sample = clipDump.sample;
                vm.grid.render();
            }
        });
    },

    // 动画播放状态更改通知
    'scene:animation-state-change'(state: number) {
        if (!vm || !vm.animationMode) {
            return;
        }
        vm.updateState(state);
    },

    // 动画播放时的事件变化广播消息
    'scene:animation-time-change'(time: number) {
        if (!vm || !vm.animationMode) {
            return;
        }
        // const frame = timeToFrame(time, vm.sample);
        // vm.setCurrentFrame(frame);
        // console.log(time);
    },

    // 动画更改 clips 时的动画通知
    async 'scene:animation-clip-change'(clipUuis: string) {
        if (!vm || !vm.animationMode) {
            return;
        }
        const clipDump = await Editor.Ipc.requestToPanel('scene', 'query-animation-clip', vm.rootid, clipUuis);
        clipDump && (vm.clipDump = formatClipDump(clipDump));
        vm.setCurrentFrame(0);
        const state = await Editor.Ipc.requestToPanel('scene', 'query-animation-state', vm.currentClip);
        vm.updateState(state);
        const time = await Editor.Ipc.requestToPanel('scene', 'query-animation-clips-time');
        if (typeof(time) === 'number') {
            vm.setCurrentFrame(timeToFrame(time, vm.sample));
        }
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
            canvasSize: null,
            flags: { // 事件标识符
                mouseDownName: '',
            },

            currentFrame: 0, // （当前关键帧）移动的 pointer 所处在的关键帧
            mousePosition: 0, // 鼠标所在位置的关键帧信息
            root: '', // 根节点 uuid
            selectedId: '', // 选中节点 uuid
            nodeDump: null,

            clipDump: null,
            currentClip: '', // 当前动画 clip uuid
            currentBezierData: {},
            clipsMenu: [],
            selectKeyInfo: null, // 当前选中的关键帧
            selectEventInfo: null, // 当前选中的事件信息
            copyKeyInfo: null, // 复制的关键帧信息
            copyEventInfo: null, // 复制的关键帧事件信息
            // compIndex: 0, // 存储当前动画组件在根节点组件的 index 值，方便做数据修改
            hasAnimationComp: false,
            hasAniamtionClip: false,
            animationMode: false, // 当前动画的编辑模式
            animationState: 'stop', // 当前动画的播放模式
            aniPlayTask: '',
            selectEventFrame: 0,
            showEventEditor: false, // 是否显示事件函数编辑器
            showBezierEditor: false, // 是否显示贝塞尔曲线编辑器
            selectDataChange: 0, // 更新当前选中节点数据的

            nodeScrollInfo: null,
            propertyScrollInfo: null,
            moveInfo: null, // 存储当前移动过程中的关键帧信息
            boxInfo: null,
            boxStyle: null,
            boxData: null,
            previewPointer: null,
            previewPointerTask: null,
        },
        computed: {
            // 计算关键帧与实际坐标偏移
            pointerPosition(): number {
                // @ts-ignore
                return this.frameToPixel(this.currentFrame);
            },
            // 当前关键帧显示时间
            currentTime(): string {
                let result = '0-00';
                // @ts-ignore
                if (this.grid) {
                    // @ts-ignore
                    result = this.grid.hformat(this.currentFrame);
                }
                return result;
            },
            properties() {
                const that: any = this;
                if (!that.clipDump || !that.clipDump.pathsDump || !that.grid) {
                    return null;
                }
                const data = that.clipDump.pathsDump[that.selectPath];
                if (!data) {
                    return null;
                }
                for (const name of Object.keys(data)) {
                    data[name].keyFrames = that.calcFrames(data[name].dump);
                }
                return data;
            },

            // 计算显示的 event 位置
            eventsDump() {
                const that: any = this;
                let result: any[] = [];
                if (that.clipDump && that.grid) {
                    result = that.clipDump.events.map((item: any) => {
                        item.x = that.grid.valueToPixelH(item.frame);
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

            // 计算当前最后一帧与位置数据
            lastFrameInfo() {
                const that: any = this;
                let frame = 0;
                if (that.clipDump) {
                    frame = timeToFrame(that.clipDump.duration, that.sample);
                }
                const x = that.frameToPixel(frame);
                return {
                    frame,
                    x,
                };
            },

            nodesHeight() {
                const that: any = this;
                if (!that.nodeDump) {
                    return 0;
                }
                return that.nodeDump.nodes.length * LINEHEIGHT;
            },

            propertyHeight() {
                const that: any = this;
                if (!that.properties) {
                    return 0;
                }
                return Object.keys(that.properties).length * LINEHEIGHT;
            },

            compIndex() {
                const that: any = this;
                if (!that.nodeDump) {
                    return;
                }
                if (!that.nodeDump.clipInfo) {
                    return;
                }
                return that.nodeDump.clipInfo.compIndex;
            },
        },
        watch: {
            async currentClip() {
                const that: any = this;
                Editor.Ipc.sendToPanel('scene', 'change-edit-clip', that.currentClip);
                const clipDump = await Editor.Ipc.requestToPanel('scene', 'query-animation-clip', that.root, that.currentClip);
                clipDump && (that.clipDump = formatClipDump(clipDump));
                const time = await Editor.Ipc.requestToPanel('scene', 'query-animation-clips-time');
                if (typeof(time) === 'number') {
                    that.setCurrentFrame(timeToFrame(time, that.sample));
                }
                const state = await Editor.Ipc.requestToPanel('scene', 'query-animation-state', that.currentClip);
                that.updateState(state);
            },
            //
            selectedId() {
                const that: any = this;
                if (!that.nodeDump) {
                    return;
                }
                const index = that.nodeDump.nodes.findIndex((item: any) => {
                    return item.uuid === that.selectedId;
                });
                if (index === -1) {
                    return;
                }
                const selectHeight = index * LINEHEIGHT;
                const {top, height} = that.nodeScrollInfo;
                // const offset = selectHeight
                if (selectHeight - top > height || selectHeight - top < 0) {
                    that.$refs.nodes.scrollTop = selectHeight - height / 2;
                    that.nodeScrollInfo.top = selectHeight - height / 2;
                }
            },
        },
        methods: {
            t(key: string, type = '') {
                return Editor.I18n.t(`animator.${type}${key}`);
            },

            init(this: any) {
                const that: any = this;
                that.$refs.gridCanvas.width = that.$refs.right.offsetWidth;
                that.$refs.gridCanvas.height = that.$refs.right.offsetHeight;
                that.offset = that.$refs.left.offsetWidth;
                const context = that.$refs.gridCanvas.getContext('2d');
                that.grid = new Grid({
                    context,
                    lineWidth: 0.5,
                    axis: {
                        startOffset: that.startOffset, // 初始时间轴偏移位置
                        lods: [5, 2, 3, 2], // 网格划分等级范围
                        minScale: 20, // 最小缩放范围
                        maxScale: 100, // 最大缩放范围
                        sample: that.sample, // 不设置默认 60
                    },
                });
                // 初始化
                that.grid.xAxisScaleAt(that.offset, 20);

                requestAnimationFrame(() => {
                    that.grid.render();
                    that.offset = that.grid.xAxisOffset;
                    that.loading = false;
                    that.setCurrentFrame(that.currentFrame); // 主动触发更新
                });
            },

            async refresh() {
                const that: any = this;
                const size = {
                    w: that.$refs.right.offsetWidth,
                    h: that.$refs.right.offsetHeight,
                };
                that.nodeScrollInfo = {
                    size,
                    height: that.$refs['node-content'].offsetHeight,
                    top: 0,
                };
                that.propertyScrollInfo = {
                    size,
                    height: that.$refs['property-content'].offsetHeight,
                    top: 0,
                };
                // 初始化
                const uuid = Editor.Selection.getLastSelected('node');
                if (uuid) {
                    await that.update(uuid);
                } else {
                    // 当前没有选中节点，需要判断是否已在动画编辑模式下
                    const mode = await Editor.Ipc.requestToPackage('scene', 'query-scene-mode');
                    mode === 'animation' ? that.animationMode = true : that.animationMode = false;
                    if (that.animationMode) {
                        const {rootid, clipid} = await Editor.Ipc.requestToPackage('scene', 'query-current-animation-info');
                        that.currentClip = clipid;
                        await that.updateRoot(rootid);
                    } else {
                        that.resetState();
                    }
                }
                that.init();
            },
            resetState() {
                const that: any = this;
                that.animationMode = false;
                that.clipDump = null;
                that.nodeDump = null;
                that.hasAniamtionClip = false;
                that.hasAnimationComp = false;
            },

            async update(uuid: string) {
                const that: any = this;
                that.selectedId = uuid;
                if (that.animationMode) {
                    // 编辑状态只更新 clips 菜单
                    that.clipsMenu = await Editor.Ipc.requestToPanel('scene', 'query-animation-clips-info', that.root);
                    return;
                }
                that.animationMode = false;
                const root = await Editor.Ipc.requestToPanel('scene', 'query-animation-root', uuid);
                if (root) {
                    await that.updateRoot(root);
                    if (that.nodeDump.clipInfo) {
                        that.hasAnimationComp = true;
                        const { defaultClip} = that.nodeDump.clipInfo;
                        if (!defaultClip) {
                            that.hasAniamtionClip = false;
                            that.clipDump = null;
                            return;
                        }
                        that.hasAniamtionClip = true;
                        // that.compIndex = compIndex;
                        if (that.defaultClip === defaultClip) {
                            return;
                        }
                        that.currentClip = defaultClip;
                        const mode = await Editor.Ipc.requestToPackage('scene', 'query-scene-mode');
                        mode === 'animation' ? that.animationMode = true : that.animationMode = false;
                    } else {
                        that.hasAnimationComp = false;
                        that.hasAniamtionClip = false;
                        that.clipDump = null;
                    }
                } else {
                    that.hasAnimationComp = false;
                    that.hasAniamtionClip = false;
                    that.clipDump = null;
                    await that.updateRoot(uuid);
                }
            },

            updateState(state: number) {
                const that: any = this;
                switch (state) {
                    case 0:
                        vm.animationState = 'stop';
                        that.aniPlayTask && cancelAnimationFrame(that.aniPlayTask);
                        break;
                    case 1:
                        vm.animationState = 'playing';
                        that.runPointer();
                        break;
                    case 2:
                        vm.animationState = 'pause';
                        that.aniPlayTask && cancelAnimationFrame(that.aniPlayTask);
                        break;
                }
            },

            ////////////////////////// 数据处理 //////////////////////////////////

            // 更改当前关键帧
            setCurrentFrame(frame: number) {
                // 更新当前关键帧
                const that: any = this;
                that.currentFrame = frame;
                if (frame === 0) {
                    if (that.grid && that.grid.xAxisOffset !== that.startOffset) {
                        that.moveTimeLine(that.startOffset - that.grid.xAxisOffset);
                    }
                    return;
                }
                const frameRang = that.frameRang();

                if (frameRang) {
                    const {start, end} = frameRang;
                    // 超过边界
                    if (frame >= end) {
                        const startPosition = that.frameToPixel(start + 1);
                        that.moveTimeLine(startPosition - that.pointerPosition);
                    } else if (frame < start) {
                        const endPosition = that.frameToPixel(end - 1);
                        that.moveTimeLine(endPosition - that.pointerPosition);
                    }
                }
            },

            // 计算当前可视范围内的关键帧范围
            frameRang() {
                const that: any = this;
                if (that.grid) {
                    const rang = that.$refs.gridCanvas.width;
                    const start = Math.round(that.grid.pixelToValueH(that.startOffset));
                    const end = Math.round(that.grid.pixelToValueH(that.startOffset + rang));
                    return {
                        start,
                        end,
                    };
                }
            },

            async updateRoot(uuid: string) {
                const that: any = this;
                // 当前节点未添加动画组件
                const dump = await Editor.Ipc.requestToPanel('scene', 'query-node', uuid);
                if (!dump) {
                    return;
                }
                that.nodeDump = await formatNodeDump(dump);
                that.root = uuid;
                that.clipsMenu = await Editor.Ipc.requestToPanel('scene', 'query-animation-clips-info', that.root);
            },

            frameToPixel(frame: number) {
                const that: any = this;
                let result = 0;
                if (that.grid) {
                    result = Math.floor(that.grid.valueToPixelH(frame) - that.startOffset);
                }
                return Number(result);
            },

            // 相对于 canvas 面板的 x 距离转化为关键帧
            pixelToFrame(x: number) {
                const that: any = this;
                let result =  Math.round(that.grid.pixelToValueH(x));
                if (result < 0) {
                    result = 0;
                }
                return result;
            },

            isDisPlay(x: number): boolean {
                // @ts-ignore
                return x > this.$refs.right.offsetWidth;
            },

            queryDurationStyle(frame: number): string {
                const that: any = this;
                if (!frame || !that.grid) {
                    return '';
                }
                const start = that.grid.valueToPixelH(0);
                const width = that.grid.valueToPixelH(frame);
                // @ts-ignore
                return `transform: translateX(${start}px); width: ${width - start}px`;
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
                    result = result.concat(that.calcFrames(data[name].dump));
                }
                return result;
            },

            /**
             * 将 event 上的 x 值，转换为关键帧
             * @param x
             */
            pageToFrame(x: number) {
                const that: any = this;
                const offset =  x - that.$refs.left.getBoundingClientRect().right - that.startOffset;
                const offsetFrame = Math.round(that.grid.pixelToValueH(Math.abs(offset)));
                if (offset > 0) {
                    return offsetFrame;
                } else {
                    return -offsetFrame;
                }
            },

            /**
             * 将 event 上的 x, y 计算为相对于Ctrl面板的坐标信息
             */
            pageToCtrol(x: number, y: number) {
                const that: any = this;
                const result: any = {};
                if (x) {
                    result.x = x -  that.$refs.left.getBoundingClientRect().right;
                }

                if (y) {
                    result.y = y - that.$refs.left.getBoundingClientRect().top;
                }
                return result;
            },

            // 计算关键帧数据的实际显示位置
            calcFrames(keyFrames: any[]) {
                if (!keyFrames) {
                    return [];
                }
                const that: any = this;
                const result = keyFrames.map((item) => {
                    item.x = that.grid.valueToPixelH(item.frame);
                    return item;
                });
                return result;
            },

            // 计算框选的数据信息
            calcBoxStyle() {
                const that: any = this;
                if (!that.boxInfo) {
                    return;
                }
                const {startX, startY, type, x, y} = that.boxInfo;
                const point = that.pageToCtrol(x, y);
                // 先把鼠标移动的点控制转化为当前与i内需框选的范围之内
                const {offsetTop, offsetHeight, offsetWidth} = that.$refs[`${type}-content`];
                const endX = Editor.Utils.Math.clamp(point.x, 0, offsetWidth);
                const endY = Editor.Utils.Math.clamp(point.y, offsetTop, offsetTop + offsetHeight);
                const w = startX - endX;
                const h = startY - endY;
                // 宽高一个为 0 返回
                if (!w || !h) {
                    return;
                }
                const origin: any = {};
                if (w > 0 && h > 0) {
                    // 往左上角移动
                    origin.x = endX;
                    origin.y = endY - offsetTop;
                } else if (w < 0 && h < 0) {
                    // 右下角移动
                    origin.x = startX;
                    origin.y = startY - offsetTop;
                } else if (w < 0 && h > 0) {
                    // 左下角
                    origin.x = startX;
                    origin.y = endY - offsetTop;
                } else if (w > 0 && h < 0) {
                    // 右下角
                    origin.x = endX;
                    origin.y = startY - offsetTop;
                }
                that.boxData = {
                    origin,
                    w: Math.abs(w),
                    h: Math.abs(h),
                    type: that.boxInfo.type,
                };
                return {
                    top: `${origin.y}px`,
                    left: `${origin.x}px`,
                    right: `${offsetWidth - origin.x - Math.abs(w)}px`,
                    bottom: `${offsetHeight - origin.y - Math.abs(h)}px`,
                };
            },

            /**
             * 更新控制杆关键帧
             * @param operate
             */
            updateFrame(operate: string) {
                const that: any = this;
                let newFrame = that.currentFrame;
                switch (operate) {
                    case 'jump_prev_frame':
                        if (that.currentFrame > 0) {
                            newFrame --;
                        }
                        break;
                    case 'jump_first_frame':
                        newFrame = 0;
                        break;
                    case 'jump_next_frame':
                        // 初次 300 ms 延迟，以免无法单步递增
                        newFrame ++;
                        break;
                    case 'jump_last_frame':
                        newFrame = that.lastFrameInfo.frame;
                        break;
                }
                that.setCurrentFrame(newFrame);
                const time = frameToTime(newFrame, that.sample);
                Editor.Ipc.sendToPanel('scene', 'set-edit-time', time);
            },

            resize() {
                // @ts-ignore
                const {offsetWidth, offsetHeight} = this.$refs.right;
                // @ts-ignore
                this.grid && this.grid.resize(offsetWidth, offsetHeight);
            },

            // 更新选中关键帧位置,以及当前鼠标关键帧的位置
            updatePositionInfo() {
                const that: any = this;
                if (that.selectKeyInfo) {
                    for (const item of that.selectKeyInfo.data) {
                        if (!item) {
                            continue;
                        }
                        item.x = that.grid.valueToPixelH(item.frame);
                    }
                }
                if (that.selectEventInfo) {
                    for (const item of that.selectEventInfo.data) {
                        if (!item) {
                            continue;
                        }
                        item.x = that.grid.valueToPixelH(item.frame);
                    }
                }
                if (that.previewPointer && that.previewPointer.x) {
                    requestAnimationFrame(() => {
                        that.previewPointer.frame = that.pixelToFrame(that.previewPointer.x);
                    });
                }
            },
            ///////////////////////// 对时间轴的处理方法 ///////////////////////////////////////
            /**
             * 对整个时间轴进行移动
             * @param delta (移动距离)
             */
            moveTimeLine(delta: number) {
                const that: any = this;
                that.grid.transferX(delta);
                requestAnimationFrame(() => {
                    that.updatePositionInfo();
                    that.grid.render();
                    that.offset = that.grid.xAxisOffset;
                });
            },

            /**
             * 对整个时间轴进行缩放
             * @param delta 缩放时鼠标滚动距离，用具计算缩放倍数
             * @param x 缩放中心点
             */
            scaleTimeLine(delta: number, x: number) {
                const that: any = this;
                const scale = smoothScale(delta, that.scale);
                that.scale = that.grid.xAxisScaleAt(x, scale); // 坐标画布更改
                that.updatePositionInfo();
                that.grid.render();
                that.offset = that.grid.xAxisOffset;
            },

            ////////////////////////// 事件处理 /////////////////////////////////////////////////
            onKeyDown(event: any) {
                const that: any = this;

                switch (event.keyCode) {
                    case 39: // 右箭头，跳转到下一帧
                        that.updateFrame('jump_next_frame');
                        setTimeout(() => {
                            requestAnimationFrame(() => {
                                that.updateFrameContinue && that.updateFrame('jump_next_frame');
                            });
                        }, 300);
                        break;
                    case 37: // 左箭头， 跳转到上一帧
                        that.updateFrame('jump_prev_frame');
                        setTimeout(() => {
                            requestAnimationFrame(() => {
                                that.updateFrameContinue && that.updateFrame('jump_prev_frame');
                            });
                        }, 300);
                        break;
                }
            },

            onKeyUp(event: any) {
                const that: any = this;
                that.updateFrameContinue = false;
            },

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
                that.boxInfo = null;
                that.boxStyle = null;
                const name = event.target.getAttribute('name');
                if (name !== 'event') {
                    that.selectEventInfo = null;
                }
                if (name !== 'key') {
                    that.selectKeyInfo = null;
                }
                let boxInfo: any = null;
                // 点击顶部移动当前关键帧
                switch (name) {
                    case 'time-pointer':
                        const frame = that.pixelToFrame(event.offsetX);
                        if (event.button === 2) {
                            // 粘贴关键帧事件
                            const menu = [{
                                label: that.t('create', 'event.'),
                                click() {
                                    that.onEvents('addEvent', [frame]);
                                },
                            }];
                            if (that.copyEventInfo) {
                                menu.push({
                                    label: that.t('paste', 'event.'),
                                    click() {
                                        that.onEvents('pasteEvent', [frame]);
                                    },
                                });
                            }
                            Editor.Menu.popup({
                                x: event.pageX,
                                y: event.pageY,
                                menu,
                            });
                            return;
                        }
                        that.currentFrame = frame;
                        const time = frameToTime(that.currentFrame, that.sample);
                        Editor.Ipc.sendToPanel('scene', 'set-edit-time', time);
                        that.flags.mouseDownName = 'time-pointer';
                        break;
                    case 'pointer':
                        // 不允许左键中键移动小红线
                        if (event.button === 0) {
                            that.flags.mouseDownName = 'pointer';
                        }
                        break;
                    case 'node':
                    case 'property':
                        if (event.button === 0) {
                            boxInfo = {
                                type: name,
                            };
                            that.flags.mouseDownName = name;
                        } else {
                            that.flags.mouseDownName = 'grid';
                            that.flags.mouseDownX = event.x;
                            return;
                        }
                        break;
                    default:
                        if (event.button === 1 || event.button === 2) {
                            // 鼠标中键或右键按下，标识可以开始拖拽时间轴
                            that.flags.mouseDownName = 'grid';
                            that.flags.mouseDownX = event.x;
                            return;
                        }
                        if (!name) {
                            break;
                        }
                        that.flags.mouseDownName = name;
                }
                // 针对 box 的显示效果
                if (!boxInfo) {
                    const $node = event.path.find((item: any) => {
                        return item.className === 'content';
                    });
                    if (!$node) {
                        return;
                    }
                    that.flags.mouseDownName = $node.getAttribute('name');
                    boxInfo = {
                        type: $node.getAttribute('name'),
                    };
                }

                if (['node', 'property'].includes(that.flags.mouseDownName)) {
                    const positionResult = that.pageToCtrol(event.x, event.y);
                    boxInfo.startX = positionResult.x;
                    boxInfo.startY = positionResult.y;
                    that.boxInfo = boxInfo;
                }
            },

            onMouseUp(event: any) {
                const that: any = this;
                that.updateFrameContinue = false;
                if (!that.flags.mouseDownName) {
                    return;
                }
                that.boxInfo = null;
                that.boxStyle = null;
                that.boxData = null;
                that.flags.draging = false;
                const frame = that.pixelToFrame(event.offsetX);
                switch (that.flags.mouseDownName) {
                    case 'key':
                        if (event.altKey) {
                            that.copyKeyInfo = that.selectKeyInfo;
                            that.onPreviewRow('pasteKey', {frame});
                            break;
                        }
                        that.onPreviewRow('moveKeys');
                        break;
                    case 'event':
                        if (!that.selectEventInfo) {
                            break;
                        }
                        if (event.altKey) {
                            that.copyEventInfo = that.selectEventInfo;
                            that.onEvents('pasteEvent', [frame]);
                            break;
                        }
                        if (that.selectEventInfo.offsetFrame === 0) {
                            break;
                        }
                        const {frames, offsetFrame} = that.selectEventInfo;
                        Editor.Ipc.sendToPanel('scene', 'move-clip-events', that.currentClip, frames, offsetFrame);
                        that.selectEventInfo = null;
                        break;
                }
                that.flags.mouseDownName = '';
                that.flags.mouseDownX = 0;
                that.moveInfo = null;
                // that.boxInfo = null;
            },

            onMouseMove(event: any) {
                const that: any = this;
                const {x, y} = event;
                if (that.flags.mouseDownName) {
                    that.previewPointer = null;
                }
                // 需要实时显示拖拽过程中鼠标信息的处理
                if (['key', 'event'].includes(that.flags.mouseDownName)) {
                    const frame = that.pageToFrame(x);
                    if (frame < 0) {
                        return;
                    }
                    const result = that.pageToCtrol(x, y);
                    // 关键帧的半径大小是 5
                    if (!that.moveInfo) {
                        that.moveInfo = {
                            x: result.x + 5,
                            y: result.y + 5,
                        };
                    } else {
                        that.moveInfo.x = result.x + 5;
                        that.moveInfo.y = result.y + 5;
                    }
                    that.moveInfo.frame = that.pageToFrame(x);
                }

                switch (that.flags.mouseDownName) {
                    case 'key':
                        if (that.selectKeyInfo) {
                            const {startX, data} = that.selectKeyInfo;
                            if (startX === event.x) {
                                return;
                            }
                            if (event.altKey) {
                                event.target.style.cursor = 'copy';
                            } else {
                                event.target.style.cursor = 'ew-resize';
                            }
                            const startFrame = that.pageToFrame(event.x);
                            const endFrame = that.pageToFrame(startX);
                            const offsetFrame = that.pageToFrame(event.x) - that.pageToFrame(startX);
                            if (offsetFrame === 0) {
                                return;
                            }
                            const offset = that.grid.valueToPixelH(startFrame) - that.grid.valueToPixelH(endFrame);
                            requestAnimationFrame(() => {
                                that.selectKeyInfo.startX = event.x;
                                that.selectKeyInfo.offset += offset;
                                that.selectKeyInfo.offsetFrame += offsetFrame;
                                data.forEach((item: any) => {
                                    item.x += offset;
                                });
                                that.moveInfo.offsetFrame = that.selectKeyInfo.offsetFrame;
                            });
                        }
                        break;
                    case 'event':
                        if (that.selectEventInfo) {
                            if (event.altKey) {
                                event.target.style.cursor = 'copy';
                            } else {
                                event.target.style.cursor = 'ew-resize';
                            }
                            const {startX, data} = that.selectEventInfo;
                            const startFrame = that.pageToFrame(event.x);
                            const endFrame = that.pageToFrame(startX);
                            const offsetFrame = that.pageToFrame(event.x) - that.pageToFrame(startX);
                            if (offsetFrame === 0) {
                                return;
                            }
                            const offset = that.grid.valueToPixelH(startFrame) - that.grid.valueToPixelH(endFrame);
                            requestAnimationFrame(() => {
                                that.selectEventInfo.startX = event.x;
                                that.selectEventInfo.offset += offset;
                                that.selectEventInfo.offsetFrame += offsetFrame;
                                data.forEach((item: any) => {
                                        item.x += offset;
                                });
                                that.moveInfo.offsetFrame = that.selectEventInfo.offsetFrame;
                            });
                        }
                        break;
                    case 'grid':
                        event.target.style.cursor = '-webkit-grabbing';
                        const moveX = x - that.flags.mouseDownX;
                        if (moveX === 0) {
                            return;
                        }
                        that.flags.mouseDownX = x;
                        that.moveTimeLine(moveX);
                        break;
                    case 'pointer':
                    case 'time-pointer':
                        event.target.style.cursor = 'ew-resize';
                        that.currentFrame = that.pageToFrame(event.x);
                        Editor.Ipc.sendToPanel('scene', 'set-edit-time', frameToTime(that.currentFrame, that.sample));
                        break;
                }
                if (!that.flags.mouseDownName) {
                    event.target.style.cursor = '';
                    // 处理鼠标经过时的位置提示
                    const result = that.pageToCtrol(x, y);
                    const pointerFrame = that.pageToFrame(x + 5);
                    if (that.previewPointer && that.previewPointer.frame === pointerFrame && that.previewPointer.y === result.y) {
                        return;
                    }
                    clearTimeout(that.previewPointerTask);
                    // 留有距离避免影响到点击关键帧等的使用
                    result.y += 24;
                    // 限制提示关键帧的显示范围，避免影响到顶部的使用
                    if (result.y < 32) {
                        result.y = 32;
                    }
                    that.previewPointer = {
                        frame: pointerFrame,
                        x: that.frameToPixel(pointerFrame),
                        y: result.y,
                    };
                    that.previewPointerTask = setTimeout(() => {
                        that.previewPointer = null;
                    }, 1000);
                    return;
                }
                if (['node', 'property'].includes(that.flags.mouseDownName)) {
                    that.flags.draging = true;
                    // 对 box 的框选处理
                    if (that.boxInfo) {
                        that.boxStyle = null;
                        that.boxInfo.x = event.x;
                        that.boxInfo.y = event.y;
                        that.boxStyle = that.calcBoxStyle();
                    }
                }
            },

            onScroll(event: any, type: string) {
                const that: any = this;
                const scrollTop = event.target.scrollTop;
                if (!that.scrolling) {
                    requestAnimationFrame(() => {
                        that[`${type}ScrollInfo`].top = scrollTop;
                        // that.$refs[`${type}-content`].scrollTop = scrollTop;
                        that.scrolling = false;
                    });
                }
                that.scrolling = true;
            },

            async onConfirm(event: any) {
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
                    case 'exit':
                        that.exit();
                        break;
                    case 'clip':
                        that.currentClip = value;
                        break;
                }
            },

            async exit() {
                const that: any = this;
                return await Editor.Ipc.requestToPanel('scene', 'record', that.root, false);
            },

            /**
             * 保存场景数据
             */
            async saveData() {
                const isSave = await Editor.Ipc.requestToPanel('scene', 'save-clip');
                if (isSave) {
                    return true;
                }
            },

            // 关键帧的自动移动
            runPointer() {
                const that: any = this;
                that.aniPlayTask = requestAnimationFrame(async () => {
                    if (that.animationState === 'playing') {
                        const time = await Editor.Ipc.requestToPanel('scene', 'query-animation-clips-time');
                        const frame = timeToFrame(time, that.sample);
                        that.setCurrentFrame(frame);
                        if (time === false) {
                            return;
                        }
                        that.runPointer();
                    } else {
                        cancelAnimationFrame(that.aniPlayTask);
                        // 预防数据未完整更新，多查询一次
                        const time = await Editor.Ipc.requestToPanel('scene', 'query-animation-clips-time');
                        that.setCurrentFrame(timeToFrame(time, that.sample));
                    }
                });
            },

            // 递增或递减关键帧数据
            stepUpdateFrame(operate: string) {
                const that: any = this;
                that.updateFrame(operate);
                setTimeout(() => {
                    requestAnimationFrame(() => {
                        that.updateFrameContinue && that.updateFrame(operate);
                    });
                }, 300);
            },

            //////////////// 组件事件监听 /////////////////////////////////////////////////
            // 更新当前的拖拽物信息
            updateDragInfo(type: string, params: any[]) {
                const that: any = this;
                switch (type) {
                    case 'moveKey':
                        that.selectKeyInfo = params[0];
                        that.flags.mouseDownName = 'key';
                        if (params[1] !== that.selectPath) {
                            that.selectedId = that.nodeDump.path2uuid[params[1]];
                        }
                        break;
                    case 'moveEvent':
                        that.selectEventInfo = params[0];
                        that.flags.mouseDownName = 'event';
                        break;
                }
            },

            // 工具栏事件监听queryPlayingClipTime
            async onToolBar(operate: string, params: any[]) {
                const that: any = this;
                switch (operate) {
                    case 'addEvent':
                        that.onEvents('addEvent', params);
                        break;
                    case 'update-state':
                        let operate = params[0];
                        if (operate === 'play' && that.animationState === 'pause') {
                            operate = 'resume';
                        }
                        const changeSuccess = await Editor.Ipc.requestToPanel('scene', 'change-clip-state', operate, that.currentClip);
                        if (!changeSuccess) {
                            console.warn(`${that.currentClip} change play status ${operate} failed！`);
                        }
                        if (operate === 'stop') {
                            that.setCurrentFrame(0);
                        }
                        break;
                    case 'update-frame':
                        that.updateFrameContinue = true;
                        if (params[0] === 'jump_next_frame' || params[0] === 'jump_prev_frame') {
                            that.stepUpdateFrame(params[0]);
                        } else {
                            that.updateFrame(params[0]);
                        }
                        break;
                }
            },

            // 属性操作
            async onProperty(operate: string, params: any[]) {
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
                        if (operate === 'removeProp') {
                            const shouldClear = await that.checkClearData();
                            if (!shouldClear) {
                                break;
                            }
                        }
                        Editor.Ipc.requestToPanel('scene', 'change-clip-prop', operate, currentClip, selectPath, ...params);
                        break;
                    case 'clearKeys':
                        const shouldClear = await that.checkClearData();
                        if (!shouldClear) {
                            break;
                        }
                        Editor.Ipc.requestToPanel('scene', 'clear-prop-keys', currentClip, selectPath, ...params);
                        break;
                }
            },

            async checkClearData() {
                const that: any = this;
                const t = that.t;
                const result = await Editor.Dialog.show({
                    type: 'info',
                    title: t('is_clear'),
                    message: t('is_clear_message'),
                    buttons: [t('cancel'), t('clear')],
                    default: 0,
                    cancel: 0,
                });
                if (result === 1) {
                    return true;
                }
            },

            // 预览关键帧列表部分
            async onPreviewRow(operate: string, params: any) {
                const that: any = this;
                const {currentClip} = that;
                switch (operate) {
                    case 'copyKey':
                        if (!that.selectKeyInfo) {
                            break;
                        }
                        that.copyKeyInfo = that.selectKeyInfo;
                        break;
                    case 'pasteKey':
                        if (!that.copyKeyInfo) {
                            return;
                        }
                        let frame = that.currentFrame;
                        if (params.x || params.frame) {
                            frame = params.frame || that.pixelToFrame(params.x);
                        } else {
                            // const t = that.t;
                            // // 在关键帧位置选择了粘贴
                            // const result = await Editor.Dialog.show({
                            //     type: 'info',
                            //     title: t('is_paste_overwrite'),
                            //     message: t('is_paste_overwrite_message'),
                            //     buttons: [t('cancel'), t('overwrite')],
                            //     default: 0,
                            //     cancel: 0,
                            // });
                            // if (result === 0) {
                            //     break;
                            // }
                        }
                        const path2Param = sortSelectParams(that.copyKeyInfo.params);
                        for (const path of Object.keys(path2Param)) {
                            for (const name of Object.keys(path2Param[path])) {
                                const param = path2Param[path][name];
                                Editor.Ipc.sendToPanel('scene', 'copy-clip-key', currentClip, ...param, frame);
                            }
                        }
                        that.selectKeyInfo = null;
                        break;
                    case 'createKey':
                        params.param[3] = that.pixelToFrame(params.x);
                        if (params.param[5]) {
                            params.param[3] += params.param[5];
                        }
                        Editor.Ipc.sendToPanel('scene', 'create-clip-key', currentClip, ...params.param);
                        break;
                    case 'removeKey':
                        if (!that.selectKeyInfo) {
                            break;
                        }
                        const removePaths = sortSelectParams(that.selectKeyInfo.params);
                        for (const path of Object.keys(removePaths)) {
                            for (const name of Object.keys(removePaths[path])) {
                                const param = removePaths[path][name];
                                Editor.Ipc.sendToPanel('scene', 'remove-clip-key', currentClip, ...param);
                            }
                        }
                        that.selectKeyInfo = null;
                        break;
                    case 'moveKeys':
                        if (!that.selectKeyInfo) {
                            break;
                        }
                        // if (that.selectKeyInfo.offsetFrame === 0) {
                        //     break;
                        // }
                        // let keyOffset = Math.round(that.grid.pixelToValueH(Math.abs(that.selectKeyInfo.offset)));
                        // if (that.selectKeyInfo.offset < 0) {
                        //     keyOffset = - keyOffset;
                        // }
                        const {offsetFrame} = that.selectKeyInfo;
                        if (offsetFrame === 0) {
                            break;
                        }
                        const movePaths = sortSelectParams(that.selectKeyInfo.params);
                        for (const path of Object.keys(movePaths)) {
                            for (const name of Object.keys(movePaths[path])) {
                                const param = movePaths[path][name];
                                Editor.Ipc.sendToPanel('scene', 'move-clip-keys', currentClip, ...param, offsetFrame);
                            }
                        }
                        that.selectKeyInfo = null;
                        break;
                    case 'openBezierEditor':
                        that.currentBezierData = params[0];
                        that.showBezierEditor = true;
                        break;
                    case 'closeBezierEditor':
                        that.showBezierEditor = false;
                        break;
                    case 'updateSelect':
                        if (!that.selectKeyInfo) {
                            if (!params[0]) {
                                break;
                            }
                            that.selectKeyInfo = {};
                        }
                        if (!that.selectKeyInfo.sortDump) {
                            if (!params[0]) {
                                break;
                            }
                            that.selectKeyInfo.sortDump = {};
                        }
                        that.selectKeyInfo.sortDump[params[1]] = [params[0], params[2]];
                        let data1: any = [];
                        let data2: any = [];
                        Object.keys(that.selectKeyInfo.sortDump).map((name: any) => {
                            const item = that.selectKeyInfo.sortDump[name];
                            data1 = data1.concat(item[0]);
                            data2 = data2.concat(item[1]);
                        });
                        that.selectKeyInfo.data = data1;
                        that.selectKeyInfo.params = data2;
                        break;
                }
            },

            async onEvents(operate: string, params: any) {
                const that: any = this;
                let frame = that.currentFrame;
                if (params && params[0]) {
                    frame = params[0];
                }
                switch (operate) {
                    case 'addEvent':
                        Editor.Ipc.sendToPanel('scene', 'add-clip-event', that.currentClip, frame, '', []);
                        break;
                    case 'openEventEditor':
                        that.selectEventFrame = params[0];
                        that.showEventEditor = true;
                        break;
                    case 'deleteEvent':
                        if (!that.selectEventInfo) {
                            break;
                        }
                        for (const item of that.selectEventInfo.frames) {
                            Editor.Ipc.sendToPanel('scene', 'delete-clip-event', that.currentClip, item);
                        }
                        that.selectEventInfo = null;
                        break;
                    case 'copyEvent':
                        if (!that.selectEventInfo) {
                            break;
                        }
                        that.copyEventInfo = that.selectEventInfo;
                        break;
                    case 'pasteEvent':
                        // const t = that.t;
                        // 在关键帧位置选择了粘贴
                        // if (params.frame) {
                        //     const result = await Editor.Dialog.show({
                        //         type: 'info',
                        //         title: t('is_paste_overwrite'),
                        //         message: t('is_paste_overwrite_message'),
                        //         buttons: [t('cancel'), t('overwrite')],
                        //         default: 0,
                        //         cancel: 0,
                        //     });
                        //     if (result === 0) {
                        //         break;
                        //     }
                        // }
                        if (!that.copyEventInfo) {
                            break;
                        }
                        Editor.Ipc.sendToPanel('scene', 'copy-clip-event', that.currentClip, that.copyEventInfo.frames, frame);
                        that.selectEventInfo = null;
                        break;
                }
            },

            async onNodes(operate: string, params: any) {
                const that: any = this;
                switch (operate) {
                    case 'clearNode':
                    const shouldClear = await that.checkClearData();
                    if (!shouldClear) {
                            break;
                    }
                    Editor.Ipc.sendToPanel('scene', 'clear-node-clip', that.currentClip, params[0]);
                    break;
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
            'bezier-editor': require('./components/bezier-editor'),
        },
        async mounted() {
            const that: any = this;
            document.addEventListener('mouseup', that.onMouseUp);
            document.addEventListener('keyup', that.onKeyUp);
            const isReady = await Editor.Ipc.requestToPanel('scene', 'query-is-ready');
            if (isReady) {
                await that.refresh();
            }
        },
    });
}

export async function beforeClose() {
    if (vm.animationMode) {
        // 关闭前发送消息给场景，退出动画模式
        return await vm.exit();
    }
}
export async function close() {}
