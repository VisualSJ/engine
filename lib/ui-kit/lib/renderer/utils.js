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
function clamp (val, min, max) {
    return Math.min.call(null, Math.max.call(null, val, min), max);
}

// 点击外部需要隐藏的节点列表
const nodeList = [];
let startClick;

document.addEventListener('mousedown', e => {
    startClick = e;
});

document.addEventListener('mouseup', e => {
    nodeList.forEach(node => {
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

}

/**
 * 阻止默认事件
 * @param {Event} event 
 */
domUtils.acceptEvent = event => {
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
        const _onMouseDown = event => {
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
    
        const _onMouseMove = event => {
            if (options.drag) {
                options.drag(event);
            }
        };
    
        const _onMouseUp = event => {
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
            _onMouseUp
        }
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

/**
 * 验证颜色值与格式转换
 * @param {Color} value
 */
domUtils.changeColor = value => {
    let val;
    try {
        val = JSON.parse(value);
    } catch (err) {
        val = value ? Chroma(value).rgba() : [255, 255, 255, 1];
    }
    return val;
}

/**
 * 检查该dom元素是否为ui组件
 * @param {ELement} element 
 */
domUtils.isUIComponent = element => {
    let reg = /^UI-/;
    return reg.test(element.tagName);
}

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
    let { maxPow } = mathUtils.computMaxPow(arg1, arg2);
    return (arg1 * maxPow + arg2 * maxPow) / maxPow;
}

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
}

/**
 * 计算两个数值小数点位数的最大位数与10的乘积,与最大精度
 * 入参：函数内部转化时会先转字符串再转数值，因而传入字符串或number均可
 * 返回值：
 * @param {Number | String} arg1 
 * @param {Number | String} arg2 
 */
mathUtils.computMaxPow = (arg1, arg2) => {
    let r1, r2, maxPreci;
    r1 = mathUtils.comPreci(arg1);
    r2 = mathUtils.comPreci(arg2);
    maxPreci = (r1 >= r2) ? r1 : r2;
    if (maxPreci > 20) {
        maxPreci = 20;
    }
    return {
        maxPow: Math.pow(10, Math.max(r1, r2)),
        maxPreci
    };
}

/**
 * 计算数值的精度（小数点位数）
 * 返回值：该数值的小数点位数
 * @param {Number || String} value 
 */
mathUtils.comPreci = (value) => {
    let rang;
    try {
        rang = value.toString().split(".")[1].length;
    } catch (error) {
        rang = 0;
    }
    return rang;
}

/**
 * 取给定边界范围的值
 * @param {number} val
 * @param {number} min
 * @param {number} max
 */
mathUtils.clamp = (val, min, max) => {
    return Math.min.call(null, Math.max.call(null, val, min), max);
}

exports.clamp = clamp;
exports.nodeList = nodeList;
exports.domUtils = domUtils;
exports.mathUtils = mathUtils;