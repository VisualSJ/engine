
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
    public readonly location: any; // 原点坐标信息以及绘图范围
    public readonly step: any; // 存储横纵坐标参数递增值
    public readonly space: number; // 存储数据递增对应的实际 canvas 像素值

    private axis: any;  // 存储传入的坐标信息 切割值，横纵坐标的数据范围
    private axesMargin: number; // 画布边距（无效绘图区域
    private _cxt2D: any; // 绘图上下文
    private canvas: any;

    constructor(options: any) {
        this.cxt2D = options.context;
        this.axesMargin = options.axisMargin;
        this.space = options.space;
        this.axis = options.axis;
        this.cxt2D.lineWidth = options.lineWidth;
        this.cxt2D.strokeStyle = options.color || '#333';

        // 计算需要绘制的网格范围
        this.location = this.computView();

        // 计算刻度范围
        this.step = this.computeStep();
    }

    /**
     * 开始绘制
     */
    public draw() {
        // 计算画面可视范围
        const {spaceX, spaceY} = this.step;
        // 绘制小网格
        this.drawGrid(spaceX / 4, spaceY / 2, 'rgba(51, 51, 51, 0.44)');
        // 绘制大网格
        this.drawGrid(spaceX, spaceY * 2, '#333');

        // 绘制坐标轴(要放置在网格绘制之后)
        this.drawAxis();
    }

    /**
     * 新坐标值转为原始坐标值
     * @param point
     */
    public axisToOri(point: Point) {
        const {w, h} = this.location;
        const resultX = Number((point.x / w).toFixed(POINT_LENGTH));
        const resultY = Number((point.y / h).toFixed(POINT_LENGTH));
        return {time: resultX, value: resultY};
    }

    /**
     * 将初始坐标点转化为新坐标轴下的坐标位置
     * @param point
     */
    public tranToAxis(point: any) {
        const {w, h} = this.location;
        const resultX = point.time * w;
        const resultY = point.value * h;
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
        const resultY = h - point.y + y;
        return new Point({x: resultX, y: resultY});
    }

    /**
     * 坐标系下的点转为 canvas 坐标系
     * @param point
     */
    public axisToCanvas(point: Point) {
        const {x, y, h} = this.location;
        return new Point({
            x: point.x + x,
            y: h - point.y + y,
        });
    }

    /**
     * 绘制坐标轴
     */
    private drawAxis() {
        this.cxt2D.save();
        this.cxt2D.lineWidth = 2;
        const {x, y, w, h} = this.location;
        const {stepX, stepY, spaceX, spaceY} = this.step;
        // 绘制范围矩形框
        this.cxt2D.strokeRect(x , y, w, h);
        this.cxt2D.restore();

        this.cxt2D.save();
        this.cxt2D.fillStyle = '#ccc';
        // 绘制横坐标刻度
        let cellX = x - HALF_TEXT_WIDTH;
        let textX = 0;
        while (cellX < x + w) {
            this.cxt2D.fillText(textX, cellX, y + h + x / 2);
            textX = Editor.Utils.Math.add(textX, stepX);
            cellX += spaceX;
        }
        // 绘制纵坐标刻度
        let cellY = y + h;
        let textY = 0;
        while (cellY > x) {
            this.cxt2D.fillText(textY, x / 2 - HALF_TEXT_WIDTH, cellY);
            textY = Editor.Utils.Math.add(textY, stepY);
            cellY -= spaceY;
        }
        this.cxt2D.restore();
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
          this.cxt2D.lineTo(i + 0.5, h + x);
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

    /**
     * 计算坐标起始点与画线宽高
     */
    private computView() {
        const x = this.axesMargin;
        const y = this.axesMargin;
        const w = this.canvas.width - this.axesMargin * 2; // 最大的画线宽度
        const h = this.canvas.height - this.axesMargin * 2; // 最大的画线高度
        return {x, y, w, h};
    }

    /**
     * 计算步长
     */
    private computeStep() {
        const spaceX = this.location.w / this.axis.piece;
        const spaceY = this.location.h / this.axis.piece;
        const {rangeX, rangeY} = this.axis;
        // 计算当前刻度的间隔步长
        const stepX = Number((rangeX / this.axis.piece).toFixed(POINT_LENGTH));
        const stepY = Number((rangeY / this.axis.piece).toFixed(POINT_LENGTH));

        // 计算原始刻度的间隔步长
        const orgStepX = Number((1 / this.axis.piece).toFixed(POINT_LENGTH));
        const orgStepY = Number((1 / this.axis.piece).toFixed(POINT_LENGTH));
        return {spaceX, spaceY, stepX, stepY, orgStepX, orgStepY};
    }
}
