
const HALF_TEXT_WIDTH = 5; // 设置半个刻度文字像素宽度
const POINT_LENGTH = 2; // 设置内部数据使用的小数点位数
const {Point} = require('./utils');
interface Point {
    x: number;
    y: number;
    type?: string;
    canvas?: Point;
}

/**
 * 网格线绘制类
 */
export default class Grid {

    set cxt2D(context: any) {
        this.canvas = context.canvas;
        this._cxt2D = context;
    }

    get cxt2D() {
        return this._cxt2D;
    }

    set multiplier(value: number) {
        if (value === 0) {
            return;
        }
        this._multiplier = value;
        this.rePaint();
    }

    get multiplier() {
        return this._multiplier;
    }

    set negative(value: boolean) {
        if (value === this._negative) {
            return;
        }
        this._negative = value;
        this.rePaint();
    }

    get negative() {
        return this._negative;
    }

    get step() {
        const spaceX = this.location.w / this.axis.piece;
        const spaceY = this.location.h / this.axis.piece;
        const {rangeX, rangeY} = this.axis;
        // 计算当前刻度的间隔步长
        const stepX = Number((rangeX / this.axis.piece).toFixed(POINT_LENGTH));
        let stepY = Number((rangeY / this.axis.piece).toFixed(POINT_LENGTH));

        // 计算原始刻度的间隔步长
        const orgStepX = Number((1 / this.axis.piece).toFixed(POINT_LENGTH));

        let orgStepY = Number((1 / this.axis.piece).toFixed(POINT_LENGTH));
        if (this.negative) {
            stepY = stepY * 2;
            orgStepY = orgStepY * 2;
        }
        return {spaceX, spaceY, stepX, stepY, orgStepX, orgStepY};
    }

    // 原点坐标信息以及绘图范围
    get location() {
        const x = this.axesMargin;
        const y = this.axesMargin;
        const w = this.canvas.width - this.axesMargin * 2; // 最大的画线宽度
        const h = this.canvas.height - this.axesMargin * 2; // 最大的画线高度
        return {x, y, w, h};
    }

    private axis: any;  // 存储传入的坐标信息 切割值，横纵坐标的数据范围
    private axesMargin: number; // 画布边距（无效绘图区域
    private _cxt2D: any; // 绘图上下文
    private canvas: any;
    private _multiplier: any; // 递增倍数
    private _negative: boolean = false; // 是否带有负坐标系

    constructor(options: any) {
        this.cxt2D = options.context;
        this.axesMargin = options.axisMargin;
        this.axis = options.axis;
        this._multiplier = options.multiplier || 1;
        this.cxt2D.lineWidth = options.lineWidth;
        this.cxt2D.strokeStyle = options.color || '#333';
    }

    /**
     * 开始绘制
     */
    public draw() {
        // 计算画面可视范围
        const {spaceX, spaceY} = this.step;
        // 绘制小网格
        this.drawGrid(spaceX / 4, spaceY / 2, 'rgba(51, 51, 51, 0.44)', 0.5);
        // 绘制大网格
        if (this.negative) {
            this.drawGrid(spaceX, spaceY * 1, '#3a3939', 1);
        } else {
            this.drawGrid(spaceX, spaceY * 2, '#3a3939', 1);
        }

        const {x, w, h} = this.location;
        this.cxt2D.strokeStyle = '#333';
        this.cxt2D.lineWidth = 1.5;
        if (this.negative) {
            // 包含负轴需要多绘制一条坐标轴
            this.cxt2D.beginPath();
            this.cxt2D.moveTo(x, h / 2 + x + 0.5);
            this.cxt2D.lineTo(w + x, h / 2 + x + 0.5);
            this.cxt2D.stroke();
        }
        // 绘制坐标轴(要放置在网格绘制之后)
        this.drawAxis();
    }

    /**
     * 重绘
     */
    public rePaint() {
        this.clear();
        this.draw();
    }

