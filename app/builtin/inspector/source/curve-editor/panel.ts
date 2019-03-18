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
        file: 'packages://inspector/static/style/imports/iconfont.woff',
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
        vm.rePaint();
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
            },
            multiplier: 1,
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
            toolCanvas: [], // 缓存绘制在底部菜单项的预制 canvas
        },

        computed: {
            toolCanvasSize() {
                // @ts-ignore
                const result: any = {w: this.mainCtx.canvas.width / 10, h: this.mainCtx.canvas.height / 5};
                return result;
            },
        },

        async mounted() {
            this.init();
        },

        methods: {
            T(key: string) {
                return Editor.I18n.t(key);
            },

            // 重新绘制
            rePaint() {
                this.initCanvas();
                // @ts-ignore
                this.curveControl!.rePaint();
                // @ts-ignore
                this.drawThumb(this.$refs.tools, this.defaultKeyFrames);
            },

            init() {
                this.initCanvas();
                this.drawGrid();
                this.drawCurve();
                // @ts-ignore
                this.drawThumb(this.$refs.tools, this.defaultKeyFrames);
            },

            onMulti(this: any, event: any) {
                if (event.target.value !== 0) {
                    this.grid.multiplier = event.target.value;
                    this.dump.multiplier = event.target.value;
                    Editor.Ipc.sendToPanel('inspector', 'curve:change', this.dump);
                }
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
                this.drawThumb(this.$refs.presets, this.defaultKeyFrames);
            },

            /**
             * 检查与初始化数据
             * @param dump
             */
            checkAndUpdate(this: any, dump: any) {
                if (!dump) {
                    return;
                }
                if (!Array.isArray(dump.value.keyFrames) || dump.value.keyFrames.length < 1) {
                    !dump && (dump = {});
                    dump.keyFrames = DEFAULT_KEYFRAMES[0];
                }
                this.dump = dump.value;
                this.dump.key = dump.key;
                this.curveControl.update(this.dump.keyFrames);
                if (typeof(dump.multiplier) !== 'number') {
                    this.dump.multiplier = 1;
                    return;
                } else {
                    this.dump.multiplier = dump.multiplier;
                }
                this.grid.multiplier = this.dump.multiplier;
            },

            /**
             * 绘制缩略图
             * @param father 父节点
             * @param keyFrames 关键帧数据
             * @param size canvas 尺寸
             */
            drawThumb(father: any, keyFrames: any) {
                keyFrames.map((item: any, index: number) => {
                    let $canvas;
                    // @ts-ignore
                    if (this.toolCanvas.length !== keyFrames.length) {
                        $canvas = document.createElement('canvas');
                        $canvas.setAttribute('index', String(index));
                        father.append($canvas);
                        // @ts-ignore
                        this.toolCanvas.push($canvas);
                    } else {
                        // @ts-ignore
                        $canvas = this.toolCanvas[index];
                    }

                    // @ts-ignore
                    this.resizeCanvas([$canvas], this.toolCanvasSize);
                    const ctx: any = $canvas.getContext('2d');
                    ctx.strokeStyle = 'white';
                    // @ts-ignore
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
                // 更新画布的宽高
                this.resizeCanvas([this.gridCtx.canvas, this.mainCtx.canvas, this.ctrlCxt.canvas],
                    {w: panel.clientWidth, h: panel.clientHeight * 0.8});
            },

            // 重新调节 canvas 的宽高
            resizeCanvas(canvasArr: any[], size: any) {
                for (const $canvas of canvasArr) {
                    $canvas.width = size.w ;
                    $canvas.height = size.h ;
                }
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
                    this.dump.keyFrames = data.keyFrames;
                    this.dump.multiplier = data.multiplier;
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
                    multiplier: this.multiplier,
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
