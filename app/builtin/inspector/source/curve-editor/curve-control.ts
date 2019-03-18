import { EventEmitter } from 'events';
import Hermite from './hermite';
const PIXEL_RANGE = 20; // 控制线上像素点击获取的范围（点击线的灵敏度）
// 与 PIXEL_RANGE 对应，代表区域内像素颜色数据 PIXEL_RANGE 为 2 时，该值为 2 的平方个颜色数据（rgba）
const UINT8_COLOR_DEFALT = Array(4 * PIXEL_RANGE * PIXEL_RANGE).fill(0).toString();
const DEFAULT_CTROL_COLOR = 'rgba(255, 0, 0, 0.1)'; // 默认的控制画布上的曲线颜色（需要设置尽量透明，但又不能影响后续点的判断）

const CLICK_RANGE = 5; // 点击范围/关键帧位置的点击灵敏度
const {Point} = require('./utils');
interface Point {
    x: number;
    y: number;
    type?: string;
    canvas?: Point;
}
/**
 * 贝塞尔曲线绘制控制
 */
export default class CurveControl extends EventEmitter {
    private cxt2D: any; // 绘图上下文
    private canvas: any;
    private ctrlPoints: any; // 当前手柄的控制点
    private grid: any; // 存储网格处理对象
    private hermite: any; // 存储网格处理对象
    private ctrlConfig: any; // 存储控制点配置
    private changeType: string = ''; // 标识改动对象
    private isShowCtrl: boolean = false; // 是否显示手柄
    private isShowPoint: boolean = false; // 是否显示点坐标
    private isShowAuxi: boolean = false; // 是否显示辅助线
    private isBindHandle: boolean = false; // 是否绑定事件

    // 存储事件需要使用的 flags
    private flags: any = {
        flag: false,
        tanDrag: false,
        curveDrag: false,
        keyDrag: false,
    };

    // 关键帧控制点相关信息
    get ctrlKey() {
        return this.hermite.ctrlKey;
    }

    constructor(options: any) {
        super();
        this.grid = options.grid;
        this.ctrlConfig = options.ctrlConfig;
        this.cxt2D = options.context;
        this.canvas = options.context.canvas;

        this.hermite = new Hermite({
            context: options.mainCtx,
            ctrlConfig: options.ctrlConfig,
            grid: options.grid,
            curveConfig: options.curveConfig,
        });

    }

    /**
     * 重绘
     */
    public rePaint() {
        this.clear();
        this.grid.rePaint();
        this.hermite.rePaint();
    }

    /**
     * 更新关键帧数据
     * @param keyFrames
     */
    public update(keyFrames: any) {
        this.clear();
        this.hermite.clear();
        this.draw(keyFrames);
    }

    /**
     * 初次绘制
     */
    public draw(keyFrames: any) {
        this.cxt2D.strokeStyle = DEFAULT_CTROL_COLOR;
        this.hermite.draw(keyFrames);
        this.hermite.update(this.cxt2D);
        this.initContrl();
    }

    /************************ 控制点相关 ******************************/
    /**
     * 初始化渲染控制点
     */
    private initContrl() {
        const {radius, fillColor, strokeStyle} = this.ctrlConfig;
        this.cxt2D.fillStyle = fillColor;
        this.cxt2D.strokeStyle = strokeStyle;
        for (const info of this.ctrlKey) {
            const point = this.grid.axisToCanvas(info.point);
            this.cxt2D.beginPath();
            this.cxt2D.arc(point.x, point.y, radius, 0, 2 * Math.PI);
            this.cxt2D.closePath();
            this.cxt2D.stroke();
            this.cxt2D.fill();
        }
        !this.isBindHandle && this.bindHandler();
    }

    /**
     * 恢复辅助线效果
     */
    private resetCtrl(flag?: string) {
        if (!this.isShowCtrl && !this.isShowAuxi) {
            return;
        }
        this.isShowAuxi = false;
        this.isShowCtrl = false;
        this.cxt2D.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.cxt2D.strokeStyle = DEFAULT_CTROL_COLOR;
        // this.cxt2D.
        this.hermite.update(this.cxt2D);
        this.initContrl();
        flag && (this.ctrlPoints = null);
    }

    /**
     * canvas 事件处理（编辑操作）
     */
    private bindHandler() {
        this.isBindHandle = true;
        this.canvas.addEventListener('mousedown', (event: any) => this.onMouseDown(event));
        this.canvas.addEventListener('mousemove', (event: any) => this.onMouseMove(event));

        document.addEventListener('mouseup', (event: any) => this.onMouseUp(event));
    }

