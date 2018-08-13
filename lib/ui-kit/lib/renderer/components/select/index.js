'use strict';

const fs = require('fs');
const path = require('path');

const { nodeList } = require('../../utils');
const Base = require('../base');
const Option = require('./option.js');
window.customElements.define('select-option', Option);
const DomUtils = require('../../domUtils');
let customStyle = '';

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './select.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './select.html'), 'utf8')}`;
const instanceArray = [];
/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;
/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlMouseEvent = function (instance, detach = false) {
    const onClick = () => {
        if (!instance.disabled) {
            instance.expand = !instance.expand;
        }
    };
    if (detach) {
        instance.removeEventListener('click', onClick, false);
    } else {
        instance.addEventListener('click', onClick, false);
    }
};
/**
 * 控制键盘事件绑定以及解绑
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (instance, detach = false) {
    const onKeyUp = event =>         {
        switch (event.keyCode) {
            case 13:
                instance.selectOption();
                break;
            case 38:
                instance.navigatonOption('prev');
                break;
            case 40:
                instance.navigatonOption('next');
                break;
            default:
                break;
        }
    };
    const onKeyDown = event => {
        switch (event.keyCode) {
            case 9:
                instance.expand = false;
                break;
            default:
                break;
        }
    };
    if (detach) {
        instance.removeEventListener('keydown', onKeyDown);
        instance.removeEventListener('keyup', onKeyUp);
    } else {
        instance.addEventListener('keydown', onKeyDown);
        instance.addEventListener('keyup', onKeyUp);
    }
};

class Select extends Base {
    static importStyle (src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(instance => {
                const el = instance.shadowRoot.querySelector('#custom-style');
                el && (el.innerHTML = customStyle);
            });
        }
    }

    static get observedAttributes () {
        return ['hoverindex', 'value'];
    }

    constructor () {
        super();
        this.shadowRoot.innerHTML = createDomContent();
        this.hoverindex = -1;
        this.disabled = this.getAttribute('disabled') !== null;
    }

    /**
     * 上下方向键导航选项
     * @param {string} direction
     */
    navigatonOption (direction) {
        if (!this.expand) {
            this.expand = true;
            return;
        }
        if (this.children.length === 0) {
            return;
        }
        const allDisabled = [...this.children].every(child => child.disabled);
        if (!allDisabled) {
            if (direction === 'prev') {
                this.hoverindex--;
                if (this.hoverindex < 0) {
                    this.hoverindex = this.children.length - 1;
                }
            } else if (direction === 'next') {
                this.hoverindex++;
                if (this.hoverindex === this.children.length) {
                    this.hoverindex = 0;
                }
            }
            const child = this.children[this.hoverindex];
            if (child.disabled || child.groupDisabled) {
                this.navigatonOption(direction);
            }
        }
    }

    updateContent (text) {
        const el = this.shadowRoot.querySelector('div span');
        if (!this.multiple) {
            el.textContent = text;
        }
    }

    selectOption () {
        if (!this.expand) {
            this.expand = true;
        } else {
            if (this.children[this.hoverindex]) {
                this.value = this.children[this.hoverindex].value;
                this.valueText = this.children[this.hoverindex].innerHTML;
                this.emitChange(); 
                this.confirm();
            }
        }
    }

    _optionChange (event) {
        const { value , valueText} = event.detail;
        this.value = value;
        this.valueText = valueText;
        this.emitChange(); 
        this.confirm();      
    }

    emitChange () {
        DomUtils.fire(this, 'change', {
            bubbles: false,
            detail: {
                value: this.value
            }
        });
    }


    /**
     * select外部点击事件处理
     * @param {object} mouseup
     * @param {object} mousedown
     */
    handleClickOutside (mouseup = {}, mousedown = {}) {
        if (
            !mousedown.path ||
            !mouseup.path ||
            mousedown.path.includes(this) ||
            mouseup.path.includes(this)
        ) {
            return;
        }
        this.expand = false;
    }

    connectedCallback () {
        // 实例创建回调
        super.connectedCallback();
        if (this.placeholder && !this.value) {
            this.updateContent(this.placeholder);
        }
        nodeList.push(this);
        controlMouseEvent(this);
        controlKeyboardEvent(this);
        this.addEventListener('optionClick', this._optionChange);
        instanceArray.push(this);
        this.autofocus = this.getAttribute('autofocus');
    }

    disconnectedCallback () {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        const i = nodeList.indexOf(this);
        controlMouseEvent(this, true);
        controlKeyboardEvent(this, true);
        this.removeEventListener('optionClick', this._optionChange);
        instanceArray.splice(index, 1);
        nodeList.splice(i, 1);
    }

    attributeChangedCallback (attr, o, n) {
        switch (attr) {
            case 'hoverindex':
                {
                    this.setHover();
                }
                break;
            case 'value': {
                this.setSelected();
            }
            default:
                break;
        }
    }

    setHover () {
        [...this.children].map((child, index) => {
            const isHover = index === this.hoverindex;
            child.optionHover && child.optionHover(isHover);
        });
    }

    setSelected () {
        [...this.children].map(child => {
            child.optionSelected && child.optionSelected();
        });
        this.expand = false;
    }

    get placeholder () {
        return this.getAttribute('placeholder');
    }

    get value () {
        const value = this.getAttribute('value');
        if (value) {
            return this.multiple ? value.split(',') : value;
        }
    }

    set value (val) {
        if (this.multiple) {
            const value = this.value.slice();
            const index = value.indexOf(val);
            if (index > -1) {
                value.splice(index, 1);
            } else if (this.multipleLimit <= 0 || value.length < this.multipleLimit) {
                value.push(val);
            }
            this.setAttribute('value', value.join(','));
        } else {
            this.setAttribute('value', val);
        }
    }

    resetHoverIndex () {
        if (!this.multiple) {
            this.hoverindex = [...this.children].findIndex(child => child.value === this.value);
        } else {
            if (this.value.length > 0) {
                this.hoverindex = Math.min.apply(
                    null,
                    this.value.map(item =>
                        [...this.children].findIndex(child => child.value === this.value)
                    )
                );
            } else {
                this.hoverindex = -1;
            }
        }
    }

    get expand () {
        return this.hasAttribute('expand');
    }

    set expand (val) {
        if (val) {
            this.setAttribute('expand', '');
        } else {
            this.removeAttribute('expand');
            this.resetHoverIndex();
        }
    }

    get autofocus () {
        return this.hasAttribute('autofocus');
    }

    set autofocus (val) {
        if (val !== null) {
            this.setAttribute('autofocus', '');
            this.focus();
        } else {
            this.removeAttribute('autofocus');
        }
    }

    get hoverindex () {
        return +this.getAttribute('hoverindex');
    }

    set hoverindex (val) {
        this.setAttribute('hoverindex', val);
    }
}

module.exports = Select;
