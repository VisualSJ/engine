import { join } from 'path';

class Point {
    public x: number;
    public y: number;
    public type?: string;
    public canvas?: Point;
    constructor(point: any) {
        this.x = Number(point.x);
        this.y = Number(point.y);
        point.type && (this.type = point.type);
    }
}

/**
 * 绘制线条
 * @param beginPoint 起始点
 * @param endPoint 终点
 * @param ctx 绘图上下文
 */
function drawLine(beginPoint: Point, endPoint: Point, ctx: any) {
    ctx.beginPath();
    ctx.moveTo(beginPoint.x, beginPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.closePath();
    ctx.stroke();
}

/**
 * 计算绘制曲线的三次函数各个系数
 * @param point1 第一个点的 x 和 y 坐标
 * @param k1 第一个点的切线斜率
 * @param point2 第二个点的 x 和 y 坐标
 * @param k2 第二个点的切线斜率
 * @returns 曲线对应三次函数的格式系数
 */
function calcHermite(point1: any, k1: number,  point2: any, k2: number) {
    const x1 = point1.x;
    const y1 = point1.y;
    const x2 = point2.x;
    const y2 = point2.y;
    let i: number;
    let j: number;
    let m: number;
    let n: number;
    let r: any;
    let o: any;
    let s: number;
    let f: any;

    // 构造矩阵
    const e = [
        1, x1, x1 * x1, x1 * x1 * x1, 1, x2, x2 * x2, x2 * x2 * x2,
        0, 1, 2 * x1, 3 * x1 * x1, 0, 1, 2 * x2, 3 * x2 * x2,
    ];
    f = (e: any) => {
        // 三阶行列式计算
        return e[0] * e[4] * e[8] + e[1] * e[5] * e[6] + e[2] * e[3] * e[7] -
            e[2] * e[4] * e[6] - e[1] * e[3] * e[8] - e[0] * e[5] * e[7];
    };
    // 计算矩阵的四阶行列式
    for (i = s = 0; i < 4; s += f(o) * e[i] * (i % 2 ? -1 : 1), i++) {
        if (e[i]) {
            for (j = 4, o = []; j < e.length; j++) {
                if (j % 4 !== i) {
                    o.push(e[j]);
                }
            }
        }
    }
    // 计算大矩阵部分，并除以上面的四阶行列式结果
    for (r = [], i = 0; i < 4; i++) {
        for (j = 0; j < 4; r[i + j * 4] = ((i + j) % 2 ? -1 : 1) * f(o) / s, j++) {
            for (o = [], m = 0; m < 3; m++) {
                for (n = 0; n < 3; n++) {
                    o.push(e[((i + m + 1) % 4) * 4 + (j + n + 1) % 4]);
                }
            }
        }
    }

    // 计算三次函数的系数（矩阵乘向量）
    const d = y1 * r[0] + y2 * r[1] + k1 * r[2] + k2 * r[3];
    const c = y1 * r[4] + y2 * r[5] + k1 * r[6] + k2 * r[7];
    const b = y1 * r[8] + y2 * r[9] + k1 * r[10] + k2 * r[11];
    const a = y1 * r[12] + y2 * r[13] + k1 * r[14] + k2 * r[15];
    // 返回一个三次函数
    return {a, b, c, d};
}

/**
 * 绘制曲线的简易函数
 * @param keyframes 关键帧数据
 * @param ctx 绘图上下文
 */
function drawHermite(keyframes: any, ctx: any) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    // 注意不能更改到原数据
    const data = keyframes.map((item: any) => {
        const point = {x: item.time * w, y: item.value * h};
        // canvas 宽高比例与原始的不同，需要对斜率进行转换
        const outTangent = item.outTangent * h / w;
        const inTangent = item.inTangent * h / w;
        return {
            point,
            outTangent,
            inTangent,
        };
    });
    // 遍历坐标点，绘制曲线
    for (let i = 0; i < data.length - 1; i++) {
        const next = data[i + 1];
        const now = data[i];
        const args = calcHermite(now.point, now.outTangent, next.point, next.inTangent);
        const f = calcFunc(args);
        ctx.beginPath();
        for (let j = now.point.x; j <= next.point.x; j++) {
            ctx.lineTo(j, h - f(j));
        }
        ctx.stroke();
    }
}

/**
 * 根据系数返回三次曲线函数
 * @param args
 */
function calcFunc(args: any) {
    const {a, b, c, d} = args;
    return (x: number) => {
        return a * x * x * x + b * x * x + c * x + d;
    };
}

export = {
    Point,
    drawLine,
    calcHermite,
    drawHermite,
    calcFunc,
};
