'use strict';
const Chroma = require('chroma-js');
const domUtils = {};
const mathUtils = {};
/////////////////////////////////////////////////////

/**
 * 取给定边界范围的值
 * @param {number} val
 * @param {number} min
 * @param {number} max
 */
function clamp(val, min, max) {
    return Math.min.call(null, Math.max.call(null, val, min), max);
}

// 点击外部需要隐藏的节点列表
const nodeList = [];
let startClick;

document.addEventListener('mousedown', (e) => {
    startClick = e;
});

document.addEventListener('mouseup', (e) => {
    nodeList.forEach((node) => {
        node.handleClickOutside && node.handleClickOutside(e, startClick);
    });
});

//////////////////////////////////////////////////////////////////
// domUtils 文档事件相关工具类

/**
 * 派发事件
 * @param {Element} element
 * @param {String} eventName
 * @param {Object} options
 */
domUtils.fire = (element, eventName, options = {}) => {
    element.dispatchEvent(new CustomEvent(eventName, options));
};

/**
 * 派发键盘事件
 * @param {ELement} element
 * @param {String} eventName
 * @param {Object} options
 */
domUtils.fireKey = (element, eventName, options = {}) => {
    let event = document.createEvent('KeyboardEvent');

};

/**
 * 阻止默认事件
 * @param {Event} event
 */
domUtils.acceptEvent = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
};

let isDragging = false;
let onSelectStart = null;
let onDragStart = null;

/**
 * 控制拖动事件的绑定与解绑
 * @param {Element} elem
 * @param {Object} options
 * @param {boolean} detach
 */
domUtils.controlDragEvent = (elem, options, detach = false) => {
    //创建全局属性存储事件函数
    domUtils._mouseHandles = (function(elem) {
        const _onMouseDown = (event) => {
            if (isDragging) {
                return;
            }
            onSelectStart = document.onselectstart;
            onDragStart = document.ondragstart;
            document.onselectstart = () => false;
            document.ondragstart = () => false;
            document.addEventListener('mousemove', _onMouseMove);
            document.addEventListener('mouseup', _onMouseUp);
            isDragging = true;
            if (options.start) {
                options.start(event);
            }
        };

        const _onMouseMove = (event) => {
            if (options.drag) {
                options.drag(event);
            }
        };

        const _onMouseUp = (event) => {
            document.removeEventListener('mousemove', _onMouseMove);
            document.removeEventListener('mouseup', _onMouseUp);
            document.onselectstart = onSelectStart;
            document.ondragstart = onDragStart;
            isDragging = false;
            if (options.end) {
                options.end(event);
            }
        };

        return {
            _onMouseDown,
            _onMouseMove,
            _onMouseUp,
        };
    })(elem);

    if (detach) {
        elem.removeEventListener('mousedown', domUtils._mouseHandles._onMouseDown);
        elem.removeEventListener('mouseup', domUtils._mouseHandles._onMouseUp);
        elem.removeEventListener('mousemove', domUtils._mouseHandles._onMouseUp);
    } else {
        elem.addEventListener('mousedown', domUtils._mouseHandles._onMouseDown);
        elem.addEventListener('mouseup', domUtils._mouseHandles._onMouseUp);
    }
};

// 默认颜色
const DEFAULT_CORLOR  = [0, 0, 0, 255];
/**
 * 验证颜色值与格式转换
 * 出参为颜色数组
 * @param {Color} value
 */
domUtils.getValidColor = (value) => {
    if (Array.isArray(value)) {
        if (value.length < 3 && value.length > 4) {
            console.error(`传入颜色值 ${value} 无效！`);
            return;
        }
        for (let item of value) {
            if (typeof(item) !== 'number') {
                return DEFAULT_CORLOR;
            }
        }
        return value;
    }
    let val;
    try {
        val = JSON.parse(value);
    } catch (err) {
        val = value ? Chroma(value).rgba() : DEFAULT_CORLOR;
    }
    return val;
};

/**
 * 将数组颜色转换为 rbga 格式
 * @param {Array} val 颜色数组
 */
