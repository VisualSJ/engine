'use stirct';
/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlMouseEvent = function (instance, detach = false) {
    const onMouseDown = () => {
        if (instance.disabled || instance.readOnly) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    const onFocus = () => {
        instance.focused = true;
    };
    const onBlur = () => {
        instance.focused = false;
    };
    if (detach) {
        instance.removeEventListener('focus', onFocus);
        instance.removeEventListener('blur', onBlur);
        instance.removeEventListener('click', onMouseDown, false);
    } else {
        instance.addEventListener('focus', onFocus);
        instance.addEventListener('blur', onBlur);
        instance.addEventListener('click', onMouseDown, false);
    }
};
class Base extends window.HTMLElement {
    constructor () {
        super();
        this.attachShadow({
            mode: 'open'
        });
    }

    connectedCallback () {
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