'use stirct';


/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlMouseEvent = function (elem, detach = false) {
    elem._eventHandle = (function (elem) {
        let mouseEventHandles = {};

        let _onMouseDown = () => {
            if (elem.disabled || elem.readOnly) {
                event.preventDefault();
                event.stopPropagation();
            }
        }

        let _onBlur = () => {
            elem.focused = false;
        }

        let _onFocus = () => {
            elem.focused = true;
        }

        return {
            _onMouseDown,
            _onBlur,
            _onFocus
        }
    })(elem)

    if (detach) {
        elem.removeEventListener('focus', elem._eventHandle._onFocus);
        elem.removeEventListener('blur', elem._eventHandle._onBlur);
        elem.removeEventListener('click', elem._eventHandle._onMouseDown);
    } else {
        elem.addEventListener('focus', elem._eventHandle._onFocus);
        elem.addEventListener('blur', elem._eventHandle._onBlur);
        elem.addEventListener('click', elem._eventHandle._onMouseDown);
    }
};
class Base extends window.HTMLElement {
    constructor() {
        super();
        this.attachShadow({
            mode: 'open'
        });
        this._eventHandle = null;
    }

    connectedCallback() {
        // 设置 tabindex
        const disabled = this.getAttribute('disabled') !== null;
        const tabindex = this.getAttribute('tabindex') || 0;
        this.setAttribute('tabindex', disabled ? '-1' : tabindex);
        controlMouseEvent(this);
    }

    disconnectedCallback() {
        controlMouseEvent(this, true);
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
            this.setAttribute('tabindex', '-1');
        } else {
            this.removeAttribute('readonly');
            this.setAttribute('tabindex', '0');
        }
    }

    /**
     * 向上传递 confirm 事件
     */
    confirm() {
        let event = document.createEvent('HTMLEvents');
        event.initEvent('confirm', true, true);
        this.dispatchEvent(event);
    }
}

module.exports = Base;
