'use stirct';
// 定义全局私有变量存储是否按下shift标识符
let shiftFlag = false;

/**
 * 基础的自定义 UI 元素
 */
class Base extends window.HTMLElement {

    get _shiftFlag() {
        return shiftFlag;
    }

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
        this.dispatch('focus-changed');
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
        this.addEventListener('keyup', this._onKeyUp);
        this.addEventListener('keydown', this._onKeyDown);
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        // 移除绑定事件
        this.removeEventListener('focus', this._onFocus);
        this.removeEventListener('blur', this._onBlur);
        this.removeEventListener('mousedown', this._onMouseDown);
        this.removeEventListener('keyup', this._onKeyUp);
        this.removeEventListener('keydown', this._onKeyDown);
    }

    /**
     * 向上传递事件
     * @param eventName 事件名称
     * @param options
     */
    dispatch(eventName) {
        let event = document.createEvent('HTMLEvents');
        event.initEvent(eventName, true, true);
        this.dispatchEvent(event);
    }

    //////////////////////
    // 私有事件

    /**
     * 获得焦点的时候更新 focused
     */
    _onFocus() {
        if (this.disabled) {
            return;
        }
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
     * 如果设置了 disabled 或者 readonly 则停止冒泡以及阻止默认事件
     * @param {Event} event
     */
    _onMouseDown(event) {
        if (!this.disabled && !this.readonly) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * 键盘按下事件，捕获shift键按下，存储shiftFlag变量标识符
     * @param {Event} event
     */
    _onKeyDown(event) {
        if (event.key !== 'Shift') {
            return;
        }
        shiftFlag = true;
        this.focus();
    }

    /**
     * 键盘抬起事件，shift键抬起，更改shiftFlag标识符
     * @param {Event} event
     */
    _onKeyUp(event) {
        if (event.key !== 'Shift' || !shiftFlag || !this.$child) {
           return;
        }
        shiftFlag = false;
        this.$child.focus();
    }
}

module.exports = Base;