domUtils.changeToRgba = (val) => {
    // 值非数组（字符串）用 chroma 转换
    if (!Array.isArray(val)) {
        try {
            val = JSON.parse(val);
        } catch (error) {
            val = Chroma(val).rgba();
        }
    }

    // 尝试格式转换后值无效取默认值
    (!val || !Array.isArray(val)) && (val = Array.from(DEFAULT_CORLOR));
    if (val.length > 3) {
        return `rgba(${val[0]},${val[1]},${val[2]},${val[3] / 255})`;
    } else {
        return `rgba(${val[0]},${val[1]},${val[2]},1)`;
    }
};

/**
 * 检查该dom元素是否为ui组件
 * @param {ELement} element
 */
domUtils.isUIComponent = (element) => {
    let reg = /^UI-/;
    return reg.test(element.tagName);
};

/**
 * 快速设置样式方法
 */
domUtils.setStyle = (element, cssObj) => {
    if (typeof cssObj !== 'object') {
        return;
    }
    for (let atr of Object.keys(cssObj)) {
        element.style[atr] = cssObj[atr];
    }
};
////////////////////////////////////////////////////////////////
// 数字运算相关 mathUtils

/**
 * 加法函数，用来得到精确的加法结果
 * 入参：函数内部转化时会先转字符串再转数值，因而传入字符串或number均可
 * 返回值：arg1加上arg2的精确结果
 * @param {Number | String} arg1
 * @param {Number | String} arg2
 */
mathUtils.accAdd = (arg1, arg2) => {
    let { maxPow , num1, num2} = mathUtils.computMaxPow(arg1, arg2);
    return (num1 + num2) / maxPow;
};

/**
 * 减法函数，用来得到精确的减法结果
 * 入参：函数内部转化时会先转字符串再转数值，因而传入字符串或number均可
 * 返回值：arg1 减 arg2的精确结果
 * @param {Number | String} arg1
 * @param {Number | String} arg2
 */
mathUtils.accSub = (arg1, arg2) => {
    let {maxPow, maxPreci} = mathUtils.computMaxPow(arg1, arg2);
    return ((arg1 * maxPow - arg2 * maxPow) / maxPow).toFixed(maxPreci);
};

/**
 * 计算两个数值小数点位数的最大位数与10的乘积,与最大精度
 * 入参：函数内部转化时会先转字符串再转数值，因而传入字符串或number均可
 * 返回值：
 * @param {Number | String} arg1
 * @param {Number | String} arg2
 */
mathUtils.computMaxPow = (arg1, arg2) => {
    let r1; let r2; let maxPreci;
    let num1 = Number(arg1);
    let num2 = Number(arg2);
    r1 = mathUtils.comPreci(arg1);
    r2 = mathUtils.comPreci(arg2);
    maxPreci = Math.max(r1, r2);
    let maxPow = Math.pow(10, maxPreci);
    if (maxPreci > 20) {
        maxPreci = 20;
    }
    if (r1 === 0 && maxPreci > 0) {
        num1 = num1 * maxPow;
    } else {
        num1 = Number(arg1.toString().replace('.', ''));
    }

    if (r2 === 0 && maxPreci > 0) {
        num2 = num2 * maxPow;
    } else {
        num2 = Number(arg2.toString().replace('.', ''));
    }
    return {
        maxPow,
        maxPreci,
        num1,
        num2,
    };
};

/**
 * 计算数值的精度（小数点位数）
 * 返回值：该数值的小数点位数
 * @param {Number || String} value
 */
mathUtils.comPreci = (value) => {
    let rang;
    try {
        rang = value.toString().split('.')[1].length;
    } catch (error) {
        rang = 0;
    }
    return rang;
};

/**
 * 取给定边界范围的值
 * @param {number} val
 * @param {number} min
 * @param {number} max
 */
mathUtils.clamp = (val, min, max) => {
    return Math.min.call(null, Math.max.call(null, val, min), max);
};

exports.clamp = clamp;
exports.nodeList = nodeList;
exports.domUtils = domUtils;
exports.mathUtils = mathUtils;
