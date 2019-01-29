'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
import CurveControl from './curve-control';
import Grid from './grid';
const Vue = require('vue/dist/vue.js');
const {drawHermite, DEFAULT_KEYFRAMES} = require('./utils');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;
const AXIS_MARGIN = 30; // 坐标轴距离画布的距离

export const style = readFileSync(join(__dirname, '../index.css'));

export const template = readFileSync(
    join(__dirname, '../../static', '/template/curve-editor.html')
);

/**
 * 配置 inspector 的 iconfont 图标
 */
export const fonts = [
    {
        name: 'inspector',
        file: 'packages://inspector/static/iconfont.woff',
    },
];

export const $ = { content: '.curve-editor' };

export const messages = {
    'current-keys'(dump: any) {
        vm.checkAndUpdate(dump);
    },
};

export const listeners = {
    resize() {
        // TODO
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    // 初始化 vue
    vm = new Vue({
        el: panel.$.content,

        data: {
            scale: 1,
            showPresets: false,
            currentPoint: null,
            mainCtx: null, // 画笔
            gridCtx: null, // 画笔
            ctrlCxt: null, // 画笔
            dump: {
                keyFrames: DEFAULT_KEYFRAMES[0],
                multiplier: 1,
            },
            // 坐标设置相关信息
            axis: {
                piece: 10, // 横纵坐标的刻度切分数
                rangeX: 1, // x 轴数据范围（最大值）
                rangeY: 1, // y 轴数据范围（最大值）
            },
            ctrlConfig: { // 控制点的相关配置
                fillColor: 'red', // 控制点圆心填充颜色
                strokeStyle: 'white', // 控制柄的颜色
                radius: 2, // 控制点圆心半径
                lineWidth: 1, // 手柄线宽
                handlerSize : 40, // 控制柄的像素长度
                focousColor: 'rgba(245, 240, 32, 0.44)', // 曲线选中高亮颜色
            },

            curveConfig: {
                strokeStyle: 'red',
                lineWidth: 0.1, // 线宽
            },
            // 工具栏显示的默认参数（固定）
            defaultKeyFrames: DEFAULT_KEYFRAMES,
        },

        async mounted() {
            this.initCanvas();
            this.drawGrid();
            this.drawCurve();
            this.initTools();
        },

        methods: {
            T(key: string) {
                return Editor.I18n.t(key);
            },

            /**
             * 初始化工具栏
             */
            initTools(this: any) {
                // 小缩略图的尺寸
                const size = {w: 30, h: 15};
                this.drawThumb(this.$refs.tools, this.defaultKeyFrames, size);
            },

            /**
             * 响应 tools 点击事件
             * @param event
             */
            onTools(this: any, event: any) {
                const index = event.target.getAttribute('index');
                if (!index) {
                    return;
                }
                this.dump.keyFrames = this.defaultKeyFrames[index];
                this.curveControl.update(this.dump.keyFrames);
                Editor.Ipc.sendToPanel('inspector', 'curve:change', this.dump);
            },

            /**
             * 显示预设
             */
            onShowPresets(this: any, event: any) {
                this.showPresets = true;
                // TODO
                const {offsetX, offsetY} = event.target;
                // 小缩略图的尺寸
                const size = {w: 60, h: 20};
                this.drawThumb(this.$refs.presets, this.defaultKeyFrames, size);
            },

            /**
             * 检查与初始化数据
             * @param dump
             */
            checkAndUpdate(this: any, dump: any) {
                if (!Array.isArray(dump.keyFrames) || dump.keyFrames.length < 1) {
                    !dump && (dump = {});
                    // @ts-ignore
                    dump.keyFrames = DEFAULT_KEYFRAMES[0];
                }
                this.dump = dump;
                // @ts-ignore
                this.curveControl.update(this.dump.keyFrames);
                if (typeof(dump.multiplier) !== 'number') {
                    // @ts-ignore
                    this.dump.multiplier = 0;
                    return;
                }
                // TODO 更新 multiplier
            },

            /**
             * 绘制缩略图
             * @param father 父节点
             * @param keyFrames 关键帧数据
             * @param size canvas 尺寸
             */
            drawThumb(father: Document, keyFrames: any, size: any) {
                keyFrames.map((item: any, index: number) => {
                    const $canvas = document.createElement('canvas');
                    $canvas.width = size.w;
                    $canvas.height = size.h;
                    $canvas.setAttribute('index', String(index));
                    father.append($canvas);
                    const ctx: any = $canvas.getContext('2d');
                    ctx.strokeStyle = 'white';
                    drawHermite(item, ctx);
                });
            },

            /**
             * 初始化画布设置
             */
            initCanvas(this: any) {
                // 绘制网格背景的 canvas 对象
                this.gridCtx = this.$refs.gridCanvas.getContext('2d');
                // 获取绘图点信息
                this.mainCtx = this.$refs.mainCanvas.getContext('2d');
                this.ctrlCxt = this.$refs.controlCanvas.getContext('2d');
                this.gridCtx.strokeStyle = '#333';
                // 更新画布的宽高
                this.gridCtx.canvas.style.background = '#1f1e1ede';
                this.gridCtx.canvas.width = this.gridCtx.canvas.offsetWidth;
                this.gridCtx.canvas.height = this.gridCtx.canvas.offsetHeight;
                this.mainCtx.canvas.width = this.mainCtx.canvas.offsetWidth;
                this.mainCtx.canvas.height = this.mainCtx.canvas.offsetHeight;
                this.ctrlCxt.canvas.width = this.ctrlCxt.canvas.offsetWidth;
                this.ctrlCxt.canvas.height = this.ctrlCxt.canvas.offsetHeight;
            },

            /**
             * 绘制曲线
             */
            drawCurve(this: any) {
                this.curveControl = new CurveControl({
                    context: this.ctrlCxt,
                    mainCtx: this.mainCtx,
                    grid: this.grid,
                    ctrlConfig: this.ctrlConfig,
                    curveConfig: this.curveConfig,
                });
                this.curveControl.draw(this.dump.keyFrames);
                this.curveControl.on('change', (data: any) => {
                    this.dump = data;
                    Editor.Ipc.sendToPanel('inspector', 'curve:change', this.dump);
                });
            },

            /**
             * 绘制网格画布
             */
            drawGrid(this: any) {
                const options = {
                    context: this.gridCtx,
                    axisMargin: AXIS_MARGIN,
                    lineWidth: 1,
                    axis: this.axis,
                };
                this.grid = new Grid(options);
                this.grid.draw();
            },

            // 滚动滚轮，更改缩放参数
            onMouseWheel(this: any, event: any) {
                event.stopPropagation();
                const { wheelDelta } = event;
                const scale =
                    (this.scale / 100) *
                    Math.pow(2, 0.002 * wheelDelta);

                this.scale = Math.ceil(scale * 100);
                // console.log(this.scale);
            },
        },
    });
    Editor.Ipc.sendToPanel(
        'inspector',
        'curve:state',
        true
    );
}

export async function beforeClose() { }

export async function close() {
    Editor.Ipc.sendToPanel('inspector', 'curve:state', false);
}
