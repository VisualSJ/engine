'use strict';

const ipc = require('@base/electron-base-ipc');

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

    get draging() {
        return this.getAttribute('draging') !== null;
    }

    set draging(bool) {
        bool = !!bool;
        if (bool) {
            this.setAttribute('draging', '');
        } else {
            this.removeAttribute('draging');
        }
    }

    get type() {
        return this.getAttribute('type');
    }

    set type(type) {
        if (type) {
            this.setAttribute('type', type);
        } else {
            this.removeAttribute('type');
        }
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        this.setAttribute('draggable', true);

        // 绑定事件
        this.addEventListener('dragstart', this._onDragStart);
        this.addEventListener('dragend', this._onDragEnd);
    }

    disconnectedCallback() {
        this.removeAttribute('draggable');

        // 取消绑定事件
        this.removeEventListener('dragstart', this._onDragStart);
        this.removeEventListener('dragend', this._onDragEnd);
    }

    /**
     * 拖拽开始事件
     */
    _onDragStart() {
        this.draging = true;
        ipc.send('editor-lib-ui-kit:drag-start', {
            type: this.type,
        });
    }

    /**
     * 拖拽结束事件
     */
    _onDragEnd() {
        this.draging = false;
        ipc.send('editor-lib-ui-kit:drag-end');
    }
}

module.exports = DragItem;
