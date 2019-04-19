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
const {smoothScale, formatNodeDump, timeToFrame, frameToTime, formatClipDump} = require('./../../static/script/utils.js');
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
    async save() {
        if (!vm) {
            return;
        }
        vm.saveData();
    },

    async exit() {
        if (!vm) {
            return;
        }
        vm.exit();
    },

    deleteTheSelectedKeys() {
        if (!vm) {
            return;
        }
    },

    /**
     * 跳转前一帧
     */
    jumpPrevFrame() {
        if (!vm) {
            return;
        }
        vm.updateFrame('jump_prev_frame');
    },

    /**
     * 跳转下一帧
     */
    jumpNextFrame() {
        if (!vm) {
            return;
        }
        vm.updateFrame('jump_next_frame');
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
        // const mode = await Editor.Ipc.requestToPackage('scene', 'query-scene-mode');
        // mode === 'animation' ? vm.animationMode = true : vm.animationMode = false;
    },

    // 关闭动画编辑模式消息
    async 'scene:animation-end'() {
        if (!vm || !vm.animationMode) {
            return;
        }
        vm.animationMode = false;
        vm.animationMode = false;
        const mode = await Editor.Ipc.requestToPackage('scene', 'query-scene-mode');
        mode === 'animation' ? vm.animationMode = true : vm.animationMode = false;
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
            currentBezierData: {},
            clipsMenu: [],
            selectKeyInfo: null, // 当前选中的关键帧
            selectEventInfo: null, // 当前选中的事件信息
            compIndex: 0, // 存储当前动画组件在根节点组件的 index 值，方便做数据修改
            hasAnimationComp: false,
            hasAniamtionClip: false,
            animationMode: false, // 当前动画的编辑模式
            animationState: 'stop', // 当前动画的播放模式
            aniPlayTask: '',
            selectEventFrame: 0,
            showEventEditor: false, // 是否显示事件函数编辑器
            showBezierEditor: false, // 是否显示贝塞尔曲线编辑器
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

        },
        watch: {
            currentClip() {
                // @ts-ignore
                Editor.Ipc.sendToPanel('scene', 'change-edit-clip', this.currentClip);
            },
        },
        methods: {
            t(key: string, type = '') {
                return Editor.I18n.t(`animator.${type}${key}`);
            },
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
            },

            async refresh() {
                const that: any = this;
                // 初始化
                const uuid = Editor.Selection.getLastSelected('node');
                if (uuid) {
                    await that.update(uuid);
                }
                // 预览初始化时获取不到文档流宽高，对 canvas 的初始化造成影响
                requestAnimationFrame(async () => {
                    that.init();
                    that.setCurrentFrame(that.currentFrame); // 主动触发更新
                    that.loading = false;
                });
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

                        const time = await Editor.Ipc.requestToPanel('scene', 'query-animation-clips-time');
                        if (typeof(time) === 'number') {
                            that.setCurrentFrame(timeToFrame(time, that.sample));
                        }
                        const mode = await Editor.Ipc.requestToPackage('scene', 'query-scene-mode');
                        mode === 'animation' ? that.animationMode = true : that.animationMode = false;
                        const state = await Editor.Ipc.requestToPanel('scene', 'query-animation-state', that.currentClip);
                        that.updateState(state);
                    } else {
                        that.hasAnimationComp = false;
                        that.hasAniamtionClip = false;
                    }
                } else {
                    that.hasAnimationComp = false;
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
                    const start = Math.round(that.grid.pixelToValueH(that.offset));
                    const end = Math.round(that.grid.pixelToValueH(that.offset + rang));
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
                    result = result.concat(that.calcFrames(data[name].dump));
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

            ///////////////////////// 对时间轴的处理方法 ///////////////////////////////////////
            /**
             * 对整个时间轴进行移动
             * @param delta (移动距离)
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
             * @param delta 缩放时鼠标滚动距离，用具计算缩放倍数
             * @param x 缩放中心点
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
                if (name !== 'event') {
                    that.selectEventInfo = null;
                }
                if (name !== 'key') {
                    that.selectKeyInfo = null;
                }
                // 点击顶部移动当前关键帧
                if (name === 'time-pointer') {
                    that.currentFrame = that.pixelToFrame(event.x);
                    const time = frameToTime(that.currentFrame, that.sample);
                    Editor.Ipc.sendToPanel('scene', 'set-edit-time', time);
                } else if (name === 'pointer') {
                    that.flags.mouseDownName = 'pointer';
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

            onMouseUp(event: any) {
                const that: any = this;
                if (!that.flags.mouseDownName) {
                    return;
                }
                switch (that.flags.mouseDownName) {
                    case 'key':
                        if (!that.selectKeyInfo) {
                            break;
                        }
                        const offsetKey = Math.round(that.grid.pixelToValueH(that.selectKeyInfo.offset));
                        if (offsetKey === 0) {
                            break;
                        }
                        that.dirty = true;
                        Editor.Ipc.sendToPanel('scene', 'move-clip-keys', that.currentClip, ...that.selectKeyInfo.params, offsetKey);
                        break;
                    case 'event':
                        if (!that.selectEventInfo) {
                            break;
                        }
                        const offsetEvent = Math.round(that.grid.pixelToValueH(that.selectEventInfo.offset));
                        if (offsetEvent === 0) {
                            // that.selectEventInfo = null;
                            break;
                        }
                        Editor.Ipc.sendToPanel('scene', 'move-clip-events', that.currentClip, that.selectEventInfo.frames, offsetEvent);
                        that.dirty = true;
                        break;
                }
                that.selectEventInfo = null;
                that.selectKeyInfo = null;
                that.flags.mouseDownName = '';
                that.flags.mouseDownX = 0;
            },

            onMouseMove(event: any) {
                const that: any = this;
                if (!that.flags.mouseDownName) {
                    return;
                }

                const {x} = event;
                switch (that.flags.mouseDownName) {
                    case 'key':
                        if (that.selectKeyInfo) {
                            const {startX, data} = that.selectKeyInfo;
                            requestAnimationFrame(() => {
                                const offset = event.x - startX;
                                that.selectKeyInfo.startX = event.x;
                                that.selectKeyInfo.offset += offset;
                                data.x += offset;
                            });
                        }
                        break;
                    case 'event':
                        if (that.selectEventInfo) {
                            const {startX, data} = that.selectEventInfo;
                            requestAnimationFrame(() => {
                                const offset = event.x - startX;
                                that.selectEventInfo.startX = event.x;
                                that.selectEventInfo.offset += offset;
                                data.x += offset;
                            });
                        }
                        break;
                    case 'grid':
                        const moveX = x - that.flags.mouseDownX;
                        if (moveX === 0) {
                            return;
                        }
                        that.flags.mouseDownX = x;
                        that.moveTimeLine(moveX);
                        break;
                    case 'pointer':
                        const pixel = x - that.$refs.left.offsetWidth + that.offset;
                        const frame = Math.round(that.grid.pixelToValueH(pixel));
                        that.currentFrame = frame;
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

            async onConfirm(event: any) {
                const name = event.target.getAttribute('name');
                const value = event.target.value;
                const that: any = this;
                switch (name) {
                    case 'speed':
                        Editor.Ipc.sendToPanel('scene', 'change-clip-speed', that.currentClip, value);
                        that.dirty = true;
                        break;
                    case 'sample':
                        Editor.Ipc.sendToPanel('scene', 'change-clip-sample', that.currentClip,  value);
                        that.dirty = true;
                        break;
                    case 'wrapMode':
                        Editor.Ipc.sendToPanel('scene', 'change-clip-wrap-mode', that.currentClip,  value);
                        that.dirty = true;
                        break;
                    case 'exit':
                        that.exit();
                        break;
                }
            },

            async exit() {
                const that: any = this;
                if (that.dirty) {
                    const t = that.t;
                    const result = await Editor.Dialog.show({
                        type: 'info',
                        title: t('is_save'),
                        message: t('is_save_message'),
                        buttons: [t('cancel'), t('save'), t('abort')],
                        default: 0,
                        cancel: 0,
                    });
                    if (result === 0) {
                        return;
                    }
                    if (result === 1) {
                        const saveSuccess = await that.saveData();
                        if (saveSuccess) {
                            Editor.Ipc.sendToPanel('scene', 'record', that.root, false);
                        }
                        return;
                    }
                }
                // @ts-ignore
                Editor.Ipc.sendToPanel('scene', 'record', this.root, false);
            },

            /**
             * 保存场景数据
             */
            async save() {
                const isSave = await Editor.Ipc.requestToPanel('scene', 'save-clip');
                if (isSave) {
                    vm.dirty = false;
                }
            },

            //////////////// 组件事件监听 /////////////////////////////////////////////////
            // 更新当前的拖拽物信息
            updateDragInfo(type: string, params: any[]) {
                const that: any = this;
                switch (type) {
                    case 'moveKey':
                        that.selectKeyInfo = params[0];
                        that.flags.mouseDownName = 'key';
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
                    case 'add-event':
                        Editor.Ipc.sendToPanel('scene', 'add-clip-event', that.currentClip, that.currentFrame, '', []);
                        that.dirty = true;
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
                        break;
                    case 'update-frame':
                        that.updateFrame(params[0]);
                        break;
                }
            },

            runPointer() {
                const that: any = this;
                that.aniPlayTask = requestAnimationFrame(async () => {
                    const time = await Editor.Ipc.requestToPanel('scene', 'query-animation-clips-time');
                    if (time !== false) {
                        that.setCurrentFrame(timeToFrame(time, that.sample));
                    }
                    if (that.animationState !== 'stop' || that.animationState !== 'puase') {
                        that.runPointer();
                    }
                });
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
                }
                that.dirty = true;
            },

            // 预览关键帧列表部分
            onPreviewRow(operate: string, params: any) {
                const that: any = this;
                const {currentClip} = that;
                switch (operate) {
                    case 'createKey':
                        params[3] = that.pixelToFrame(params[3]);
                        Editor.Ipc.requestToPanel('scene', 'create-clip-key', currentClip, ...params);
                        that.dirty = true;
                        break;
                    case 'removeKey':
                        Editor.Ipc.requestToPanel('scene', 'remove-clip-key', currentClip, ...params);
                        that.dirty = true;
                        break;
                    case 'moveKeys':
                        const offset = Math.round(that.grid.pixelToValueH(params[params.length - 1]));
                        if (offset === 0) {
                            return;
                        }
                        that.dirty = true;
                        params[params.length - 1] = offset;
                        Editor.Ipc.requestToPanel('scene', 'move-clip-keys', currentClip, ...params);
                        break;
                    case 'openBezierEditor':
                        that.currentBezierData = params[0];
                        that.showBezierEditor = true;
                        break;
                    case 'closeBezierEditor':
                        that.showBezierEditor = false;
                        break;
                }
            },

            onEvents(operate: string, params: any[]) {
                const that: any = this;
                if (operate === 'openEventEditor') {
                    that.selectEventFrame = params[0];
                    that.showEventEditor = true;
                } else if (operate === 'deleteEvent') {
                    Editor.Ipc.sendToPanel('scene', 'delete-clip-event', that.currentClip, params[0]);
                    that.dirty = true;
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
            const isReady = await Editor.Ipc.requestToPanel('scene', 'query-is-ready');
            if (isReady) {
                await that.refresh();
            }
        },
    });
}

export async function beforeClose() {}
export async function close() {}