    private onMouseDown(event: any) {
        this.flags.flag = false;
        const {radius} = this.ctrlConfig;
        const {offsetX, offsetY} = event;
        // 判断是否在线上(取像素颜色判断)
        const myImageData = this.cxt2D.getImageData(offsetX - PIXEL_RANGE / 2, offsetY - PIXEL_RANGE / 2,
             PIXEL_RANGE, PIXEL_RANGE);

        // 先判断是否在关键帧控制点处（圆点需要加上原点半径）
        for (const info of this.ctrlKey) {
            const {x, y} = info.point.canvas;

            // 点击的点，在控制范围内
            if (Math.abs(offsetX - x) < (CLICK_RANGE * 2 + radius) &&
             Math.abs(offsetY - y) < (CLICK_RANGE * 2 + radius)) {
                if (event.button === 2) {
                    const that = this;
                    Editor.Menu.popup({
                        x: event.pageX,
                        y: event.pageY,
                        menu: [
                            {
                                label: 'Delete Key',
                                click() {
                                    that.delKeyFrame(info.index);
                                },
                            },
                        ],
                    });
                    return;
                }
                this.flags.flag = true;
                this.flags.keyDrag = true;
                this.canvas.style.cursor = 'move';
                this.showCtrl(info);
                this.showPoint(this.hermite.keyFrames[info.index], info.point.canvas);
                return;
            }
        }

        // 判断是否在控制手柄上
        if (this.isShowCtrl && this.ctrlPoints) {
            for (const key of Object.keys(this.ctrlPoints)) {
                const info = this.ctrlPoints[key];
                if (!info.canvas || key === 'point') {
                    continue;
                }
                const {x, y} = info.canvas;
                // 点击的点，在控制范围内（圆点需要加上原点半径）
                if (Math.abs(offsetX - x) < (CLICK_RANGE + radius)
                && Math.abs(offsetY - y) < (CLICK_RANGE + radius)) {
                    this.flags.tanDrag = true;
                    this.flags.flag = true;
                    // 存储当前拖动手柄的左右方向
                    this.ctrlPoints.type = key;
                    return;
                }
            }
        }

        // 判断是否在线上
        if (myImageData.data.toString() !== UINT8_COLOR_DEFALT) {
            this.flags.flag = true;
            if (event.button === 2) {
                const that = this;
                Editor.Menu.popup({
                    x: event.pageX,
                    y: event.pageY,
                    menu: [
                        {
                            label: 'Add Key',
                            click() {
                                that.addKeyFrame(offsetX);
                            },
                        },
                    ],
                });
            } else {
                this.lightCurve();
                this.canvas.style.cursor = 'ns-resize';
                !(this.flags.tanDrag || this.flags.keyDrag) && (this.flags.curveDrag = true);
            }
        }

        if (this.flags.flag) {
            return;
        }
        // 不属于以上任何情况，恢复原来的辅助线效果
        this.resetCtrl('hideCtrl');
    }

    private onMouseMove(event: any) {
        const {curveDrag, tanDrag, keyDrag} = this.flags;
        if (!tanDrag && !curveDrag && !keyDrag) {
            return;
        }
        // 有一些由于点击造成的轻微移动
        process.nextTick(() => {
            const {offsetX, offsetY, movementY} = event;
            if (tanDrag) {
                this.changeType = 'tangent';
                this.updateTan(offsetX, offsetY);
                this.emitChange();
                return;
            }
            if (keyDrag) {
                this.moveKey(offsetX, offsetY);
                this.emitChange();
                return;
            }
            if (curveDrag && movementY !== 0) {
                const flag = this.hermite.moveY(- movementY);
                if (!flag) {
                    return;
                }
                this.changeType = 'curve';
                this.emitChange();
                this.hermite.clear();
                this.hermite.update();
                this.resetCtrl();
                this.lightCurve();
            }
        });
    }

    private onMouseUp(event: any) {
        this.flags.tanDrag = false;
        this.flags.curveDrag = false;
        this.flags.keyDrag = false;
        this.isShowPoint = false;
        this.canvas.style.cursor = 'default';
        if (this.changeType) {
            this.emitChange();
            this.emitConfirm();
            this.changeType = '';
        }
    }

    /**
     * 移动关键帧
     * @param x
     * @param y
     */
    private moveKey(x: number, y: number) {
        this.changeType = 'keyframe';
        const {index} = this.ctrlPoints;
        // 因为 canvas 坐标系的不同，这里需要对移动的 y 值取负值
        this.hermite.moveKey(x, y, index);
        this.refreshRender();
    }

    /**
     * 删除关键帧
     * @param index 关键帧索引
     */
    private delKeyFrame(index: number) {
        this.hermite.delKeyFrame(index);
        this.ctrlPoints = null;
        this.refreshRender();
        this.clear();
        this.initContrl();
    }

    /**
     * 添加关键帧（由于要兼顾点击范围，获取到的鼠标点并不一定精准在曲线上，只能传递 x 值，去计算 y )
     * @param x 坐标
     */
    private addKeyFrame(x: number) {
        const index = this.hermite.addKeyFrame(x);
        if (index === null) {
            console.warn('添加点无效', x);
            return;
        }
        this.emitChange();
        this.emitConfirm();
        const info = this.ctrlKey[index];
        this.initContrl();
        this.drawCtrl(info);
    }

