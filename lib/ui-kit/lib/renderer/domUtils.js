'use strict';
const DomUtils = {};
module.exports = DomUtils;
/**
 *
 * @param {Element} element
 * @param {String} eventName
 * @param {Object} options
 */
DomUtils.fire = (element, eventName, options = {}) => {
    element.dispatchEvent(new CustomEvent(eventName, options));
};
DomUtils.acceptEvent = event => {
    event.preventDefault();
    event.stopImmediatePropagation();
};

let isDragging = false;
let onSelectStart = null;
let onDragStart = null;
/**
 *
 * @param {Element} instance
 * @param {Object} options
 * @param {boolean} detach
 */
DomUtils.controlDragEvent = (instance, options, detach = false) => {
    const onMouseDown = event => {
        if (isDragging) {
            return;
        }
        onSelectStart = document.onselectstart;
        onDragStart = document.ondragstart;
        document.onselectstart = () => false;
        document.ondragstart = () => false;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        isDragging = true;
        if (options.start) {
            options.start(event);
        }
    };
    const onMouseMove = event => {
        if (options.drag) {
            options.drag(event);
        }
    };
    const onMouseUp = event => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.onselectstart = onSelectStart;
        document.ondragstart = onDragStart;
        isDragging = false;
        if (options.end) {
            options.end(event);
        }
    };
    if (detach) {
        instance.removeEventListener('mousedown', onMouseDown);
    } else {
        instance.addEventListener('mousedown', onMouseDown);
    }
};
