const {clamp} = Editor.Utils.mathUtils;
const {drawLine, calcHermite, calcFunc, Point} = require('./utils');

export default class Hermite {
    /**
     * 获取当前最新的原始关键帧数据
     */
    get keyFrames() {
        const result = this._keyframes.map((item: any) => {
            const keys = this.grid.axisToOri(item.point);
            const {w, h} = this.grid.location;
            return {
                ...keys,
                inTangent: item.inTangent * w / h,
                outTangent: item.outTangent * w / h,
            };
        });
        return result;
    }

    /**
     * 获取当前最新关键帧以及控制点信息
     */
    get ctrlKey() {
        const result = this._keyframes.map((item: any, i: number) => {
            item.index = i;
            const ctrl = this.calcCtrl(i);
            if (i !== 0) {
                item.inPoint = ctrl.inPoint;
            }
            if (i !== this._keyframes.length - 1) {
                item.outPoint = ctrl.outPoint;
            }
            const canvasPoint = this.grid.axisToCanvas(item.point);
            item.point.canvas = canvasPoint;
            return item;
        });
        return result;
    }
    private cxt2D: any; // 绘图上下文
    private canvas: any;
    private grid: any;
    private ctrlConfig: any;
    private curveConfig: any;
    private _keyframes: any;
    private hermiteArgs: any;

    constructor(options: any) {
        this.grid = options.grid;
        this.ctrlConfig = options.ctrlConfig;
        this.curveConfig = options.curveConfig;
        this.cxt2D = options.context;
        this.cxt2D.strokeStyle = options.curveConfig.strokeStyle;
        this.canvas = options.context.canvas;
    }

