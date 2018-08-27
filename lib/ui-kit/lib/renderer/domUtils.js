'use strict';
const Chroma = require('chroma-js');
const DomUtils = {};
module.exports = DomUtils;

/**
 * 派发事件
 * @param {Element} element
 * @param {String} eventName
 * @param {Object} options
 */
DomUtils.fire = (element, eventName, options = {}) => {
    element.dispatchEvent(new CustomEvent(eventName, options));
};

/**
 * 阻止默认事件
 * @param {Event} event 
 */
DomUtils.acceptEvent = event => {
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
DomUtils.controlDragEvent = (elem, options, detach = false) => {
    //创建全局属性存储事件函数
    DomUtils._mouseHandles = (function(elem) {
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
        elem.removeEventListener('mousedown', DomUtils._mouseHandles._onMouseDown);
    } else {
        elem.addEventListener('mousedown', DomUtils._mouseHandles._onMouseDown);
    }
};

/**
 * 验证颜色值与格式转换
 * @param {Color} value
 */
DomUtils.changeColor = value => {
    let val;
    try {
        val = JSON.parse(value);
    } catch (err) {
        val = value ? Chroma(value).rgba() : [255, 255, 255, 1];
    }
    return val;
}