    /**
     * 新坐标值转为原始坐标值
     * @param point
     */
    public axisToOri(point: Point) {
        const {w, h} = this.location;
        const resultX = Number((point.x / w).toFixed(POINT_LENGTH));
        let resultY;
        if (this.negative) {
            resultY = Number((point.y / h * 2).toFixed(POINT_LENGTH));
        } else {
            resultY = Number((point.y / h).toFixed(POINT_LENGTH));
        }
        return {time: resultX, value: resultY};
    }

    /**
     * 将初始坐标点转化为新坐标轴下的坐标位置
     * @param point
     */
    public tranToAxis(point: any) {
        const {w, h} = this.location;
        let resultY;
        if (this.negative) {
            resultY = point.value * h / 2;
        } else {
            resultY = point.value * h;
        }
        const resultX = point.time * w;
        return new Point({x: resultX, y: resultY});
    }

    /**
     * 原始坐标，转换为 canvas 坐标系下坐标
     * @param point
     */
    public tranToCanvas(point: any) {
        const axisPoint = this.tranToAxis(point);
        return this.axisToCanvas(axisPoint);
    }

    /**
     * canvas 坐标系转为当前坐标系的点
     * @param point
     */
    public canvasToAxis(point: Point) {
        const {x, y, h} = this.location;
        const resultX = point.x - x;
        let resultY = h - point.y + y;
        if (this.negative) {
            resultY = h / 2 - point.y + y;
        }
        return new Point({x: resultX, y: resultY});
    }

    /**
     * 坐标系下的点转为 canvas 坐标系
     * @param point
     */
    public axisToCanvas(point: Point) {
        const {x, y, h} = this.location;
        if (this.negative) {
            return new Point({
                x: point.x + x,
                y: h / 2 - point.y + y,
            });
        }
        return new Point({
            x: point.x + x,
            y: h - point.y + y,
        });
    }

    // 清空画布
    private clear() {
        const {x, y, w, h} = this.location;
        this.cxt2D.clearRect(x, y, w, h);
    }

    /**
     * 绘制坐标轴
     */
    private drawAxis() {
        this.cxt2D.lineWidth = 2;
        const {x, y, w, h} = this.location;
        const {stepX, stepY, spaceX, spaceY} = this.step;
        this.cxt2D.clearRect(0, 0, this.axesMargin, h + this.axesMargin);
        this.cxt2D.clearRect(0, h + this.axesMargin, w + this.axesMargin, this.axesMargin);

        // 绘制范围矩形框
        this.cxt2D.strokeRect(x , y, w, h);

        this.cxt2D.fillStyle = '#ccc';
        // 绘制横坐标刻度
        let cellX = x - HALF_TEXT_WIDTH;
        let textX = 0;
        while (cellX < x + w) {
            this.cxt2D.fillText(textX, cellX, y + h + x / 2);
            textX = Number((textX + stepX).toFixed(2));
            cellX += spaceX;
        }
        // 绘制纵坐标刻度
        let cellY = y + h;
        let textY = this.negative ? -1 * this.multiplier : 0;
        while (cellY > x) {
            this.cxt2D.fillText(textY, x / 2 - HALF_TEXT_WIDTH, cellY);
            textY = Number((textY + stepY * this.multiplier).toFixed(2));
            cellY -= spaceY;
        }
    }

    /**
     * 绘制网格
     * @param spaceX x 轴间隔距离
     * @param spaceY y 轴间隔距离
     * @param color 网格颜色
     * @param lineWidth 网格线宽
     */
    private drawGrid(spaceX: number, spaceY: number, color: any, lineWidth?: number) {
        lineWidth && (this.cxt2D.lineWidth = lineWidth);
        color && (this.cxt2D.strokeStyle = color);
        const {x, y, w, h} = this.location;
        // 绘制 y 轴网格
        for (let i = x; i < w + x; i += spaceX) {
          this.cxt2D.beginPath();
          this.cxt2D.moveTo(i + 0.5, y);
          this.cxt2D.lineTo(i + 0.5, h + y);
          this.cxt2D.stroke();
        }

        // 绘制 x 轴网格
        for (let i = h + x; i > x; i -= spaceY) {
          this.cxt2D.beginPath();
          this.cxt2D.moveTo(x, i + 0.5);
          this.cxt2D.lineTo(w + x, i + 0.5);
          this.cxt2D.stroke();
        }
    }
}
