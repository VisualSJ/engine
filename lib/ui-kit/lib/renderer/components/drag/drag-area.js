'use strict';

const ipc = require('@base/electron-base-ipc');

let dragType = null;

// item 开始拖拽的通知
ipc.on('editor-lib-ui-kit:drag-start', (event, info) => {
    dragType = info.type;
});

// item 结束拖拽的通知
ipc.on('editor-lib-ui-kit:drag-end', (event) => {
    dragType = null;
});

/**
 * 绑定拖拽事件
 * @param {HTMLElement} elem 
 */
const mountEvent = function (elem) {

    // 绑定 drag over 事件
    if (!elem._onDragOver) {
        elem._onDragOver = function (event) {
            event.preventDefault(); // NOTE: Must have, otherwise we can not drop

            let type = dragType;
            if (event.dataTransfer.types.indexOf('Files') !== -1) {
                type = 'file';
            }
            let types = elem.getAttribute('dropable');
            let hoving = types && types.indexOf(type) !== -1;
            if (hoving) {
                this.hoving = hoving;
                event.stopPropagation();
            }
        };
        elem.addEventListener('dragover', elem._onDragOver);
    }

    if (!elem._onDragLevel) {
        elem._onDragLevel = function () {
            this.hoving = false;
        };
        elem.addEventListener('dragleave', elem._onDragLevel);
    }

    if (!elem._onDrop) {
        elem._onDrop = function (event) {
            event.stopPropagation();
            event.preventDefault();
            this.hoving = false;
        };
        elem.addEventListener('drop', elem._onDrop);
    }
};

/**
 * 取消绑定拖拽事件
 * @param {HTMLElement} elem 
 */
const unmountEvent = function (elem) {

    // 取消绑定 drag over 事件
    if (!elem._onDragOver) {
        elem.removeEventListener('dragover', elem._onDragOver);
    }

    if (!elem._onDragLevel) {
        elem.removeEventListener('dragleave', elem._onDragLevel);
    }
};

/**
 * 拖拽进入的元素
 */
class DragArea extends window.HTMLElement {

    static get observedAttributes() {
        return [];
    }

    get hoving() {
        return this.getAttribute('hoving') !== null;
    }

    set hoving(bool) {
        bool = !!bool;
        if (bool) {
            this.setAttribute('hoving', '');
        } else {
            this.removeAttribute('hoving');
        }
    }

    get dropable() {
        return this.getAttribute('dropable').split(',');
    }

    set dropable(types) {
        if (!Array.isArray(types)) {
            types = null;
        }
        if (types) {
            this.setAttribute('dropable', types.join(','));
        } else {
            this.removeAttribute('dropable');
        }
    }

    constructor() {
        super();
    }

    connectedCallback() {
        mountEvent(this);
    }

    disconnectedCallback() {
        unmountEvent(this);
    }

    attributeChangedCallback(attr, o, n) {
        switch (attr) {}
    }
}

module.exports = DragArea;