    /**
     * 初次绘制
     * @param keyFrames 原始关键帧数据
     */
    public draw(keyFrames: any) {
        const ctx = this.cxt2D;
        const {w, h} = this.grid.location;
        // 需要对数据做一次深拷贝，避免改动到源数据
        try {
            this._keyframes = JSON.parse(JSON.stringify(keyFrames));
        } catch (error) {
            console.error(error);
            return;
        }

        // 原始数据需要做一次坐标转换
        for (const item of this._keyframes) {
            const point = this.grid.tranToAxis(item);
            // 宽高比例与原始的不同，需要对斜率进行转换
            item.outTangent *= h / w;
            item.inTangent *= h / w;
            item.point = point;
        }
        // 对保存的函数系数重置
        this.hermiteArgs = [];
        // 遍历坐标点，绘制曲线
        for (let i = 0; i < this._keyframes.length - 1; i++) {
            const next = this._keyframes[i + 1];
            const item = this._keyframes[i];
            this.hermiteArgs[i] = calcHermite(item.point, item.outTangent, next.point, next.inTangent);
            const f = calcFunc(this.hermiteArgs[i]);
            ctx.beginPath();
            for (let j = item.point.x; j <= next.point.x; j++) {
                const point = this.grid.axisToCanvas({x: j, y: f(j)});
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }
        this.drawEdge();
    }

    /**
     * 更新某个点的斜率
     * @param index 曲线索引
     * @param tan 斜率
     * @param type 标识左右斜率
     * @returns 返回添加点的索引
     */
    public updateTan(index: number, tan: number, type: string) {
        // 当当前更新点未起始点与终止点，只能更改一个绘制参数
        if ((index === 0 && type === 'inTangent') || (index === this._keyframes.length - 1 && type === 'outTangent')) {
            return;
        }
        // 更改对应关键帧数据
        this._keyframes[index][type] = tan;
        // 更改对应曲线的函数参数(绘制算法)
        const now = this._keyframes[index];

        if (type === 'outTangent') {
            const next = this._keyframes[index + 1];
            this.hermiteArgs[index] = calcHermite(now.point, now.outTangent, next.point, next.inTangent);
        } else if (type === 'inTangent') {
            const last = this._keyframes[index - 1];
            this.hermiteArgs[index - 1] = calcHermite(last.point, last.outTangent, now.point, now.inTangent);
        }
    }

    /**
     * 添加关键帧
     * @param x 添加的 x 坐标
     */
    public addKeyFrame(x: number) {
        // 涉及到函数类计算都需要用正常坐标系下的点
        x = x - this.grid.location.x;
        let index = null;
        // 计算当前添加关键帧前一个点的索引
        for (let i = 0; i < this._keyframes.length - 1; i++) {
            const point = this._keyframes[i].point;
            const nextPoint = this._keyframes[i + 1].point;
            if (x > point.x && nextPoint.x > x) {
                index = i;
                break;
            }
        }
        if (index === null) {
            return null;
        }

        // 计算点的斜率
        const tan = this.calcTange(x, index);
        const f = calcFunc(this.hermiteArgs[index]);
        const y = f(x);
        this.hermiteArgs.splice(index + 1, 0, this.hermiteArgs[index]);
        // 更新数据
        this._keyframes.splice(index + 1, 0, {
            point: new Point({x, y}),
            outTangent: tan,
            inTangent: tan,
        });
        return index + 1;
    }

    /**
     * 删除关键帧
     * @param point 添加的点坐标
     */
    public delKeyFrame(index: number) {
        const next = this._keyframes[index + 1];
        const last = this._keyframes[index - 1];
        next && this.hermiteArgs.splice(index, 1);
        last && this.hermiteArgs.splice(index - 1, 1);
        // 两个点都存在，即删除的是中间的关键帧，需要更新绘制算法
        if (next && last) {
            const args = calcHermite(last.point, last.outTangent, next.point, next.inTangent);
            this.hermiteArgs.splice(index - 1, 0, args);
        }
        // 更新数据
        this._keyframes.splice(index, 1);
    }

    /**
     * 根据缓存数据重绘
     * @param ctx
     */
    public update(ctx = this.cxt2D) {
        const keyFrames = this._keyframes;
        // 遍历坐标点，绘制曲线
        for (let i = 1; i < keyFrames.length; i++) {
            const next = keyFrames[i];
            const item = keyFrames[i - 1];
            const f = calcFunc(this.hermiteArgs[i - 1]);
            ctx.beginPath();
            for (let j = item.point.x; j <= next.point.x; j++) {
                const point = this.grid.axisToCanvas({x: j, y: f(j)});
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }
        if (ctx === this.cxt2D) {
            this.drawEdge();
        }
    }

    /**
     * 曲线往 Y 轴正方向，平移 len 个单位
     * @param len
     * @returns l返回是否移动标识符
     */
    public moveY(len: number) {
        const {h} = this.grid.location;
        const temp = JSON.parse(JSON.stringify(this._keyframes));
        for (let i = 0; i < this._keyframes.length; i++) {
            const now = this._keyframes[i];
            const {point} = now;
            if (point.y > h || point.y < 0) {
                this._keyframes = temp;
                return false;
            }
            point.y += len;
            point.y = clamp(point.y, 0, h);
            point.canvas = this.grid.axisToCanvas(point);
            // 更新绘图参数
            if (i < this._keyframes.length - 1) {
                const next = this._keyframes[i + 1];
                // this.hermiteArgs[i].d += len;
                this.hermiteArgs[i] = calcHermite(now.point, now.outTangent, next.point, next.inTangent);
            }
        }
        return true;
    }

    /**
     * 移动关键帧位置
     * @param x
     * @param mY
     * @param index 关键帧索引
     */
    public moveKey(x: number, y: number, index: number) {
        const now = this._keyframes[index];
        const next = this._keyframes[index + 1];
        const last = this._keyframes[index - 1];
        const {point} = now;
        const {w, h} = this.grid.location;
        if ((point.x > w || point.x < 0) && (point.y > h || point.y < 0)) {
            return;
        }
        const result = this.grid.canvasToAxis({x, y});
        point.x = result.x;
        point.x = clamp(point.x, 0, w);
        point.y = result.y;
        point.y = clamp(point.y, 0, h);
        next && (this.hermiteArgs[index] = calcHermite(now.point, now.outTangent, next.point, next.inTangent));
        last &&
        (this.hermiteArgs[index - 1] = calcHermite(last.point, last.outTangent, now.point, now.inTangent));
    }

    /**
     * 清空画布
     */
    public clear() {
        this.cxt2D.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 计算关键帧对应的控制点
     * @param index
     * @param type
     */
    private calcCtrl(index: number, type?: string) {
        const point = this._keyframes[index].point;
        let outPoint = null;
        let inPoint = null;

        if (type !== 'outTangent') {
            const k1 = this._keyframes[index].inTangent;
            inPoint = this.calcCtrlPoint(point, k1, 'inTangent');
            inPoint.canvas = this.grid.axisToCanvas(inPoint);
        }

        if (type !== 'inTangent') {
            const k2 = this._keyframes[index].outTangent;
            outPoint = this.calcCtrlPoint(point, k2, 'outTangent');
            outPoint.canvas = this.grid.axisToCanvas(outPoint);
        }

        return {
            outPoint,
            inPoint,
        };
    }

    /**
     * 计算点的斜率
     * @param point
     * @param index 所处在的曲线函数索引
     */
    private calcTange(x: number, index: number) {
        // 根据曲线公式对曲线进行求导
        const {a, b, c} = this.hermiteArgs[index];
        const tan = 3 * a * x * x + 2 * b * x + c;
        return tan;
    }

    /**
     * 绘制边缘线
     */
    private drawEdge() {
        const {w, x} = this.grid.location;
        const begin = this.ctrlKey[0].point.canvas;
        const end = this.ctrlKey[this._keyframes.length - 1].point.canvas;
        this.cxt2D.save();
        this.cxt2D.strokeStyle = 'rgba(255, 0, 0, 0.11)';
        drawLine({x: 0, y: begin.y}, begin, this.cxt2D);
        drawLine({x: 2 * x + w, y: end.y}, end, this.cxt2D);
        this.cxt2D.restore();
    }

    /**
     * 计算控制点坐标（返回的是当前坐标系上的点位置）
     */
    private calcCtrlPoint(point: any, k: number, type: string): any {
        const {handlerSize} = this.ctrlConfig;
        let x = Math.sqrt((handlerSize * handlerSize) / (1 + k * k));
        if (type === 'inTangent') {
            x = point.x - x;
        } else {
            x = point.x + x;
        }
        const y = point.y - k * (point.x - x);
        return {x, y, type};
    }
}
