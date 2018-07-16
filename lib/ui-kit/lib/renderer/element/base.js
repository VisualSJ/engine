'use stirct';

class Base extends window.HTMLElement {

    constructor () {
        super();
        this.attachShadow({
            mode: 'open'
        });

        // 设置 tabindex
        let disabled = this.getAttribute('disabled') !== null;
        this.setAttribute('tabindex', disabled ? '-1' : '0');

        // 管理 focused attribute
        this.addEventListener('focus', () => {
            this.focused = true;
        });
        this.addEventListener('blur', () => {
            this.focused = false;
        });

        // 如果是 disabled 状态，不响应点击事件
        this.addEventListener('mousedown', (event) => {
            if (this.disabled) {
                event.preventDefault();
                event.stopPropagation();
            }
        });
    }

    get focused () {
        return this.getAttribute('focused') !== null;
    }

    set focused (val) {
        val = !!val;
        if (val) {
            this.setAttribute('focused', '');
        } else {
            this.removeAttribute('focused');
        }
    }

    get disabled () {
        return this.getAttribute('disabled') !== null;
    }

    set disabled (val) {
        val = !!val;
        if (val) {
            this.setAttribute('disabled', '');
            this.setAttribute('tabindex', '-1');
        } else {
            this.removeAttribute('disabled');
            this.setAttribute('tabindex', '0');
        }
    }

    /**
     * 向上传递 confirm 事件
     */
    confirm () {
        let event = document.createEvent("HTMLEvents");
        event.initEvent('confirm', true, true);
        this.dispatchEvent(event);
    }
}

module.exports = Base;