'use strict';

const fs = require('fs');
const path = require('path');

const Base = require('../base');
const DomUtils = require('../../domUtils');

let customStyle = '';

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './option.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './option.html'), 'utf8')}`;
const instanceArray = [];

/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlMouseEvent = function (elem, detach = false) {
    const onClick = event => {
        if (!elem.disabled && !elem.grougDisabled) {
            DomUtils.acceptEvent(event);
            DomUtils.fire(elem, 'optionClick', {
                bubbles: true,
                detail: { value: elem.value ,valueText:elem.innerHTML}
            });
        }
    };

    const onMouseEnter = () => {
        elem.parentNode.hoverindex = [...elem.parentNode.children].indexOf(elem);
    };
    
    if (detach) {
        elem.removeEventListener('mouseenter', onMouseEnter, false);
        elem.removeEventListener('click', onClick, false);
    } else {
        elem.addEventListener('mouseenter', onMouseEnter, false);
        elem.addEventListener('click', onClick, false);
    }
};

class Option extends Base {
    static importStyle (src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(elem => {
                const el = elem.shadowRoot.querySelector('#custom-style');
                el && (el.innerHTML = customStyle);
            });
        }
    }

    constructor () {
        super();

        this.shadowRoot.innerHTML = createDomContent();
        this.disabled = this.getAttribute('disabled') !== null;
    }

    optionHover (val) {
        this.hover = val;
    }

    optionSelected () {
        if (!this.parentNode.multiple) {
            this.selected = this.value === this.parentNode.value;
        } else {
            this.selected = this.parentNode.value.includes(this.value);
        }
        if (this.selected) {
            this.parentNode.updateContent(this.textContent);
        }
    }

    connectedCallback () {
        // 实例创建回调
        super.connectedCallback();
        this.optionSelected();
        controlMouseEvent(this);
        instanceArray.push(this);
    }

    disconnectedCallback () {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        controlMouseEvent(this, true);
        instanceArray.splice(index, 1);
    }

    get value () {
        return this.getAttribute('value') || this.textContent;
    }

    get hover () {
        return this.hasAttribute('hover');
    }

    set hover (val) {
        if (val) {
            this.setAttribute('hover', '');
        } else {
            this.removeAttribute('hover');
        }
    }

    get disabled () {
        return this.hasAttribute('disabled');
    }

    set disabled (val) {
        if (val) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    get selected () {
        return this.hasAttribute('selected');
    }

    set selected (val) {
        if (val) {
            this.setAttribute('selected', '');
        } else {
            this.removeAttribute('selected');
        }
    }
}

module.exports = Option;