    /**
     * 更新关键帧的斜率
     * @param offsetX 当前鼠标 x 坐标
     * @param offsetY
     */
    private updateTan(offsetX: number, offsetY: number) {
        const {index, type} = this.ctrlPoints;
        const {point, isBroken} = this.ctrlKey[index];

        // 因 canvas 中原点位置与正常坐标系不同，calcCtrlPoint 中计算需要的斜率是正常坐标系下的，此处需要取负值
        const k = - (offsetY - point.canvas.y) / (offsetX - point.canvas.x);

        // 左右控制点已断开
        if (isBroken) {
            this.hermite.updateTan(index, k, type);
        } else {
            this.hermite.updateTan(index, k, 'inTangent');
            this.hermite.updateTan(index, k, 'outTangent');
        }
        this.refreshRender();
        this.drawCtrl(this.ctrlKey[index]);
    }

    /**
     * 刷新绘制
     */
    private refreshRender() {
        this.hermite.clear();
        this.hermite.update();
        this.resetCtrl();
        this.lightCurve();
        if (this.ctrlPoints) {
            const {index} = this.ctrlPoints;
            this.ctrlPoints = this.ctrlKey[index];
            this.drawCtrl(this.ctrlPoints);
            this.isShowPoint && this.showPoint(this.hermite.keyFrames[index], this.ctrlPoints.point.canvas);
        }
    }

    private clear() {
        const {x, y, w, h} = this.grid.location;
        this.cxt2D.clearRect(0, 0, w + x * 2, h + y * 2);
    }

    /**
     * 高亮显示曲线辅助线
     */
    private lightCurve() {
        const {focousColor} = this.ctrlConfig;
        this.cxt2D.strokeStyle = focousColor;
        this.hermite.update(this.cxt2D);
        this.isShowAuxi = true;
    }

    /**
     * 显示控制手柄
     * @param info 控制点信息
     */
    private showCtrl(info: any) {
        // 当前画布上已经显示了需要显示的控制点
        if (this.ctrlPoints && this.ctrlPoints.index === info.index) {
            return;
        }
        // 有其他控制手柄辅助线，需要清空画布
        if (this.ctrlPoints) {
            this.resetCtrl();
            this.lightCurve();
        }
        this.drawCtrl(info);
    }

    /**
     * 显示或隐藏点信息
     * @param info 点信息
     */
    private showPoint(info: any, position: Point) {
        if (!info) {
            return;
        }
        this.isShowPoint = true;
        const {x, y} = position;
        this.cxt2D.save();

        // TODO 点显示的规范化处理
        this.cxt2D.fillStyle  = 'black';
        this.cxt2D.fillRect(x - 30, y - 28, 50, 18);

        this.cxt2D.fillStyle  = 'white';
        this.cxt2D.fillText(`${info.time},${info.value}`, x - 25, y - 15);
        this.cxt2D.restore();
    }

    /**
     * 绘制控制手柄
     * @param info 手柄信息
     * @param ctx 画布
     */
    private drawCtrl(info: any, ctx: any = this.cxt2D) {
        this.isShowCtrl = true;
        this.ctrlPoints = info;
        const {point, inPoint, outPoint} = info;
        const {radius, fillColor} = this.ctrlConfig;
        ctx.save();
        ctx.fillColor = fillColor;
        ctx.strokeStyle = 'white';
        if (inPoint) {
            inPoint.type = 'outTangent';
            this.drawLine(point.canvas, inPoint.canvas);
            this.drawArc(inPoint.canvas, radius);
            this.ctrlPoints.inPoint = inPoint;
        }
        if (outPoint) {
            outPoint.type = 'inTangent';
            this.drawLine(point.canvas, outPoint.canvas);
            this.drawArc(outPoint.canvas, radius);
            this.ctrlPoints.outPoint = outPoint;
        }
        ctx.restore();
    }

    /**
     * 绘制线条
     * @param beginPoint
     * @param endPoint
     * @param ctx
     */
    private drawLine(beginPoint: Point, endPoint: Point, ctx: any = this.cxt2D) {
        ctx.beginPath();
        ctx.moveTo(beginPoint.x, beginPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.closePath();
        ctx.stroke();
    }

    /**
     * 绘制圆点
     * @param point
     * @param radius
     * @param ctx
     */
    private drawArc(point: Point, radius: number, ctx: any = this.cxt2D) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    }

    private emitConfirm() {
        this.emit('confirm', {
            keyFrames: Array.from(this.hermite.keyFrames),
            multiplier: this.grid.multiplier,
        });
    }

    private emitChange() {
        this.emit('change', {
            keyFrames: Array.from(this.hermite.keyFrames),
            multiplier: this.grid.multiplier,
        });
    }
}
