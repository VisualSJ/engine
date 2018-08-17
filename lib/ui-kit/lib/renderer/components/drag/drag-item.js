'use strict';

const ipc = require('@base/electron-base-ipc');

const DomUtils = require('../../domUtils');

/**
 * 绑定拖拽事件
 * @param {HTMLElement} elem 
 */
const mountEvent = function (elem) {
    
    // 绑定 drag start 事件
    if (!elem._onDragStart) {
        elem._onDragStart = function () {
            this.draging = true;
            ipc.send('editor-lib-ui-kit:drag-start', {
                type: elem.type,
            });
        };
        elem.addEventListener('dragstart', elem._onDragStart);
    }

    // 绑定 drag end 事件
    if (!elem._onDragEnd) {
        elem._onDragEnd = function () {
            this.draging = false;
            ipc.send('editor-lib-ui-kit:drag-end');
        };
        elem.addEventListener('dragend', elem._onDragEnd);
    }
};

/**
 * 取消绑定拖拽事件
 * @param {HTMLElement} elem 
 */
const unmountEvent = function (elem) {

    // 取消绑定 drag start 事件
    if (elem._onDragStart) {
        elem.removeEventListener('dragstart', elem._onDragStart);
    }

    // 取消绑定 drag end 事件
    if (elem._onDragEnd) {
        elem.removeEventListener('dragstart', elem._onDragEnd);
    }
};

/**
 * 被拖拽的元素
 */
class DragItem extends window.HTMLElement {

    /**
     * 监听的 attribute 修改
     */
    static get observedAttributes() {
        return [];
    }

    get draging () {
        return this.getAttribute('draging') !== null;
    }

    set draging (bool) {
        bool = !!bool;
        if (bool) {
            this.setAttribute('draging', '');
        } else {
            this.removeAttribute('draging');
        }
    }

    get type () {
        return this.getAttribute('type');
    }

    set type (type) {
        if (type) {
            this.setAttribute('type', type);
        } else {
            this.removeAttribute('type');
        }
    }

    constructor() {
        super();
    }

    connectedCallback() {
        this.setAttribute('draggable', true);
        mountEvent(this);
    }

    disconnectedCallback() {
        this.removeAttribute('draggable');
        unmountEvent(this);
    }

    attributeChangedCallback(attr, o, n) {
        switch (attr) {}
    }
}

module.exports = DragItem;
