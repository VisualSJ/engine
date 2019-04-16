'use strict';

const ipc = require('@base/electron-base-ipc');

let dragInfo = null;

// item 开始拖拽的通知
ipc.on('editor-lib-ui-kit:drag-start', (event, info) => {
    dragInfo = info;
});

// item 结束拖拽的通知
ipc.on('editor-lib-ui-kit:drag-end', (event) => {
    dragInfo = null;
});

/**
 * 拖拽进入的元素
 */
class DragArea extends window.HTMLElement {

    static get currentDragInfo() {
        return dragInfo;
    }

    get additional() {
        return this.getAttribute('additional') !== null;
    }

    set additional(bool) {
        clearTimeout(this.additionalTimer);

        bool = !!bool;
        if (bool) {
            this.setAttribute('additional', '');
        } else {
            // 在多元素 dragOver 过程中有“缝隙”，会导致 hoving 属性频繁切换
            // 延迟去除是为了固定 hoving 属性，便可以配合 css 样式使用
            this.hovingTimer = setTimeout(() => {
                this.removeAttribute('additional');
            }, 200);
        }
    }

    get hoving() {
        return this.getAttribute('hoving') !== null;
    }

    set hoving(bool) {
        clearTimeout(this.hovingTimer);

        bool = !!bool;
        if (bool) {
            this.setAttribute('hoving', '');
        } else {
            // 在多元素 dragOver 过程中有“缝隙”，会导致 hoving 属性频繁切换
            // 延迟去除是为了固定 hoving 属性，便可以配合 css 样式使用
            this.hovingTimer = setTimeout(() => {
                this.removeAttribute('hoving');
            }, 200);
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

        let type = dragInfo ? dragInfo.type : null;
        if (event.dataTransfer.types.indexOf('Files') !== -1) {
            type = 'file';
        }
        let types = this.getAttribute('dropable');
        let hoving = types && types.indexOf(type) !== -1;

        if (!hoving && Array.isArray(dragInfo.extends)) {
            hoving = dragInfo.extends.some((type) => {
                return types && types.indexOf(type) !== -1;
            });
        }

        if (dragInfo.additional && Array.isArray(dragInfo.additional)) {
            this.additional = dragInfo.additional.some((item) => {
                return types && types.indexOf(item.type) !== -1;
            });
        }

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
        if (!this.hoving) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        this.hoving = false;
    }
}

module.exports = DragArea;
