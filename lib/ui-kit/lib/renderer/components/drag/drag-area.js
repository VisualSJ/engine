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
 * 拖拽进入的元素
 */
class DragArea extends window.HTMLElement {

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
            types = [types + ''];
        }
        if (types) {
            this.setAttribute('dropable', types.join(','));
        } else {
            this.removeAttribute('dropable');
        }
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        // 绑定事件
        this.addEventListener('dragover', this._onDragOver);
        this.addEventListener('dragleave', this._onDragLevel);
        this.addEventListener('drop', this._onDrop);
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        // 取消绑定事件
        this.removeEventListener('dragover', this._onDragOver);
        this.removeEventListener('dragleave', this._onDragLevel);
        this.removeEventListener('drop', this._onDrop);
    }

    /**
     * 拖拽经过事件
     * @param {*} event 
     */
    _onDragOver(event) {
        event.preventDefault(); // NOTE: Must have, otherwise we can not drop

        let type = dragType;
        if (event.dataTransfer.types.indexOf('Files') !== -1) {
            type = 'file';
        }
        let types = this.getAttribute('dropable');
        let hoving = types && types.indexOf(type) !== -1;
        if (hoving) {
            this.hoving = hoving;
            event.stopPropagation();
        }
    }

    /**
     * 拖拽离开事件
     */
    _onDragLevel() {
        this.hoving = false;
    }

    /**
     * 拖拽放置事件
     * @param {*} event 
     */
    _onDrop(event) {
        event.stopPropagation();
        event.preventDefault();
        this.hoving = false;
    }
}

module.exports = DragArea;
