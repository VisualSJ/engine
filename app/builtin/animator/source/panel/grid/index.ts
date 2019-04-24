
const HALF_TEXT_WIDTH = 5; // 设置半个刻度文字像素宽度
const POINT_LENGTH = 2; // 设置内部数据使用的小数点位数

const LinearTicks = require('./../../../static/script/linear-ticks.js');
const { clamp } = Editor.Utils.Math;

/**
 * 网格线绘制类
 */
module.exports = class Grid {

    set cxt2D(context: any) {
        this.canvas = context.canvas;
        this._cxt2D = context;
    }

    get cxt2D() {
        return this._cxt2D;
    }

    public location: any; // 原点坐标信息以及绘图范围
    public step: any; // 存储横纵坐标参数递增值

    public xAxisScale: number = 1.0;
    public xAxisOffset: number = 0.0;
    public xAnchor: number = 0.5;

    public yAxisScale: number = 1.0;
    public yAxisOffset: number = 0.0;
    public yAnchor: number = 0.5;

    private axis: any;  // 存储传入的坐标信息 切割值，横纵坐标的数据范围
    private sample: number; // 帧率
    private _cxt2D: any; // 绘图上下文
    private canvas: any;
    private hticks: any;
    private startOffset: number;
    private xMinRange?: number;
    private xMaxRange?: number;

    constructor(options: any) {
        this.cxt2D = options.context;
        this.axis = options.axis;
        this.cxt2D.lineWidth = options.lineWidth || 1;
        this.cxt2D.strokeStyle = options.color || '#333';
        this.hticks = new LinearTicks();
        const {lods, minScale, maxScale, sample, startOffset} =  this.axis;
        this.xAxisOffset = startOffset || 0;
        this.startOffset = startOffset || 0;
        this.sample = sample;
        this.hticks.initTicks(lods, minScale, maxScale, sample)
            .spacing(10, 80);
        this.xAxisScale = clamp(
            this.xAxisScale,
            this.hticks.minValueScale,
            this.hticks.maxValueScale
        );
    }

    /**
     * 将关键帧数转换为对应的时间（用于显示文字）
     * @param frame
     */
    public hformat(frame: number) {
        let decimals = Math.floor(Math.log10(this.sample)) + 1;
        let text = '';

        if (frame < 0) {
          text = '-';
          frame = -frame;
        }

        let temp = (frame % this.sample).toString();
        decimals -= temp.length;
        if (decimals > 0) {
            temp = new Array(decimals + 1).join('0') + temp;
        }
        return text + Math.floor(frame / this.sample) + ':' + temp;
    }

    /**
     * 在 x 坐标为 pixelX 时的缩放
     * @param pixelX 当前需要缩放的鼠标位置
     * @param scale 需要缩放的倍数
     * @returns scale
     */
    public xAxisScaleAt(pixelX: number, scale: number) {
        const oldValueX = this.pixelToValueH(pixelX);
        this.xAxisScale = clamp(scale, this.hticks.minValueScale, this.hticks.maxValueScale);
        const newScreenX = this.valueToPixelH(oldValueX);
        this.transferX(pixelX - newScreenX);
        return this.xAxisScale;
    }

    /**
     * 整个坐标系平移，通过改变 this.xAxisOffset 偏移数，更改数值转换像素的结果值
     * @param deltaPixelX 平移像素数,正负号代表方向
     */
    public transferX(deltaPixelX: number) {
        // 限制时间轴不能往负数拉
        if (this.xAxisOffset === this.startOffset && deltaPixelX > 0) {
            return;
        }

        let newOffset = this.xAxisOffset + deltaPixelX;
        if (newOffset > this.startOffset) {
            newOffset = this.startOffset;
        }
        // this.xAxisOffset = this.startOffset; // calc range without offset
        let min;
        let max;
        if (this.xMinRange !== undefined && this.xMinRange !== null) {
            min = this.valueToPixelH(this.xMinRange);
        }
        if (this.xMaxRange !== undefined && this.xMaxRange !== null) {
            max = this.valueToPixelH(this.xMaxRange);
            max = Math.max(0, max - this.canvas.width);
        }

        this.xAxisOffset = newOffset;

        if (min !== undefined && max !== undefined) {
            this.xAxisOffset = clamp(this.xAxisOffset, -max, -min);
            return;
        }

        if (min !== undefined) {
            this.xAxisOffset = Math.min(this.xAxisOffset, -min);
            return;
        }

        if (max !== undefined) {
            this.xAxisOffset = Math.max(this.xAxisOffset, -max);
            return;
        }
    }

    public resize(w: number, h: number) {
        if (!w || !h) {
            const rect = this.canvas.element.getBoundingClientRect();
            w = w || rect.width;
            h = h || rect.height;

            w = Math.round(w);
            h = Math.round(h);
        }
        // adjust xAxisOffset by anchor x
        if (this.canvas.width !== 0) {
            this.transferX((w - this.canvas.width) * this.xAnchor);
        }
        this.canvas.width = w;
        this.canvas.height = h;
        this.render();
    }

    /**
     * 初次绘制
     */
    public render() {
        this.clear();
        this.updateGrids();
        this.updateLables();
    }

    public pixelToValueH(x: number) {
        return (x - this.xAxisOffset) / this.xAxisScale;
    }

    public valueToPixelH(x: number) {
        return x * this.xAxisScale + this.xAxisOffset;
    }

    // 清空画布
    private clear() {
        this.cxt2D.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 绘制网格
     */
    private updateGrids() {
        let ticks;
        let ratio;
        let screen_x;

        const left = this.pixelToValueH(0);
        const right = this.pixelToValueH(this.canvas.width);
        this.hticks.range(left, right, this.canvas.width);
        for (let i = this.hticks.minTickLevel; i <= this.hticks.maxTickLevel; ++i) {
            ratio = this.hticks.tickRatios[i];
            if (ratio > 0) {
                this.cxt2D.strokeStyle  = `rgba(23, 23, 23, ${ratio * 0.5})`;
                ticks = this.hticks.ticksAtLevel(i, true);
                for (const j of ticks) {
                    this.cxt2D.beginPath();
                    screen_x = this.valueToPixelH(j);
                    // 加上 0.5 可以让线条显示的更细
                    this.cxt2D.moveTo(Math.floor(screen_x) + 0.5, -1.0);
                    this.cxt2D.lineTo(Math.floor(screen_x) + 0.5, this.canvas.height);
                    this.cxt2D.stroke();
                }
            }
        }
    }

    /**
     * 绘制坐标文字
     */
    private updateLables() {
        const minStep = 50;
        const labelLevel = this.hticks.levelForStep(minStep);
        const ticks = this.hticks.ticksAtLevel(labelLevel, false);

        this.cxt2D.clearRect(0, 0, this.canvas.width, 20);
        this.cxt2D.save();
        this.cxt2D.strokeStyle = '#ccc';
        this.cxt2D.font = '16px';
        ticks.forEach((num: number) => {
                const x = Math.floor(this.valueToPixelH(num)) + 5;
                const text = this.hformat(num);
                this.cxt2D.strokeText(text, Math.floor(x - this.startOffset), 13);
            });
        this.cxt2D.restore();
    }
};
