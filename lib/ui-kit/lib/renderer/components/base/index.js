'use stirct';

/**
 * 基础的自定义 UI 元素
 */
class Base extends window.HTMLElement {

    get focused() {
        return this.getAttribute('focused') !== null;
    }

    set focused(val) {
        val = !!val;
        if (val) {
            this.setAttribute('focused', '');
        } else {
            this.removeAttribute('focused');
        }
    }

    get disabled() {
        return this.getAttribute('disabled') !== null;
    }

    set disabled(val) {
        val = !!val;
        if (val) {
            this.setAttribute('disabled', '');
            this.setAttribute('tabindex', '-1');
        } else {
            this.removeAttribute('disabled');
            this.setAttribute('tabindex', '0');
        }
    }

    get readonly() {
        return this.getAttribute('readonly') !== null;
    }

    set readonly(val) {
        val = !!val;
        if (val) {
            this.setAttribute('readonly', '');
        } else {
            this.removeAttribute('readonly');
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._eventHandle = null;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        // 设置 tabindex
        const disabled = this.getAttribute('disabled') !== null;
        const tabindex = this.getAttribute('tabindex') || 0;
        this.setAttribute('tabindex', disabled ? '-1' : tabindex);
        
        // 绑定事件
        this.addEventListener('focus', this._onFocus);
        this.addEventListener('blur', this._onBlur);
        this.addEventListener('mousedown', this._onMouseDown);
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        // 移除绑定事件
        this.removeEventListener('focus', this._onFocus);
        this.removeEventListener('blur', this._onBlur);
        this.removeEventListener('mousedown', this._onMouseDown);
    }

    /**
     * 向上传递事件
     * @param name 事件名称
     */
    dispatch(name) {
        let event = document.createEvent('HTMLEvents');
        event.initEvent(name, true, true);
        this.dispatchEvent(event);
    }

    //////////////////////
    // 私有事件

    /**
     * 获得焦点的时候更新 focused
     */
    _onFocus() {
        this.focused = true;
    }

    /**
     * 丢失焦点的时候更新 focused
     */
    _onBlur() {
        this.focused = false;
    }

    /**
     * 鼠标点击事件
     * 如果设置了 disabled 或者 readOnly 则停止冒泡以及阻止默认事件
     * @param {*} event 
     */
    _onMouseDown(event) {
        if (!this.disabled && !this.readOnly) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    }
}

module.exports = Base;
