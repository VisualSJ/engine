import { start } from 'repl';

const {join} = require('path');
const {readFileSync} = require('fs-extra');
const {smoothScale} = require('./../../../static/script/utils.js');
export const template = readFileSync(join(__dirname, './../../../static/template/components/bezier-editor.html'), 'utf-8');

export const props = [
    'keyframe',
    'uuid',
];

// 一些非贝塞尔曲线数据的名字
const STATIC_DATA = ['constant'];

export function data() {
return {
    // 预制的曲线数据
    // 引擎的命名规则 https://github.com/cocos-creator/engine/blob/master/cocos2d/animation/easing.js
    presets: {
        Linear: {
            Default: {
                name: 'linear',
                data: [0.3, 0.3, 0.7, 0.7],
            },
        },
        // 使用 canvas 绘制的相关静态图像
        Static: {
            Constant: {
                name: STATIC_DATA[0],
            },
        },
        'Ease In': {
            Cubic: {
                name: 'cubicIn',
                data: [0.4, 0, 0.5, 0.5],
            },
            Quad: {
                name: 'quadIn',
                data: [0.55, 0.08, 0.68, 0.53],
            },
            Quart: {
                name: 'quartIn',
                data: [0.89, 0.03, 0.68, 0.21],
            },
            Quint: {
                name: 'quintIn',
                data: [0.75, 0.05, 0.85, 0.06],
            },
            Sine: {
                name: 'sineIn',
                data: [0.48, 0, 0.73, 0.71],
            },
            Expo: {
                name: 'expoIn',
                data: [0.95, 0.04, 0.79, 0.03],
            },
            Circ: {
                name: 'circIn',
                data: [0.6, 0.04, 0.98, 0.33],
            },
            // Elastic: {
            //     name: 'elasticIn',
            //     data: [],
            // },
        },
        'Ease Out': {
            Cubic: {
                name: 'cubicOut',
                data: [0.06, 0.12, 0.58, 1],
            },
            Quad: {
                name: 'quadOut',
                data: [0.25, 0.46, 0.45, 0.95],
            },
            Quart: {
                name: 'quartOut',
                data: [0.16, 0.84, 0.43, 1],
            },
            Quint: {
                name: 'quintOut',
                data: [0.22, 1, 0.31, 1],
            },
            Sine: {
                name: 'sineOut',
                data: [0.39, 0.59, 0.56, 1],
            },
            Expo: {
                name: 'expoOut',
                data: [0.18, 1, 0.22, 1],
            },
            Circ: {
                name: 'circOut',
                data: [0.08, 0.82, 0.01, 1],
            },
        },
        'Ease In Out': {
            Cubic: {
                name: 'cubicInOut',
                data: [0.42, 0, 0.58, 1],
            },
            Quad: {
                name: 'quadInOut',
                data: [0.48, 0.04, 0.52, 0.96],
            },
            Quart: {
                name: 'quartInOut',
                data: [0.83, 0, 0.17, 1],
            },
            Quint: {
                name: 'quintInOut',
                data: [0.94, 0, 0.06, 1],
            },
            Sine: {
                name: 'sineInOut',
                data: [0.46, 0.05, 0.54, 0.95],
            },
            Expo: {
                name: 'expoInOut',
                data: [1, 0, 0, 1],
            },
            Circ: {
                name: 'circInOut',
                data: [0.86, 0.14, 0.14, 0.86],
            },
        },
        // Back: {
        //     Forward: [0.18, 0.89, 0.31, 1.21],
        //     Reverse: [0.6, -0.27, 0.73, 0.04],
        // },
    },
    currentPreset: 'Linear',
    currentBerzier: [],
    bezierData: '',
    ctrlPoints: {},
    size: 500,
    offset: {
        x: 100,
        y: 100,
    },
    bezierTransform: '',
    mouseDownInfo: null,
    applyName: 'Default',
    movePosition: null,
    moveStyle: null,
};
}

export const watch = {

};

export const computed = {

};

export const components = {};

