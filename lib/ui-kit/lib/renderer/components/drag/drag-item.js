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

    get extends() {
        const str = this.getAttribute('extends');
        if (str) {
            return str.split(',');
        }
        return null;
    }

    set extends(array) {
        if (array && Array.isArray(array)) {
            this.setAttribute('extends', array.join(','));
        } else {
            this.removeAttribute('extends');
        }
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        const value = this.getAttribute('draggable');
        this.setAttribute('draggable', value !== null ? value : true);

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
    _onDragStart(event) {
        this.draging = true;

        const info = {
            type: this.type,
            extends: this.extends,
        };

        (event.dataTransfer.types || []).forEach((name) => {
            info[name] = event.dataTransfer.getData(name);
        });

        ipc.send('editor-lib-ui-kit:drag-start', info);
        ipc.emit('editor-lib-ui-kit:drag-start', info);
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