export const methods = {
    t(key: string, type = 'bezier.') {
        return Editor.I18n.t(`animator.${type}${key}`);
    },
    /////////////////////// 事件处理 ///////////////////////////////////
    onPresetChange(event: any) {
        const that: any = this;
        that.currentPreset = event.target.value;
    },

    applyPreset(name: string) {
        const that: any = this;
        const data = that.presets[that.currentPreset][name].data;
        that.applyName = name;
        that.bezierName = that.presets[that.currentPreset][name].name;
        that.currentBerzier = JSON.parse(JSON.stringify(data));
        that.updateBezier();
        that.saveData();
    },

    /**
     * 保存曲线数据
     */
    async saveData() {
        const that: any = this;
        const {path, comp, prop, frame, data} = that.keyframe;
        if (data && data.toString() === that.currentBerzier.toString()) {
            return true;
        }

        let bezier = null;
        if (that.applyName && that.bezierName) {
            bezier = that.bezierName;
        } else {
            bezier = that.findRightBezier(that.currentBerzier);
        }
        await Editor.Ipc.requestToPanel('scene', 'save-curve-data', that.uuid, path, comp, prop, frame, bezier);
    },

    /**
     * 退出
     */
    exit() {
        // @ts-ignore
        this.$emit('datachange', 'closeBezierEditor');
    },

    //////////////////////// 事件处理 /////////////////////////////////////////////
    onMouseDown(event: any, index: number) {
        const that: any = this;
        that.mouseDownInfo = {
            index,
            startX: event.x,
            startY: event.y,
            offsetX: 0,
            offsetY: 0,
        };
    },

    onMouseMove(event: any) {
        const that: any = this;
        if (!that.mouseDownInfo) {
            return;
        }
        const {startX, startY, index} = that.mouseDownInfo;
        const offsetX = (event.x - startX) / that.size;
        const offsetY = (startY - event.y) / that.size;
        if (!offsetX && !offsetY) {
            return;
        }
        that.mouseDownInfo.offsetX += offsetX;
        that.mouseDownInfo.offsetY += offsetY;
        that.mouseDownInfo.startX = event.x;
        that.mouseDownInfo.startY = event.y;
        if (index === 2) {
            const x0 = Number((that.currentBerzier[0] + offsetX).toFixed(2));
            const x1 = Number((that.currentBerzier[1] + offsetY).toFixed(2));
            that.movePosition = `${x0},${x1}`;
            that.currentBerzier.splice(0, 2, x0, x1);
        } else if (index === 3) {
            const x2 = Number((that.currentBerzier[2] + offsetX).toFixed(2));
            const x3 = Number((that.currentBerzier[3] + offsetY).toFixed(2));
            that.movePosition = `${x2},${x3}`;
            that.currentBerzier.splice(2, 2, x2, x3);
        }
        const {top, left} = that.$refs.bezier.getBoundingClientRect();
        that.moveStyle = {
            left: `${event.x - left + 10}px`,
            top: `${event.y - top + 20}px`,
        };
        requestAnimationFrame(() => {
            that.applyName = '';
            that.updateBezier();
        });
    },

    onMouseUp() {
        const that: any = this;
        if (that.mouseDownInfo) {
            that.saveData();
            that.mouseDownInfo = null;
            that.movePosition = null;
            that.moveStyle = null;
        }
    },

    onMouseWheel(event: any) {
        const that: any = this;
        const scale = smoothScale(-event.deltaY, that.size);
        that.size = scale;
        that.bezierTransform = `translate(${that.offset.x} ${that.offset.y}) scale(${that.size})`;
    },

    /////////////////////// 数据处理 //////////////////////////////////////////

    /**
     * 缓动数据转换为贝塞尔路径数据 (svg path),缩略图使用
     * @param data
     * @param scale
     */
    calcBezier(data: number[]) {
        const that: any = this;
        if (!data || data.length < 1) {
            return 'M0 0';
        }
        const controlPoints = that.calcControl(data);
        return that.calcBezierData(controlPoints);
    },

    /**
     * 由控制点数据生成贝塞尔曲线路径数据
     * @param ctrl 四个控制点数据
     */
    calcBezierData(ctrl: any) {
        const {p1, p2, p3, p4} = ctrl;
        return`M${p1[0]} ${p1[1]} C ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}, ${p4[0]} ${p4[1]}`;
    },

    /**
     * 由缓动数据生成控制点信息
     * @param data
     * @param scale
     */
    calcControl(data: number[]) {
        const p1 = [0, 1];
        const p2 = [data[0], 1 - data[1]];
        const p3 = [data[2], 1 - data[3]];
        const p4 = [1, 0];
        return {p1, p2, p3, p4};
    },

    init() {
        const that: any = this;
        const {clientHeight} = that.$refs.main;
        that.size = Math.min(Math.round(clientHeight * 0.6), 400);
        that.updateBezier();
        // 先平移再缩放
        that.bezierTransform = `translate(${that.offset.x} ${that.offset.y}) scale(${that.size})`;
    },

    updateBezier() {
        const that: any = this;
        that.ctrlPoints = that.calcControl(that.currentBerzier);
        that.bezierData = that.calcBezierData(that.ctrlPoints);
    },

    /**
     * 根据数据判断是否在预制内，存在返回名称，不存在返回源数据
     * @param data
     */
    findRightBezier(data: number[]) {
        const that: any = this;
        for (const type of Object.keys(that.presets)) {
            for (const name of Object.keys(that.presets[type])) {
                const item = that.presets[type][name];
                if (!item.data) {
                    continue;
                }
                // 数据相等并且存有名字
                if (item.data.toString() === data.toString() && item.name) {
                    return item.name;
                }
            }
        }
        return data;
    },

    /**
     * 根据名字查找对应的曲线数据，没找到则返回默认值
     * @param checkName
     */
    findBezierData(checkName: string) {
        const that: any = this;
        for (const type of Object.keys(that.presets)) {
            for (const name of Object.keys(that.presets[type])) {
                const item = that.presets[type][name];
                if (checkName === item.name) {
                    that.currentPreset = type;
                    that.applyName = name;
                    that.bezierName = item.name;
                    return item.data;
                }
            }
        }
        // 没找到，返回默认值
        return that.presets.Linear.Default.data;
    },
};

export function mounted() {
    // @ts-ignore
    const that: any = this;
    if (that.keyframe && that.keyframe.curve) {
        if (typeof(that.keyframe.curve) === 'string') {
            that.currentBerzier = JSON.parse(JSON.stringify(that.findBezierData(that.keyframe.curve)));
        } else {
            // 数据类型的曲线
            that.applyName = '';
            that.bezierName = '';
            that.currentBerzier = Array.from(that.keyframe.curve);
        }
    } else {
        that.currentBerzier = Array.from(that.presets.Linear.Default.data);
    }
    document.addEventListener('mouseup', that.onMouseUp);
    that.init();
}
